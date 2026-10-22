/**
 * Typed entities for BALI LENS (spec §12, §14, §32). Every bookable object has a
 * stable ID so AI, search, booking and settlement work on the same records.
 * Pure TypeScript: no React Native imports, so the domain layer is unit-testable.
 */

export type Currency = 'IDR';
export type Money = { amount: number; currency: Currency };

export type LatLng = { latitude: number; longitude: number };

export type LanguageCode = 'en' | 'id' | 'ja' | 'de' | 'fr' | 'zh' | 'es';

/** Localised text. English is required; Bahasa Indonesia where translated. */
export type LocalText = { en: string; id?: string };

// ---------------------------------------------------------------------------
// Traveller profile (spec §5)

export const PREFERENCE_KEYS = [
  'spiritual',
  'culture',
  'wellbeing',
  'adventure',
  'culinary',
  'arts',
  'beach',
  'nightlife',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export type TravellerProfile = {
  /** 0–100 interest per experience type. */
  preferences: Record<PreferenceKey, number>;
  /** 0 = authentic local, 100 = luxury. */
  localLuxury: number;
  /** 0 = slow, 100 = packed. */
  pace: number;
  /** 0 = budget, 100 = premium. */
  budget: number;
  /** First day of the trip, YYYY-MM-DD. */
  startDate: string;
  tripDays: number;
  party: { adults: number; children: number };
  /** Region the traveller is staying in; used for distance fit. */
  baseRegion: string;
  /** Languages the traveller is comfortable with, for guide matching. */
  languages: LanguageCode[];
  updatedAt: string;
};

export type PaceBand = 'slow' | 'balanced' | 'packed';
export type BudgetBand = 'budget' | 'mid' | 'mid_high' | 'premium';
export type StyleBand = 'local' | 'balanced' | 'premium';

// ---------------------------------------------------------------------------
// Inventory (spec §12)

export type OpeningHours = { open: number; close: number } | 'unknown';

export type Destination = {
  id: string;
  name: string;
  region: string;
  area: string;
  category: string;
  tags: PreferenceKey[];
  coordinates: LatLng;
  description: string;
  highlights: string[];
  /** Minutes after midnight. */
  hours: OpeningHours;
  visitMinutes: number;
  /** Informational only; destinations are not bookable here. */
  feeNote: string;
};

export type ImpactTag = 'community-owned' | 'family-run' | 'local-guide' | 'low-impact';

export type Experience = {
  id: string;
  vendorId: string;
  destinationIds: string[];
  title: string;
  summary: string;
  categories: PreferenceKey[];
  region: string;
  coordinates: LatLng;
  durationMin: number;
  /** Start times, "HH:MM". */
  slots: string[];
  /** Participants per slot. */
  capacity: number;
  /** Price per person. */
  price: Money;
  languages: LanguageCode[];
  impactTags: ImpactTag[];
  /** 0 = authentic local, 1 = luxury. */
  style: number;
  rating: { average: number; count: number };
  included: string[];
  meetingPoint: string;
  cancellationPolicy: CancellationPolicy;
  demo: boolean;
};

export type TicketType = { id: string; name: string; price: Money; capacityPerShow: number };

export type BaliEvent = {
  id: string;
  organizerId: string;
  title: string;
  summary: string;
  categories: PreferenceKey[];
  venue: { name: string; destinationId?: string; region: string; coordinates: LatLng };
  /** Recurring schedule: weekdays (0 = Sunday) and start time. */
  schedule: { weekdays: number[]; start: string; durationMin: number };
  program: { time: string; title: string }[];
  ticketTypes: TicketType[];
  status: 'scheduled' | 'cancelled' | 'postponed';
  rating: { average: number; count: number };
  cancellationPolicy: CancellationPolicy;
  demo: boolean;
};

export type VerificationStatus = 'verified' | 'pending' | 'suspended';

export type Vendor = {
  id: string;
  name: string;
  verificationStatus: VerificationStatus;
  serviceTypes: ('experience' | 'event' | 'guide' | 'transport')[];
  serviceArea: string[];
  communityOwned: boolean;
  demo: boolean;
};

export type Guide = {
  id: string;
  name: string;
  vendorId: string;
  languages: LanguageCode[];
  specialties: PreferenceKey[];
  areas: string[];
  verified: boolean;
  rating: { average: number; count: number };
  dayRate: Money;
  /** Weekdays (0 = Sunday) the guide does not work. */
  daysOff: number[];
  bio: string;
  cancellationPolicy: CancellationPolicy;
  demo: boolean;
};

export type VehicleClass = 'compact' | 'mpv' | 'premium-mpv' | 'van' | 'electric';

export type Vehicle = {
  id: string;
  label: string;
  vehicleClass: VehicleClass;
  seats: number;
  transmission: 'manual' | 'automatic';
  lowEmission: boolean;
};

export type DriverService = {
  id: string;
  operatorId: string;
  driverName: string;
  vehicle: Vehicle;
  serviceType: 'charter-day';
  areas: string[];
  languages: LanguageCode[];
  verified: boolean;
  rating: { average: number; count: number };
  dayRate: Money;
  daysOff: number[];
  cancellationPolicy: CancellationPolicy;
  demo: boolean;
};

// ---------------------------------------------------------------------------
// Cultural rules (spec §12, §16)

export type RuleSeverity = 'info' | 'warning' | 'restricted' | 'prohibited';
export type RuleKind = 'etiquette' | 'dress' | 'photography' | 'access' | 'safety';
export type RuleScope = 'global' | 'category' | 'destination' | 'experience' | 'event';

export type CulturalRule = {
  id: string;
  scopeType: RuleScope;
  /** Category id, destination id, experience id or event id; empty for global. */
  scopeId: string;
  kind: RuleKind;
  severity: RuleSeverity;
  text: LocalText;
  validFrom: string;
  /** Inclusive end date, or null for open-ended. */
  validTo: string | null;
  sourceOwner: string;
  version: number;
  /** True only when a destination/community/operator/admin source has verified it. */
  verified: boolean;
  demo: boolean;
};

// ---------------------------------------------------------------------------
// Commerce (spec §13, §14)

export type CancellationPolicy = {
  /** Full refund when cancelled at least this many hours before start. */
  freeCancellationHours: number;
};

export type LineItemType = 'experience' | 'event_ticket' | 'guide' | 'driver';

export type CartLine = {
  id: string;
  itemType: LineItemType;
  itemId: string;
  /** Ticket type for events. */
  variantId?: string;
  supplierId: string;
  title: string;
  date: string;
  time: string;
  participants: number;
  unitPrice: Money;
  /** "person" lines multiply by participants; "service" lines are per day. */
  pricing: 'person' | 'service';
  cancellationPolicy: CancellationPolicy;
};

export type CartStatus = 'active' | 'expired' | 'converted';

export type Cart = {
  id: string;
  status: CartStatus;
  lines: CartLine[];
  createdAt: string;
  expiresAt: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';
export type SettlementStatus = 'pending' | 'eligible' | 'paid' | 'held' | 'reversed';
export type RefundStatus = 'requested' | 'approved' | 'processed' | 'failed';

export type Booking = {
  id: string;
  orderId: string;
  lineId: string;
  supplierId: string;
  itemType: LineItemType;
  itemId: string;
  variantId?: string;
  title: string;
  date: string;
  time: string;
  participants: number;
  amount: Money;
  status: BookingStatus;
  cancellationPolicy: CancellationPolicy;
  passCode: string;
};

export type AuditEvent = {
  at: string;
  actor: 'traveller' | 'system' | 'psp';
  action: string;
  from?: string;
  to?: string;
};

export type Payment = {
  id: string;
  orderId: string;
  provider: string;
  method: string;
  currency: Currency;
  gross: Money;
  platformFee: Money;
  processingFee: Money;
  refunded: Money;
  status: PaymentStatus;
  idempotencyKey: string;
  intentId: string | null;
  audit: AuditEvent[];
};

export type Settlement = {
  id: string;
  orderId: string;
  bookingId: string;
  supplierId: string;
  payable: Money;
  status: SettlementStatus;
};

export type Refund = {
  id: string;
  orderId: string;
  bookingId: string;
  amount: Money;
  status: RefundStatus;
  createdAt: string;
};

export type Order = {
  id: string;
  cartId: string;
  idempotencyKey: string;
  createdAt: string;
  travellerName: string;
  travellerEmail: string;
  bookingIds: string[];
  paymentId: string;
  total: Money;
};

// ---------------------------------------------------------------------------
// Journey (spec §10)

export type JourneyItemKind = 'destination' | 'experience' | 'event' | 'meal';

/** Why an item fits, as structured facts the UI turns into a sentence (spec §9). */
export type Reason =
  | { type: 'preference'; key: PreferenceKey; value: number }
  | { type: 'near_base'; region: string }
  | { type: 'available_at'; time: string }
  | { type: 'community' }
  | { type: 'within_budget' }
  | { type: 'well_rated'; average: number; count: number }
  | { type: 'added_by_traveller' };

export type JourneyItem = {
  id: string;
  kind: JourneyItemKind;
  /** Inventory ID; empty for meal breaks. */
  refId: string;
  title: string;
  start: string;
  end: string;
  coordinates: LatLng | null;
  /** Minutes of travel from the previous located item (0 for the first). */
  travelMinutes: number;
  /** Locked items are never moved or replaced without the traveller (spec §10). */
  locked: boolean;
  reasons: Reason[];
};

export type JourneyDay = { date: string; region: string | null; items: JourneyItem[] };

export type Journey = {
  id: string;
  createdAt: string;
  days: JourneyDay[];
};

// ---------------------------------------------------------------------------
// Inventory bundle passed to domain services

export type Inventory = {
  destinations: Destination[];
  experiences: Experience[];
  events: BaliEvent[];
  vendors: Vendor[];
  guides: Guide[];
  drivers: DriverService[];
  rules: CulturalRule[];
  regions: Record<string, string>;
};
