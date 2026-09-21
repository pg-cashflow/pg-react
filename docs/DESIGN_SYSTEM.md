# PG Cashflow design system

Read [CRAFT.md](./CRAFT.md) before adding routes: speed on scope, not on money/trust. This file is the visual recipes.

Single source of truth for tokens, type, spacing, and QA. New screens **compose** these recipes — they do not invent hex, `slate-*`, or extra radii.

## Token layers

| Layer           | Where                                                     | Rule                     |
| --------------- | --------------------------------------------------------- | ------------------------ |
| Raw palette     | `src/index.css` `--raw-*`                                 | Never used in components |
| Semantic        | `--bg`, `--surface`, `--ink-*`, `--hairline`, status      | All meaning              |
| Portal modifier | `[data-portal="owner\|tenant\|manager"]` + `.dark`        | Accent only              |
| Tailwind        | `bg-bg`, `text-ink-muted`, `border-hairline`, `bg-accent` | Routes use utilities     |

Status colors (paid / pending / partial / overdue / waived) are **money only**, never decoration.

## Type scale (`.t-*`)

| Class            | Size / leading | Weight | Family            |
| ---------------- | -------------- | ------ | ----------------- |
| `.t-display`     | 28 / 34        | 700    | Plex Sans         |
| `.t-h1`          | 22 / 28        | 700    | Plex Sans         |
| `.t-h2`          | 18 / 24        | 700    | Plex Sans         |
| `.t-h3`          | 16 / 22        | 600    | Plex Sans         |
| `.t-body`        | 14 / 20        | 400    | Plex Sans         |
| `.t-body-sm`     | 13 / 18        | 400    | Plex Sans         |
| `.t-caption`     | 12 / 16        | 500    | Plex Sans         |
| `.t-amount`      | 15 / 20        | 500    | Plex Mono tabular |
| `.t-amount-lg`   | 26 / 30        | 500    | Plex Mono         |
| `.t-code`        | 14 / 20        | 400    | Plex Mono         |
| `.t-display-num` | 28 / 34        | 500    | Plex Mono         |

Form controls: **≥16px** on phone inputs (Safari zoom). Expressive display is landing + streak hero only. Ledger rows stay compressed via Mono + tight rows, not by shrinking body below 14px.

## Breakpoints

| Surface         | Width                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Tenant / warden | `max-w-[480px]` on phone-first flows; shells may be fluid with `lg:pl-64` |
| Owner           | Fluid + `lg` sidebar                                                      |
| Auth            | `max-w-md`                                                                |
| Min supported   | 320px, no horizontal overflow                                             |

## Recipes

- **Card:** `rounded-[14px] border border-hairline bg-surface p-4` (or `p-5` owner)
- **Control:** `rounded-[10px]`, height 44–48px
- **Sheet:** top radius 24px
- **Hairline:** `border border-hairline` (1px). No `border-2` on meter/hazard fields
- **Primary CTA:** one per viewport, `bg-accent text-white`
- **Loading:** `.pg-shimmer` layout skeletons via `QueryState`
- **Fetching:** `.pg-fetching` 2px bar when TanStack `isFetching`

## Light / dark parity

1. Screenshot 390px + 1280px in both themes
2. Hairline visible on surface vs bg in dark
3. Portal accent readable on buttons
4. Status pills: text + icon, not color alone
5. PWA `theme-color` follows ThemeProvider (`#FAFAF7` / `#15130F`)

## QA (heuristic, before a user session)

Fail the screen if any box is unchecked. Flow protocol: [UX_VALIDATION.md](./UX_VALIDATION.md). **Do not explain the UI during a test** — if you need to, the product failed.

- [ ] **One primary CTA** per viewport (`bg-accent text-white`). Secondary is text or outline, not a second filled button.
- [ ] **Thumb zone:** warden / tenant primary actions sit in the bottom bar or sheet (`ManagerShell` `setAction`, 44×44 min). Do not hide pay / Next in the top third on phone.
- [ ] **Status:** `StatusPill` icon + word; never color-only for paid / overdue / pending.
- [ ] **Type:** headings and large numbers use `.t-*`, not `text-xl` / `text-2xl` (`npm run lint:type`).
- [ ] **Hairline:** 1px `border-hairline`; no `border-2` on field ops forms.
- [ ] **Money:** no optimistic “Paid”; confirming / UTR submitted / owner verifying.
- [ ] **Copy:** glossary words (ledger, passbook, due code). One sentence a stranger could read without the builder in the room.

## Glossary

| Word           | Meaning                           |
| -------------- | --------------------------------- |
| Ledger         | Owner’s dues table                |
| Passbook       | Tenant’s personal dues list       |
| Due code       | `PG-XXXXXX` note for UPI matching |
| Warden         | Manager portal role               |
| Flame / streak | Consecutive on-time rent months   |

Do not mix “invoice / bill / invoice ID” unless quoting a bank.

## Primitives

In-repo cards, `QueryState`, `StatusPill`, `ConfirmDialog`, `AuthLayout`, and `CopyButton`. No shadcn CLI / `components.json` — keep recipes in this file instead of a second component dialect.

## ANTI_SLOP lint

`src/routes/**` and product components must not use `slate-`, `amber-`, `cyan-`, `text-primary`, or raw `#hex`. CI: `npm run lint:palette`.

Display type in those files must use `.t-*`, not `text-xl` / `text-2xl` / `text-3xl`. CI: `npm run lint:type`. Escape hatch: `lint-allow-type` on the line (same idea as `lint-allow-palette`).
