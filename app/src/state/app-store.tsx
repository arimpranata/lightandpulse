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
import { buildInventory, DEMO_MARKETPLACE, type Marketplace } from '@/demo';
import { lookupFromRows, type BookedLookup, type BookedRow } from '@/domain/availability';
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
import { addDays, todayIso } from '@/domain/time';
import type { Cart, CartLine, Inventory, Journey, TravellerProfile } from '@/domain/types';
import { api, ApiClientError, isRemote, type Session, type SyncedState } from '@/services/backend';
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
  /** Platform API mode only (EXPO_PUBLIC_API_URL): the traveller's account, guest or registered. */
  session: Session | null;
  /** Platform API mode only: last marketplace and payment options from the server. */
  remote: { marketplace: Marketplace; paymentMethods: PaymentMethod[]; demoPayments: boolean } | null;
  /** Platform API mode only: seats and services held by live bookings, from the server. */
  bookedRows: BookedRow[];
};

type State = PersistedState & { loaded: boolean };

type Action =
  | { type: 'hydrate'; state: Partial<PersistedState> }
  | { type: 'patch'; patch: Partial<PersistedState> }
  | { type: 'reset' };

const STORAGE_KEY = 'balilens:state:v1';

/** On-device mode: the payment adapter in use. Platform API mode pays through the server instead. */
const payments = createDemoPaymentProvider();

const EMPTY_MARKETPLACE: Marketplace = { experiences: [], events: [], vendors: [], guides: [], drivers: [], rules: [] };
const AVAILABILITY_DAYS = 59;
const PAYMENT_WAIT_MS = 20_000;

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
    session: null,
    remote: null,
    bookedRows: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state, loaded: true };
    case 'patch':
      return { ...state, ...action.patch };
    case 'reset':
      return { ...initialState(), loaded: true, language: state.language, remote: state.remote };
  }
}

export type CheckoutRequest = {
  traveller: { name: string; email: string };
  method: PaymentMethodId;
  idempotencyKey: string;
  simulateFailure: boolean;
  /** Community rules the traveller acknowledged on the checkout screen. */
  acknowledgedRuleIds: string[];
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
  cancelBooking: (bookingId: string) => Promise<void>;
  /** Seats and services already held, for availability checks. */
  booked: BookedLookup;
  /** Platform API mode: sign in or create an account (keeps a guest's orders). */
  signIn: (session: Session) => void;
  resetAll: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { places, regions } = useContent();
  const marketplace = isRemote ? (state.remote?.marketplace ?? EMPTY_MARKETPLACE) : DEMO_MARKETPLACE;
  const inventory = useMemo(() => buildInventory(places, regions, marketplace), [places, regions, marketplace]);
  const booked = useMemo(
    () => (isRemote ? lookupFromRows(state.bookedRows) : bookedFromLedger(state.ledger)),
    [state.bookedRows, state.ledger],
  );
  const bookedRef = useRef(booked);

  // Callbacks read the latest committed state through this ref.
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
    bookedRef.current = booked;
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

  // ---- Platform API mode: account, inventory, availability, orders and state sync.
  const token = state.session?.token ?? null;

  const refreshAvailability = useCallback(async () => {
    const start = latest.current.profile?.startDate;
    const from = start && start > todayIso() ? start : todayIso();
    const { booked: rows } = await api.availability(from, addDays(from, AVAILABILITY_DAYS));
    patch({ bookedRows: rows });
  }, [patch]);

  const refreshLedger = useCallback(async (sessionToken: string) => {
    const { ledger } = await api.ledger(sessionToken);
    patch({ ledger });
    return ledger;
  }, [patch]);

  useEffect(() => {
    if (!isRemote || !state.loaded || token) return;
    // Book without signing up: a guest account, upgraded later if the traveller registers.
    api.guest().then((session) => patch({ session }), () => {});
  }, [state.loaded, token, patch]);

  useEffect(() => {
    if (!isRemote || !state.loaded) return;
    const saved = latest.current.session;
    if (!saved) return;
    // Renew the token once per launch; a revoked or expired one starts a new guest session.
    api.refresh(saved.token).then(
      (session) => patch({ session }),
      (error) => {
        if (error instanceof ApiClientError && error.status === 401) patch({ session: null });
      },
    );
  }, [state.loaded, patch]);

  useEffect(() => {
    if (!isRemote || !state.loaded) return;
    api.inventory().then((remote) => patch({ remote }), () => {});
    refreshAvailability().catch(() => {});
  }, [state.loaded, refreshAvailability, patch]);

  useEffect(() => {
    if (!isRemote || !token) return;
    refreshLedger(token).catch(() => {});
    api
      .getState(token)
      .then(({ state: saved }) => {
        // A plan saved on another device fills an empty one here; local edits win otherwise.
        if (saved && !latest.current.profile && saved.profile) {
          patch({
            language: saved.language,
            profile: saved.profile as TravellerProfile,
            journey: saved.journey as Journey | null,
            alerts: saved.alerts as PlanAlert[],
            excludedIds: saved.excludedIds,
          });
        }
      })
      .catch(() => {});
  }, [token, refreshLedger, patch]);

  const { language, profile, journey, alerts, excludedIds } = state;
  useEffect(() => {
    if (!isRemote || !token) return;
    const synced: SyncedState = { language, profile, journey, alerts, excludedIds };
    const timer = setTimeout(() => api.putState(token, synced).catch(() => {}), 1500);
    return () => clearTimeout(timer);
  }, [token, language, profile, journey, alerts, excludedIds]);

  const plan = useCallback(
    (profileOverride?: TravellerProfile) => {
      const current = latest.current;
      const profile = profileOverride ?? current.profile;
      if (!profile) return;
      const { journey, alerts } = planJourney(profile, inventory, current.journey, {
        booked: bookedRef.current,
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

  /** Booked items are locked in the journey so re-planning never moves them. */
  const lockBooked = useCallback((ledger: Ledger, orderId: string) => {
    const journey = latest.current.journey;
    if (!journey) return journey;
    const booked = ledger.bookings.filter((b) => b.orderId === orderId && b.status === 'confirmed');
    return {
      ...journey,
      days: journey.days.map((day) => ({
        ...day,
        items: day.items.map((item) =>
          booked.some((b) => b.itemId === item.refId && b.date === day.date) ? { ...item, locked: true } : item,
        ),
      })),
    };
  }, []);

  const remoteCheckout = useCallback(
    async (request: CheckoutRequest): Promise<string> => {
      const start = latest.current;
      const sessionToken = start.session?.token;
      if (!sessionToken) throw new Error('Not signed in');
      // The server re-prices every line and re-checks availability and cultural rules.
      const { orderId } = await api.createOrder(sessionToken, {
        idempotencyKey: request.idempotencyKey,
        traveller: request.traveller,
        method: request.method,
        simulateFailure: request.simulateFailure,
        acknowledgedRuleIds: request.acknowledgedRuleIds,
        lines: start.cart.lines.map((line) => ({
          itemType: line.itemType,
          itemId: line.itemId,
          variantId: line.variantId,
          date: line.date,
          time: line.time,
          participants: line.participants,
        })),
      });
      patch({ cart: { ...start.cart, status: 'converted' } });

      // The payment result arrives at the server by signed webhook; wait for it.
      const until = Date.now() + PAYMENT_WAIT_MS;
      let ledger = await refreshLedger(sessionToken);
      const status = (l: Ledger) => l.payments.find((p) => p.orderId === orderId)?.status ?? 'pending';
      while (status(ledger) === 'pending' && Date.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        ledger = await refreshLedger(sessionToken);
      }
      const succeeded = status(ledger) === 'paid';
      patch({
        journey: succeeded ? lockBooked(ledger, orderId) : latest.current.journey,
        cart: succeeded ? newCart() : { ...newCart(), lines: start.cart.lines },
      });
      refreshAvailability().catch(() => {});
      return orderId;
    },
    [patch, refreshLedger, refreshAvailability, lockBooked],
  );

  const checkout = useCallback(
    async (request: CheckoutRequest): Promise<string> => {
      if (isRemote) return remoteCheckout(request);
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
      const journey = succeeded ? lockBooked(settled, created.order.id) : latest.current.journey;
      // A failed payment releases the bookings; the same items go back into a
      // fresh cart so the traveller can retry with a new checkout attempt.
      patch({ ledger: settled, journey, cart: succeeded ? newCart() : { ...newCart(), lines: start.cart.lines } });
      return created.order.id;
    },
    [patch, remoteCheckout, lockBooked],
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const sessionToken = latest.current.session?.token;
      if (isRemote && sessionToken) {
        await api.cancelBooking(sessionToken, bookingId);
        await refreshLedger(sessionToken);
        refreshAvailability().catch(() => {});
        return;
      }
      patch({ ledger: cancelLedgerBooking(latest.current.ledger, bookingId).ledger });
    },
    [patch, refreshLedger, refreshAvailability],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      inventory,
      paymentMethods: isRemote ? (state.remote?.paymentMethods ?? []) : payments.paymentOptions('IDR'),
      isDemoPayment: isRemote ? (state.remote?.demoPayments ?? true) : payments.isDemo,
      booked,
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
        const next = addToDay(state.journey, date, candidate, state.profile, inventory, booked);
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
      cancelBooking,
      signIn: (session) => patch({ session }),
      resetAll: () => dispatch({ type: 'reset' }),
    }),
    [state, inventory, booked, patch, plan, activeCart, checkout, cancelBooking],
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
  return useApp().booked;
}
