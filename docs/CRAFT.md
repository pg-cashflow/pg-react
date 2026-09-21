# PG Cashflow — craft vs speed

**Speed is not a substitute for craft.** Fast means narrowing **what** you ship and **when** you validate—not skipping **how** money and trust work.

Read this before adding a route. Visual recipes: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). Voice: [BRAND_VOICE.md](./BRAND_VOICE.md). Flow tests: [UX_VALIDATION.md](./UX_VALIDATION.md).

## Thesis

Cut **scope**, not **standards**. Compose existing primitives. Run silent tests on money loops, not on every screen.

Constraints (tokens, `.t-*`, pg-go types) **enable** speed: a screen that reuses `PayPanel` / `QueryState` is faster to review than a one-off Tailwind page that fails lint and erodes trust.

Skipping user tests does not save time. It moves confusion to WhatsApp and churn.

## Slow lanes (never skip on money / auth)

Must pass before merge if the PR touches pay, UTR, join, dues, reports, or identity:

- [ ] `npm run lint` (oxlint + palette + type-scale)
- [ ] `npm test` — contract tests still green
- [ ] Payment states honest: no optimistic “Paid”; confirming / UTR submitted / owner verifying
- [ ] Glossary copy: ledger, passbook, due code — not invoice/bill
- [ ] One primary CTA on each changed viewport
- [ ] Nav labels match the job (pay lives on Dues; Passbook is history)

## Fast lanes (OK to ship rough)

Rewards catalog layout, facility admin density, empty-state copy, non-money empty states. Still use tokens and `.t-*`. Do not invent palettes to “look more designed.”

## Order of operations (any feature)

1. One job-to-be-done sentence in user language.
2. Put it in an **existing** shell / route, not a new portal.
3. Compose primitives (`StatusPill`, `QueryState`, `PayPanel`, `ConfirmDialog`).
4. `npm run lint`.
5. Adversarial AI prompt from [UX_VALIDATION.md](./UX_VALIDATION.md) — no praise.
6. Silent test **only** if this is a slow lane.

## Temptations

| Temptation             | Response                                      |
| ---------------------- | --------------------------------------------- |
| Pretty AI screen       | Recipes + lint + adversarial flow prompt      |
| “Fix nav labels later” | Fix money-path labels now; defer perks chrome |
| Palette lint passed    | Walk the UX_VALIDATION journey for that role  |
| Ship more features     | Cut features, not pay/join/UTR tests          |
| More tooltips          | IA: rename, move, or change default tab       |

Live session scoreboard: [UX_SESSIONS.md](./UX_SESSIONS.md).
