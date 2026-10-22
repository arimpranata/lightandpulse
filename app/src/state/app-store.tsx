import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { useContent } from '@/context/content';
import { buildInventory } from '@/demo';
import {
  addLine,
  applyPaymentEvent,
  attachIntent,
  bookedFromLedger,
  cancelBooking as cancelLedgerBooking,
  createOrder,
  EMPTY_LEDGER,
  isCartExpired,
  newCart,
  removeLine,
  updateParticipants,
  type Ledger,
} from '@/domain/commerce';
import type { PaymentMethod, PaymentMethodId } from '@/domain/payments';
import { addToDay, planJourney, removeItem, toggleLock, type PlanAlert } from '@/domain/planner';
import { clampProfile } from '@/domain/profile';
import type { Candidate } from '@/domain/ranking';
import type { Cart, CartLine, Inventory, Journey, TravellerProfile } from '@/domain/types';
import { createDemoPaymentProvider } from '@/services/demo-payment-provider';

export type Language = 'en' | 'id';

type PersistedState = {
  language: Language;
  profile: TravellerProfile | null;
  journey: Journey | null;
  alerts: PlanAlert[];
  /** Items the traveller removed; re-planning never adds them back. */
  excludedIds: string[];
  cart: Cart;
  ledger: Ledger;
};

type State = PersistedState & { loaded: boolean };

type Action =
  | { type: 'hydrate'; state: Partial<PersistedState> }
  | { type: 'patch'; patch: Partial<PersistedState> }
  | { type: 'reset' };

const STORAGE_KEY = 'balilens:state:v1';

/** The payment adapter in use. Swap for a real PSP adapter without touching commerce code. */
const payments = createDemoPaymentProvider();

function initialState(): State {
  return {
    loaded: false,
    language: 'en',
    profile: null,
    journey: null,
    alerts: [],
    excludedIds: [],
    cart: newCart(),
    ledger: EMPTY_LEDGER,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state, loaded: true };
    case 'patch':
      return { ...state, ...action.patch };
    case 'reset':
      return { ...initialState(), loaded: true, language: state.language };
  }
}

export type CheckoutRequest = {
  traveller: { name: string; email: string };
  method: PaymentMethodId;
  idempotencyKey: string;
  simulateFailure: boolean;
};

type AppContextValue = State & {
  inventory: Inventory;
  paymentMethods: PaymentMethod[];
  isDemoPayment: boolean;
  setLanguage: (language: Language) => void;
  saveProfile: (profile: TravellerProfile) => void;
  /** Plans (or re-plans) the journey, keeping locked items. */
  plan: (profile?: TravellerProfile) => void;
  toggleLock: (itemId: string) => void;
  removeFromJourney: (itemId: string, refId: string) => void;
  /** Returns false when the item does not fit that day. */
  addToJourney: (date: string, candidate: Candidate) => boolean;
  /** Adds one or more lines in a single update. */
  addToCart: (lines: Omit<CartLine, 'id'> | Omit<CartLine, 'id'>[]) => void;
  removeFromCart: (lineId: string) => void;
  setParticipants: (lineId: string, participants: number) => void;
  startNewCart: () => void;
  checkout: (request: CheckoutRequest) => Promise<string>;
  cancelBooking: (bookingId: string) => void;
  resetAll: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { places, regions } = useContent();
  const inventory = useMemo(() => buildInventory(places, regions), [places, regions]);

  // Callbacks read the latest committed state through this ref.
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: raw ? (JSON.parse(raw) as Partial<PersistedState>) : {} }))
      .catch(() => dispatch({ type: 'hydrate', state: {} }));
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    const { loaded: _loaded, ...persisted } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  }, [state]);

  const patch = useCallback((value: Partial<PersistedState>) => dispatch({ type: 'patch', patch: value }), []);

  const plan = useCallback(
    (profileOverride?: TravellerProfile) => {
      const current = latest.current;
      const profile = profileOverride ?? current.profile;
      if (!profile) return;
      const { journey, alerts } = planJourney(profile, inventory, current.journey, {
        booked: bookedFromLedger(current.ledger),
        excludedIds: current.excludedIds,
      });
      patch({ profile, journey, alerts });
    },
    [inventory, patch],
  );

  const activeCart = useCallback((): Cart => {
    const cart = latest.current.cart;
    return cart.status !== 'active' || isCartExpired(cart) ? newCart() : cart;
  }, []);

  const checkout = useCallback(
    async (request: CheckoutRequest): Promise<string> => {
      const start = latest.current;
      const created = createOrder(start.ledger, {
        cart: start.cart,
        traveller: request.traveller,
        method: request.method,
        provider: payments.id,
        idempotencyKey: request.idempotencyKey,
      });
      patch({ ledger: created.ledger, cart: created.cart });

      const payment = created.ledger.payments.find((p) => p.id === created.order.paymentId)!;
      if (payment.status !== 'pending') return created.order.id;
      payments.simulateNextFailure(request.simulateFailure);
      const { intentId } = await payments.createIntent({
        paymentId: payment.id,
        amount: payment.gross,
        method: request.method,
        idempotencyKey: request.idempotencyKey,
      });
      const withIntent = attachIntent(created.ledger, payment.id, intentId);
      patch({ ledger: withIntent });
      const event = await payments.awaitResult(intentId, payment.id);
      const settled = applyPaymentEvent(withIntent, event);
      const succeeded = event.type === 'payment.succeeded';

      // Booked items are locked in the journey so re-planning never moves them.
      let journey = latest.current.journey;
      if (journey && succeeded) {
        const booked = settled.bookings.filter((b) => b.orderId === created.order.id && b.status === 'confirmed');
        journey = {
          ...journey,
          days: journey.days.map((day) => ({
            ...day,
            items: day.items.map((item) =>
              booked.some((b) => b.itemId === item.refId && b.date === day.date) ? { ...item, locked: true } : item,
            ),
          })),
        };
      }
      // A failed payment releases the bookings; the same items go back into a
      // fresh cart so the traveller can retry with a new checkout attempt.
      patch({ ledger: settled, journey, cart: succeeded ? newCart() : { ...newCart(), lines: start.cart.lines } });
      return created.order.id;
    },
    [patch],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      inventory,
      paymentMethods: payments.paymentOptions('IDR'),
      isDemoPayment: payments.isDemo,
      setLanguage: (language) => patch({ language }),
      saveProfile: (profile) => patch({ profile: clampProfile({ ...profile, updatedAt: new Date().toISOString() }) }),
      plan,
      toggleLock: (itemId) => state.journey && patch({ journey: toggleLock(state.journey, itemId) }),
      removeFromJourney: (itemId, refId) =>
        state.journey &&
        patch({
          journey: removeItem(state.journey, itemId),
          excludedIds: refId ? [...state.excludedIds, refId] : state.excludedIds,
        }),
      addToJourney: (date, candidate) => {
        if (!state.journey || !state.profile) return false;
        const next = addToDay(state.journey, date, candidate, state.profile, inventory, bookedFromLedger(state.ledger));
        if (!next) return false;
        patch({ journey: next, excludedIds: state.excludedIds.filter((id) => id !== candidate.item.id) });
        return true;
      },
      addToCart: (lines) => {
        const cart = (Array.isArray(lines) ? lines : [lines]).reduce((current, line) => addLine(current, line), activeCart());
        patch({ cart });
      },
      removeFromCart: (lineId) => patch({ cart: removeLine(state.cart, lineId) }),
      setParticipants: (lineId, participants) => patch({ cart: updateParticipants(state.cart, lineId, participants) }),
      startNewCart: () => patch({ cart: newCart() }),
      checkout,
      cancelBooking: (bookingId) => patch({ ledger: cancelLedgerBooking(state.ledger, bookingId).ledger }),
      resetAll: () => dispatch({ type: 'reset' }),
    }),
    [state, inventory, patch, plan, activeCart, checkout],
  );

  // Render nothing until saved state is loaded, so screens never initialise from empty defaults.
  return <AppContext.Provider value={value}>{state.loaded ? children : null}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppStoreProvider');
  return context;
}

/** Seats and services already held, for availability checks in screens. */
export function useBooked() {
  const { ledger } = useApp();
  return useMemo(() => bookedFromLedger(ledger), [ledger]);
}
