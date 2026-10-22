# BALI LENS

An AI-powered Bali tourism experience platform: a traveller app (iOS, Android and web), a platform API with PostgreSQL, and partner tools for vendors, admins and cultural reviewers. It deploys to a single VPS with Docker Compose.

```
app/          Expo (React Native) traveller app and partner portal; shared domain logic in app/src/domain (see app/README.md)
server/       Platform API: Node.js + TypeScript, Fastify, PostgreSQL (accounts, inventory, bookings, payments, portals)
deploy/vps/   Docker Compose, Caddy and backup script for the VPS
docs/         product specification, gap analysis and decision log
```

## Product specification

The reference for all work is the [BALI LENS build spec](docs/spec/bali-lens-build-spec.md). It replaced the earlier Bali Experience AI v1.0 spec, which is kept in `docs/spec/`.

- [`docs/gap-analysis.md`](docs/gap-analysis.md): the spec's acceptance criteria and screens, and what is done.
- [`docs/decisions.md`](docs/decisions.md): decisions. Hosting is a VPS with Docker ([D-019](docs/decisions.md#d-019-vps-hosting-with-docker-compose)); the payment provider (D-007) and AI provider (D-009) are still open.
- [`AGENTS.md`](AGENTS.md): working rules for AI coding agents.

## How it fits together

```
Phone / browser ──HTTPS──> Caddy (web app, TLS) ──/api──> API (Fastify) ──> PostgreSQL
                                                           ▲
                               payment provider ──signed webhook (HMAC)
```

- **Travellers** start as a guest account (created on first launch) and can register later without losing bookings. Journey planning runs in the app on server inventory; the plan syncs to the server.
- **Checkout** is server-authoritative: the API re-prices every line from the database, checks cultural rules (a PROHIBITED rule blocks, RESTRICTED/WARNING rules must be acknowledged), locks each slot while it re-checks availability so concurrent checkouts cannot overbook, and creates one order with a child booking per supplier.
- **Payments** go through a provider adapter. The demo provider moves no money; like a real one, it confirms by calling `POST /payments/webhook` with an HMAC-signed body. Webhooks are verified, stored by event ID and safe to replay. A real provider (Midtrans, Xendit, …) replaces the adapter once D-007 is decided.
- **Vendors** see only their own products, bookings and payouts, mark bookings completed or no-show, and submit product edits for review.
- **Admins** approve products, verify or suspend vendors, pay out eligible settlements and read the audit log. **Cultural reviewers** (and admins) edit cultural rules, which creates a new version and clears verification until the rule is verified again.
- Every financial or moderation change is written to `audit_log` with actor, source, and before/after state.

The partner portal is part of the app at `/portal` (Profile → Partner and admin portal).

## API

All responses are JSON. Errors have the shape `{"error": {"code", "message", "details"}}`. Authenticated routes take `Authorization: Bearer <token>`.

| Route | Who | Purpose |
| --- | --- | --- |
| `GET /health` | anyone | Liveness and database check |
| `GET /content` | anyone | Destinations, trip ideas and guide content |
| `GET /inventory` | anyone | Published experiences, events, vendors, guides, drivers, cultural rules; payment options |
| `GET /availability?from&to` | anyone | Seats and services held by live bookings (≤ 60 days) |
| `POST /auth/guest`, `/auth/register`, `/auth/login`, `/auth/refresh`, `GET /auth/me` | anyone / signed in | Sessions (rate limited) |
| `GET`/`PUT /me/state` | traveller | Profile, journey and settings |
| `GET /me/orders` | traveller | Orders, bookings, payments, refunds |
| `POST /orders` | traveller | Checkout (idempotency key required) |
| `POST /bookings/:id/cancel` | traveller, admin | Partial cancellation with refund under the line's policy |
| `POST /payments/webhook` | payment provider | Signed payment callback |
| `GET /vendor/overview`, `POST /vendor/bookings/:id/complete`, `/no-show`, `PUT /vendor/experiences/:id` | vendor | Vendor portal |
| `GET /admin/overview`, `POST /admin/vendors/:id/verification`, `/admin/experiences/:id/review`, `/admin/settlements/:id/pay`, `/admin/users` | admin | Admin portal |
| `GET /cultural/rules`, `PUT /cultural/rules/:id`, `POST /cultural/rules`, `/cultural/rules/:id/verify`, `GET /cultural/rules/:id/versions` | admin, cultural reviewer | Cultural rules |

## Deploying to a VPS

You need a VPS with Docker Engine and the Compose plugin (Ubuntu 24.04 with 2 GB RAM is enough to start; building the web app needs the memory), and a domain whose DNS `A` record points at the server. Ports 80 and 443 must be open.

```bash
git clone <this repository> /opt/balilens && cd /opt/balilens/deploy/vps
cp .env.example .env
nano .env                 # DOMAIN, POSTGRES_PASSWORD, JWT_SECRET, PSP_WEBHOOK_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build
```

Generate each secret with `openssl rand -hex 32`. On first start the API applies the database migrations, loads the destination content and (unless `SEED_DEMO=false`) the demo marketplace, and creates the admin account. Caddy then obtains the HTTPS certificate.

Check:

- `https://your-domain/api/health` returns `{"ok":true}`.
- `https://your-domain` opens the app; Profile shows the account section and the partner portal link.
- Sign in to `https://your-domain/portal` with the admin account. Create vendor and reviewer accounts with `POST /admin/users`.

Update after pulling new code: `docker compose up -d --build`. Migrations run automatically.

Backups: `deploy/vps/backup.sh` writes a `pg_dump` to `deploy/vps/backups/` and keeps 14 days. Run it daily from cron and copy the files off the server. Restore with `docker compose exec -T db pg_restore -U balilens -d balilens --clean < backups/<file>.dump`.

### Mobile builds

Set `EXPO_PUBLIC_API_URL=https://your-domain/api` in `app/.env` (or the EAS environment) before building with EAS. The web app built by Compose already points at the same domain.

## Local development

```bash
# PostgreSQL 16 running locally, with a database for the API
cd server && npm install
export DATABASE_URL=postgres://balilens:devpass@127.0.0.1/balilens ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=admin-password-123
npm run dev                    # API on http://localhost:3000

cd ../app && npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npm run web
```

Without `EXPO_PUBLIC_API_URL` the app runs entirely on the device with bundled content and demo inventory, as before.

Checks:

```bash
cd app && npx tsc --noEmit && npx expo lint && npm test
cd server && npm run typecheck && npm test   # tests need TEST_DATABASE_URL (a disposable database; its schema is dropped)
```

## Security notes

- No secrets are committed. Production refuses to start without `JWT_SECRET` and `PSP_WEBHOOK_SECRET` (32+ characters each).
- Passwords are hashed with scrypt. Tokens are HS256 JWTs (7 days for travellers, 12 hours for staff) and the account is re-checked on every request, so disabling a user takes effect at once.
- The database and API are not exposed to the internet; only Caddy publishes ports 80 and 443.
- Card details never reach BALI LENS: real providers collect them in their own tokenised UI.
