import type { Marketplace } from '@/demo';
import type { BookedRow } from '@/domain/availability';
import type { Ledger } from '@/domain/commerce';
import type { PaymentMethod, PaymentMethodId } from '@/domain/payments';
import type { Booking, CulturalRule, Experience, Settlement, Vendor } from '@/domain/types';

/**
 * BALI LENS platform API (server/). Set EXPO_PUBLIC_API_URL at build time to use
 * it; without it the app runs entirely on the device against demo inventory.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;
export const isRemote = API_URL !== null;

const TIMEOUT_MS = 15_000;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(method: string, path: string, options: { token?: string | null; body?: unknown } = {}): Promise<T> {
  if (!API_URL) throw new ApiClientError(0, 'OFFLINE', 'No API configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: { code: string; message: string; details?: unknown } };
    if (!response.ok) {
      throw new ApiClientError(response.status, body.error?.code ?? 'INTERNAL_ERROR', body.error?.message ?? `HTTP ${response.status}`, body.error?.details);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    throw new ApiClientError(0, 'OFFLINE', 'The server could not be reached.');
  } finally {
    clearTimeout(timer);
  }
}

export type Role = 'traveller' | 'vendor' | 'admin' | 'cultural_reviewer';
export type SessionUser = { id: string; email: string | null; displayName: string | null; role: Role; vendorId: string | null; guest: boolean };
export type Session = { token: string; user: SessionUser };

export type SyncedState = {
  language: 'en' | 'id';
  profile: unknown;
  journey: unknown;
  alerts: unknown[];
  excludedIds: string[];
};

export type OrderLineRequest = {
  itemType: 'experience' | 'event_ticket' | 'guide' | 'driver';
  itemId: string;
  variantId?: string;
  date: string;
  time?: string;
  participants: number;
};

export type OrderRequest = {
  idempotencyKey: string;
  traveller: { name: string; email: string };
  method: PaymentMethodId;
  simulateFailure?: boolean;
  acknowledgedRuleIds: string[];
  lines: OrderLineRequest[];
};

export type ProductEdit = {
  title: string;
  summary: string;
  price: number;
  capacity: number;
  slots: string[];
  durationMin: number;
  meetingPoint: string;
  freeCancellationHours: number;
};

export type PortalExperience = Experience & { status: 'draft' | 'submitted' | 'published' | 'rejected'; reviewNote?: string | null };
export type AuditEntry = { id: number; at: string; actorRole: string; source: string; action: string; entity: string; entityId: string };
export type ManagedRule = CulturalRule & { verifiedAt: string | null };
export type RuleInput = Omit<CulturalRule, 'id' | 'version' | 'verified' | 'demo'>;

export const api = {
  guest: () => request<Session>('POST', '/auth/guest'),
  login: (email: string, password: string) => request<Session>('POST', '/auth/login', { body: { email, password } }),
  register: (token: string | null, body: { email: string; password: string; name: string }) =>
    request<Session>('POST', '/auth/register', { token, body }),
  refresh: (token: string) => request<Session>('POST', '/auth/refresh', { token }),
  me: (token: string) => request<{ user: SessionUser }>('GET', '/auth/me', { token }),

  inventory: () => request<{ marketplace: Marketplace; paymentMethods: PaymentMethod[]; demoPayments: boolean }>('GET', '/inventory'),
  availability: (from: string, to: string) => request<{ booked: BookedRow[] }>('GET', `/availability?from=${from}&to=${to}`),

  getState: (token: string) => request<{ state: SyncedState | null }>('GET', '/me/state', { token }),
  putState: (token: string, state: SyncedState) => request<{ ok: true }>('PUT', '/me/state', { token, body: state }),
  ledger: (token: string) => request<{ ledger: Ledger }>('GET', '/me/orders', { token }),
  createOrder: (token: string, body: OrderRequest) => request<{ orderId: string }>('POST', '/orders', { token, body }),
  cancelBooking: (token: string, bookingId: string) => request<{ refund: unknown }>('POST', `/bookings/${encodeURIComponent(bookingId)}/cancel`, { token }),

  vendorOverview: (token: string) =>
    request<{ vendor: Vendor | null; experiences: PortalExperience[]; bookings: Booking[]; settlements: Settlement[] }>('GET', '/vendor/overview', { token }),
  closeBooking: (token: string, bookingId: string, outcome: 'complete' | 'no-show') =>
    request<{ ok: true }>('POST', `/vendor/bookings/${encodeURIComponent(bookingId)}/${outcome}`, { token }),
  editExperience: (token: string, id: string, edit: ProductEdit) =>
    request<{ ok: true }>('PUT', `/vendor/experiences/${encodeURIComponent(id)}`, { token, body: edit }),

  adminOverview: (token: string) =>
    request<{
      totals: { orders: number; gross: number; refunded: number; confirmed: number };
      vendors: Vendor[];
      review: PortalExperience[];
      bookings: Booking[];
      settlements: Settlement[];
      audit: AuditEntry[];
    }>('GET', '/admin/overview', { token }),
  setVendorStatus: (token: string, id: string, status: Vendor['verificationStatus']) =>
    request<{ ok: true }>('POST', `/admin/vendors/${encodeURIComponent(id)}/verification`, { token, body: { status } }),
  reviewExperience: (token: string, id: string, decision: 'approve' | 'reject', note?: string) =>
    request<{ ok: true }>('POST', `/admin/experiences/${encodeURIComponent(id)}/review`, { token, body: { decision, note } }),
  paySettlement: (token: string, id: string) => request<{ ok: true }>('POST', `/admin/settlements/${encodeURIComponent(id)}/pay`, { token }),

  rules: (token: string) => request<{ rules: ManagedRule[] }>('GET', '/cultural/rules', { token }),
  updateRule: (token: string, id: string, rule: RuleInput) => request<{ ok: true }>('PUT', `/cultural/rules/${encodeURIComponent(id)}`, { token, body: rule }),
  verifyRule: (token: string, id: string) => request<{ ok: true }>('POST', `/cultural/rules/${encodeURIComponent(id)}/verify`, { token }),
};
