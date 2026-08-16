# pg-react — Frontend Handoff

Generated against pg-go CONTRACT Rev 6. The Go API is canonical. This PWA adapts to it.

## What this app is

Vite 8 + React 19 + Tailwind v4 PWA. Two authenticated surfaces plus a pending-join wait screen.

| Surface        | When                             | Routes                                                                                |
| -------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| Invite / login | no JWT                           | `/`, `/login`                                                                         |
| Join wait      | `role=tenant` and no `tenant_id` | `/join`                                                                               |
| Owner          | `role=owner`                     | `/owner/joins` (home), reports, tenants, dues, payments, reconciliation, events, more |
| Tenant         | `role=tenant` with `tenant_id`   | `/tenant`, `/tenant/dues`, `/tenant/payments`                                         |

Magic-link `GET /p/:token` stays on pg-go. Do not add a React route for it.

## Auth

Firebase Phone OTP or Google (Google must have a linked phone) → `POST /auth/firebase` with optional `invite_code` → 30-day app JWT in `localStorage` (`pg_jwt` + `pg_user`).

Pending tenants must not call `/tenant/*` (403 `"waiting for owner to assign room and rent"`). After owner activate, tap Continue on `/join` to `getIdToken(true)` and exchange again so the JWT includes `tenant_id`.

Vacated tenants: 403 `"access revoked"` logs out.

## Money

All API amounts are **paise**. Convert ₹ → paise only on submit with `rupeesToPaise`. Display with `formatPaise`.

Cash is all-or-nothing against remaining `due.amount`.

## Pay

`GET /{owner|tenant}/dues/:id/pay` is the only pay entry.

- `mode=manual`: VPA, `upi_link`, PNG at `qr_png_url`, copy note `PG-XXXXXX`
- `mode=cashfree`: Cashfree.js with `payment_session_id`; `VITE_CASHFREE_ENV` must match server `CASHFREE_ENV`. Personal QR returns 409.
- `payable=false`: hide pay

## Owner home

Join queue is default. Walk-in `POST /owner/tenants` is under More.

## Env

```
VITE_API_BASE_URL=http://localhost:8080
VITE_FIREBASE_*
VITE_CASHFREE_ENV=sandbox
```

Open the PWA at `http://127.0.0.1:5173`. pg-go `CORS_ALLOWED_ORIGINS` must include that origin.

## Invariants

1. Do not change Go routes to match old frontend guesses.
2. No optimistic updates on financial mutations.
3. VPA never shown except from `/pay` JSON.
4. No Owner vs Tenant role picker on login.

## Local E2E (seed)

1. pg-go: `CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173`, `go run ./cmd/server/`
2. pg-react: `npm run dev` at `http://127.0.0.1:5173`
3. Owner: Firebase test phone `+918008281429` → `/owner/joins`
4. Tenant: invite `DEVINV01` → wait → owner activate (₹ rent, due day 1–28) → Continue (re-exchange token) → pay
5. Manual pay: copy VPA / note / UTR report → owner confirm
6. Walk-in + cash (full remaining) and CSV import live under More

`/app/` on the Go server is not the production client.
