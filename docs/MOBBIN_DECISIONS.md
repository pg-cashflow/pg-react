# Mobbin Sketch log

Mobbin MCP in this environment returned **paid plan required**. Queries below are the cookbook; **Adopt** lists the IA we take from public pattern docs + the Base44 visual spec, not invented Mobbin URLs.

## Chunk 0 — Empty / error

- **PG route:** QueryState (all portals)
- **Query:** `empty state illustration with primary action button`
- **References:** Material 3 empty states; Apple HIG loading
- **Adopt:** Layout-matched shimmer; retry CTA on error; role-specific next step on empty
- **Reject:** Centered generic spinner; decorative illustrations
- **Maps to:** `src/components/shared/QueryState.tsx`

## Chunk 2 — Pay sheet

- **PG route:** `/tenant/dues` + PayPanel
- **Query:** `UPI payment bottom sheet with amount copy and payment reference or note field`
- **Adopt:** Amount + VPA + due-code copy before CTA; explicit “UTR submitted” wait (no optimistic paid)
- **Reject:** Dark neon wallets; 3-tab checkout
- **Maps to:** `PayPanel.tsx`, `DuePaymentTimeline.tsx`

## Chunk 3 — Ledger

- **PG route:** `/owner/dues`
- **Query:** `billing invoice list table with status badges and row actions`
- **Adopt:** Dense rows, status pills, filter chips, overdue tint, CSV export
- **Reject:** Spreadsheet chrome, rainbow badges
- **Maps to:** `src/routes/owner/dues.tsx`

## Chunk 3c — Reminders

- **PG route:** `/owner/reminders`
- **Query:** `scheduled notifications list with send now button and date`
- **Adopt:** Scheduled vs sent; due-date − 3 days; Send now via WhatsApp token
- **Reject:** Email-only marketing sequences
- **Maps to:** `src/routes/owner/reminders.tsx`

## Chunk 4 — Inspection stepper

- **PG route:** `/manager/inspections/new`
- **Query:** `field inspection checklist pass fail with photo attachment per item`
- **Adopt:** One item per step; fail opens camera; bottom primary Next/Submit
- **Reject:** Long single form of all items
- **Maps to:** `src/routes/manager/inspection-new.tsx`

## Chunk 1 — Landing

- **PG route:** `/landing`
- **Query:** `hero section with product value proposition and CTA buttons`
- **Adopt:** Wordmark, three portals, six records, join/sign-in CTAs
- **Reject:** Stock SaaS gradient mesh
- **Maps to:** `src/routes/landing.tsx`
