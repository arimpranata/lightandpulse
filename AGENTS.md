# Agent instructions

This repository is building **Bali Experience AI**, an AI-powered tourism platform for Bali. The authoritative product and technical specification is:

- [`docs/spec/bali-experience-ai-spec-v1.0.pdf`](docs/spec/bali-experience-ai-spec-v1.0.pdf) (original)
- [`docs/spec/bali-experience-ai-spec-v1.0.md`](docs/spec/bali-experience-ai-spec-v1.0.md) (searchable transcription; the PDF wins if they differ)

Before changing code, read the parts of the spec that cover your task, then:

- [`docs/gap-analysis.md`](docs/gap-analysis.md): what exists today versus the spec.
- [`docs/decisions.md`](docs/decisions.md): decided, proposed and open decisions. Do not start work that an **Open** decision blocks; ask the owner instead.

## Where the project is

The code is a **pre-M01 prototype**: a read-only traveller guide (Expo app in `app/`, PHP API in `api/`, MySQL schema in `database/`). The spec's roadmap starts at M01 Foundation (§42, §45). The backend stack and hosting are not settled yet (decision D-002), so do not start the M01 monorepo or replace `api/` or `database/` until D-002 is decided.

## Rules (from spec §43, §44 and §52)

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

Until M01 introduces the spec's `pnpm` workspace commands (§50), use the current ones:

```bash
cd app && npx tsc --noEmit && npx expo lint      # mobile app
for f in api/*.php; do php -l "$f"; done           # PHP API
node database/generate-seed.mjs                    # if app/src/data changed; commit the new seed.sql
```

Report the files you changed and the results of these checks. Stop and report if a critical acceptance criterion fails.

## More specific guidance

- `app/AGENTS.md`: Expo and React Native conventions for the mobile app.
- `README.md`: project layout, API and Hostinger deployment.
