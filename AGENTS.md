# Agent instructions

This repository is building **BALI LENS**, an AI-powered Bali tourism experience platform. The authoritative product specification is [`docs/spec/bali-lens-build-spec.md`](docs/spec/bali-lens-build-spec.md) (decision D-016). The earlier Bali Experience AI v1.0 spec in `docs/spec/` is kept for reference; its engineering rules below still apply where BALI LENS does not contradict them.

Before changing code, read the parts of the spec that cover your task, then:

- [`docs/gap-analysis.md`](docs/gap-analysis.md): what exists today versus the spec.
- [`docs/decisions.md`](docs/decisions.md): decided, proposed and open decisions. Do not start work that an **Open** decision blocks; ask the owner instead.

## Where the project is

- `app/`: the Expo traveller app and partner portal (`/portal`). With `EXPO_PUBLIC_API_URL` set it uses the platform API; without it, it runs the MVP flow on the device against demo inventory. Domain logic is in `app/src/domain` (pure TypeScript, unit-tested), demo data in `app/src/demo`, adapters in `app/src/services`, UI strings in `app/src/i18n` (English and Bahasa Indonesia).
- `server/`: the platform API (Node.js, Fastify, PostgreSQL; D-019, D-020). Accounts and roles, inventory, availability, server-authoritative checkout, signed payment webhooks, refunds, vendor and admin portals, cultural rule management and the audit log. SQL migrations are in `server/migrations` (add a new numbered file; never edit an applied one).
- `deploy/vps/`: Docker Compose deployment (PostgreSQL, API, Caddy).
- Not built: real payment provider (D-007), LLM concierge (D-009), community control panel, chat, reviews, notifications.

The server imports `app/src/domain`, `app/src/demo` and `app/src/data`. Keep them free of React Native imports, so one implementation serves both.

## Rules (BALI LENS §8, §16, §26; v1.0 spec §43, §44, §52)

- Read the repository and docs before making changes. Preserve working code; do not rewrite it without a reason.
- Prefer small, domain-scoped changes. Maintain shared types. Avoid unnecessary dependencies.
- TypeScript strict mode. No hard-coded secrets.
- Never fabricate availability, prices, events, payments or cultural rules, in code, seed data or AI output. Mark demo records explicitly (§41).
- External providers (payments, AI, maps, weather) go behind adapters. Do not expose database models directly as public API contracts.
- The LLM never performs privileged database mutations directly. All AI-initiated changes pass application authorization and validation. Never transact without explicit user confirmation.
- Financial and booking operations must be deterministic, auditable and idempotent.
- Cultural rules are backend data. Entities with a PROHIBITED rule never become actionable recommendations (§18, §28).
- If a requirement is ambiguous, choose the smallest implementation that preserves the domain model and extension points. Do not invent business policy: add an **Open** entry to `docs/decisions.md` instead.
- Never trade transaction integrity, security or cultural governance for speed.

## Checks to run before finishing

Run these until a workspace with shared commands exists:

```bash
cd app && npx tsc --noEmit && npx expo lint && npm test   # mobile app and domain tests
cd server && npm run typecheck && npm test                # API integration tests (TEST_DATABASE_URL: a disposable PostgreSQL database)
POSTGRES_PASSWORD=x JWT_SECRET=x PSP_WEBHOOK_SECRET=x docker compose -f deploy/vps/docker-compose.yml --env-file deploy/vps/.env.example config -q   # if deploy files changed
```

Report the files you changed and the results of these checks. Stop and report if a critical acceptance criterion fails.

## More specific guidance

- `app/AGENTS.md`: Expo and React Native conventions for the mobile app.
- `README.md`: project layout, API and VPS deployment.
