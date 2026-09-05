# pg-react — Base44 Dev Environment

Frontend-only Vite 8 + React 19 + Tailwind v4 PWA for a Go API (`pg-go`) that lives in a **separate repo** — it is not in this repository. The PWA renders fully without the backend; API calls fail with a "Cannot reach API" message.

## Run

```
docker compose -f docker-compose.base44.yml up -d
```

- Dev server on host port **3000** (vite on 5173 in-container), live reload via bind mount.
- `vite.config.ts` uses `host: true` + `allowedHosts: true` (required for the preview proxy).
- node_modules lives in a named volume; `npm ci` runs on container start.

## Firebase config

`src/lib/firebase.ts` throws at import time unless all four `VITE_FIREBASE_*` vars exist, so `.env.base44-defaults` ships placeholder values (overridable via Base44 secrets → `/run/base44/app.env`, listed LAST in `env_file` so real values win). With placeholders the UI renders; actual sign-in requires real credentials.

## Backend

`VITE_API_BASE_URL` (default `http://localhost:8080`) points at pg-go, which must be run separately with `CORS_ALLOWED_ORIGINS` including the PWA origin. All amounts are paise. See HANDOFF.md for the API contract.

## Verify

- `curl -sf -H "Host: any.example.com" http://localhost:3000/` returns the app.
- `docker compose -f docker-compose.base44.yml exec -T web npx vitest run` — contract tests (MSW-mocked, no backend needed).

## Code map (quick)

- `src/routes/` — owner (joins/reports/tenants/dues/payments/reconciliation/events/more) and tenant surfaces
- `src/auth/` — Firebase phone/Google auth → Go JWT exchange; `src/lib/firebase.ts` initializes the SDK
- `src/api/client.ts` — fetch wrapper; 401 → logout, "waiting for owner" 403 → join screen
