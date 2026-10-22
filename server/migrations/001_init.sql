-- BALI LENS platform schema (PostgreSQL 14+).
-- Money is numeric with an explicit currency; timestamps are timestamptz (UTC).

-- ---------------------------------------------------------------------------
-- Content (destinations, trip ideas, guide)

CREATE TABLE regions (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  sort_order  smallint NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  icon        text NOT NULL,
  color_from  text NOT NULL,
  color_to    text NOT NULL,
  sort_order  smallint NOT NULL DEFAULT 0
);

CREATE TABLE destinations (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  tagline      text NOT NULL,
  category_id  text NOT NULL REFERENCES categories (id),
  region_id    text NOT NULL REFERENCES regions (id),
  area         text NOT NULL,
  description  text NOT NULL,
  best_time    text NOT NULL,
  hours        text NOT NULL,
  fee          text NOT NULL,
  duration     text NOT NULL,
  latitude     numeric(9, 6) NOT NULL,
  longitude    numeric(9, 6) NOT NULL,
  highlights   jsonb NOT NULL DEFAULT '[]',
  tips         jsonb NOT NULL DEFAULT '[]',
  featured     boolean NOT NULL DEFAULT false,
  published    boolean NOT NULL DEFAULT true,
  sort_order   smallint NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Trip ideas and guide content are edited as whole documents.
CREATE TABLE content_documents (
  key         text PRIMARY KEY,
  body        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Marketplace inventory (spec §12). Entity fields beyond the indexed columns
-- live in `data`, in the shape of the shared TypeScript domain types.

CREATE TABLE vendors (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  verification_status  text NOT NULL CHECK (verification_status IN ('verified', 'pending', 'suspended')),
  service_types        text[] NOT NULL DEFAULT '{}',
  service_area         text[] NOT NULL DEFAULT '{}',
  community_owned      boolean NOT NULL DEFAULT false,
  demo                 boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Product lifecycle: draft → submitted → published (or rejected).
CREATE TABLE experiences (
  id          text PRIMARY KEY,
  vendor_id   text NOT NULL REFERENCES vendors (id),
  status      text NOT NULL CHECK (status IN ('draft', 'submitted', 'published', 'rejected')),
  data        jsonb NOT NULL,
  demo        boolean NOT NULL DEFAULT false,
  review_note text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX experiences_vendor ON experiences (vendor_id);

CREATE TABLE events (
  id            text PRIMARY KEY,
  organizer_id  text NOT NULL REFERENCES vendors (id),
  status        text NOT NULL CHECK (status IN ('draft', 'submitted', 'published', 'rejected')),
  data          jsonb NOT NULL,
  demo          boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guides (
  id          text PRIMARY KEY,
  vendor_id   text NOT NULL REFERENCES vendors (id),
  data        jsonb NOT NULL,
  demo        boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE drivers (
  id           text PRIMARY KEY,
  operator_id  text NOT NULL REFERENCES vendors (id),
  data         jsonb NOT NULL,
  demo         boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Cultural rules (spec §16): structured, versioned, owned, verified.

CREATE TABLE cultural_rules (
  id            text PRIMARY KEY,
  scope_type    text NOT NULL CHECK (scope_type IN ('global', 'category', 'destination', 'experience', 'event')),
  scope_id      text NOT NULL DEFAULT '',
  kind          text NOT NULL CHECK (kind IN ('etiquette', 'dress', 'photography', 'access', 'safety')),
  severity      text NOT NULL CHECK (severity IN ('info', 'warning', 'restricted', 'prohibited')),
  text_en       text NOT NULL,
  text_id       text,
  valid_from    date NOT NULL,
  valid_to      date,
  source_owner  text NOT NULL,
  version       integer NOT NULL DEFAULT 1,
  verified      boolean NOT NULL DEFAULT false,
  verified_by   uuid,
  verified_at   timestamptz,
  demo          boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Every saved version of a rule, for attribution and audit.
CREATE TABLE cultural_rule_versions (
  rule_id     text NOT NULL REFERENCES cultural_rules (id) ON DELETE CASCADE,
  version     integer NOT NULL,
  snapshot    jsonb NOT NULL,
  changed_by  uuid,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, version)
);

-- ---------------------------------------------------------------------------
-- Accounts (spec §4, §25)

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text UNIQUE,
  password_hash  text,
  display_name   text,
  role           text NOT NULL CHECK (role IN ('traveller', 'vendor', 'admin', 'cultural_reviewer')),
  vendor_id      text REFERENCES vendors (id),
  disabled       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (role <> 'vendor' OR vendor_id IS NOT NULL)
);

-- Traveller profile, journey and settings, synced from the app.
CREATE TABLE traveller_state (
  user_id      uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  language     text NOT NULL DEFAULT 'en',
  profile      jsonb,
  journey      jsonb,
  alerts       jsonb NOT NULL DEFAULT '[]',
  excluded_ids jsonb NOT NULL DEFAULT '[]',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Commerce (spec §13, §14). Financial rows are never deleted.

CREATE TABLE orders (
  id               text PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users (id),
  cart_id          text NOT NULL,
  idempotency_key  text NOT NULL,
  traveller_name   text NOT NULL,
  traveller_email  text NOT NULL,
  total            numeric(14, 2) NOT NULL,
  currency         char(3) NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE bookings (
  id                       text PRIMARY KEY,
  order_id                 text NOT NULL REFERENCES orders (id),
  line_id                  text NOT NULL,
  supplier_id              text NOT NULL REFERENCES vendors (id),
  item_type                text NOT NULL CHECK (item_type IN ('experience', 'event_ticket', 'guide', 'driver')),
  item_id                  text NOT NULL,
  variant_id               text,
  title                    text NOT NULL,
  service_date             date NOT NULL,
  service_time             text NOT NULL,
  participants             integer NOT NULL CHECK (participants > 0),
  amount                   numeric(14, 2) NOT NULL,
  currency                 char(3) NOT NULL,
  status                   text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  free_cancellation_hours  integer NOT NULL,
  pass_code                text NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_inventory ON bookings (item_id, service_date) WHERE status IN ('pending', 'confirmed');
CREATE INDEX bookings_supplier ON bookings (supplier_id, service_date);

CREATE TABLE payments (
  id               text PRIMARY KEY,
  order_id         text NOT NULL UNIQUE REFERENCES orders (id),
  provider         text NOT NULL,
  method           text NOT NULL,
  currency         char(3) NOT NULL,
  gross            numeric(14, 2) NOT NULL,
  platform_fee     numeric(14, 2) NOT NULL,
  processing_fee   numeric(14, 2) NOT NULL,
  refunded         numeric(14, 2) NOT NULL DEFAULT 0,
  status           text NOT NULL CHECK (status IN ('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded')),
  idempotency_key  text NOT NULL,
  intent_id        text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Provider callbacks, keyed by the provider's event ID: a replay is a no-op.
CREATE TABLE payment_events (
  id           text PRIMARY KEY,
  payment_id   text NOT NULL REFERENCES payments (id),
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settlements (
  id           text PRIMARY KEY,
  order_id     text NOT NULL REFERENCES orders (id),
  booking_id   text NOT NULL UNIQUE REFERENCES bookings (id),
  supplier_id  text NOT NULL REFERENCES vendors (id),
  payable      numeric(14, 2) NOT NULL,
  currency     char(3) NOT NULL,
  status       text NOT NULL CHECK (status IN ('pending', 'eligible', 'paid', 'held', 'reversed')),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
  id          text PRIMARY KEY,
  order_id    text NOT NULL REFERENCES orders (id),
  booking_id  text NOT NULL REFERENCES bookings (id),
  amount      numeric(14, 2) NOT NULL,
  currency    char(3) NOT NULL,
  status      text NOT NULL CHECK (status IN ('requested', 'approved', 'processed', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Audit trail (spec §23): actor, timestamp, source, previous and new state.

CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,
  actor_role  text NOT NULL,
  source      text NOT NULL,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  before      jsonb,
  after       jsonb
);
CREATE INDEX audit_entity ON audit_log (entity, entity_id);
