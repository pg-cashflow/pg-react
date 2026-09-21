# UX session log

Protocol: [UX_VALIDATION.md](./UX_VALIDATION.md). First pass **2026-09-16** is a **heuristic / IA walk** of the shipped routes (no live stranger). Treat findings as hypotheses until a silent session confirms them.

## Session T1 — Tenant pay + UTR (heuristic)

| Field           | Notes                                                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey         | T1 — Rent is due, pay and prove it                                                                                                                                                                 |
| Prediction      | First tap: bottom **Pay**                                                                                                                                                                          |
| Observed (code) | Bottom nav label **Pay** maps to `/tenant/payments` (history). Actual pay is **Dues** → inline **Pay** → `PayPanel`.                                                                               |
| Pauses          | Due row shows `due_code` + date, not a sentence like “₹8,500 due 5 Sep” until `AmountBadge` / `formatDueSentence` elsewhere. Expand/collapse **Pay** is a text link, not a 44px bar.               |
| Wrong path      | **Pay** tab is the product they built; **Dues** is the product they designed.                                                                                                                      |
| Urges to speak  | High: “Pay is not where you pay.”                                                                                                                                                                  |
| Outcome         | Predicted fail for first-time mobile tenant                                                                                                                                                        |
| IA change       | **Applied 2026-09-16:** bottom/sidebar tab **Pay** / **Payments** → **Passbook** (`/tenant/payments` unchanged). Dues **Pay** is a full-width 44px CTA. **Re-test live** with a first-time tenant. |

Related: `TenantBottomNav`, `TenantSidebar`, `src/routes/tenant/dues.tsx`, `PayPanel`.

## Session J1 — Join / activation (heuristic)

| Field          | Notes                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Journey        | J1 — Join this PG                                                                                                                      |
| Prediction     | Invite → OTP → form → wait is linear                                                                                                   |
| Observed       | `/join` is KYC + waiting room in one route. Activation celebration (`/activation`) is a peak-end screen after owner assign + continue. |
| Pauses         | Dense KYC fieldset; Aadhaar upload; pending copy vs “Continue” after owner acts (token refresh is invisible).                          |
| Wrong path     | Returning user may retry `/` invite instead of `/login`.                                                                               |
| Urges to speak | Medium: “You’re waiting because the owner hasn’t assigned a room.”                                                                     |
| Outcome        | Completable if invite + OTP work; pending state needs a single sentence that matches `pending_allocation`                              |
| IA change      | Keep wait state copy identical on dues (`Pay unlocks after…`) and join.                                                                |

Related: `src/routes/join.tsx`, `src/routes/activation.tsx`, `HANDOFF` identity § `isPendingJoin`.

## Session W2 — Inspection stepper (heuristic)

| Field          | Notes                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey        | W2 — Room inspection                                                                                                                              |
| Prediction     | Bottom **Next** enables after Pass                                                                                                                |
| Observed       | `stepReady` includes item state; Pass/Fail half-width; fail allows **photo or notes** (`itemReady`). HANDOFF says photo is **mandatory** on fail. |
| Pauses         | Step 0 (scope: room/floor/bathroom) before first checklist item — extra screen vs “start walking.”                                                |
| Wrong path     | Submit from review without realizing a fail had notes-only (weaker evidence).                                                                     |
| Urges to speak | Medium: “Fail needs a photo.”                                                                                                                     |
| Outcome        | Stepper + `ManagerShell` action bar matches thumb-zone heuristic; evidence rule is split between docs and UI                                      |
| IA change      | Align fail rule: camera required, notes optional — or change HANDOFF.                                                                             |

Related: `src/routes/manager/inspection-new.tsx`, `useManagerAction`.

## Session O2 — Owner UTR verify (heuristic)

| Field          | Notes                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Journey        | O2 — Match a UPI screenshot                                                                                                        |
| Prediction     | Bottom **UTRs**                                                                                                                    |
| Observed       | Owner `BottomNav`: Home, Dues, **UTRs**, Tenants, More. **Payments** and **Reminders** sit under More. Desktop sidebar may differ. |
| Pauses         | Dues vs UTRs vs Payments — three money lists.                                                                                      |
| Wrong path     | Owner opens **Dues** to “confirm payment” (ledger) instead of **UTRs** (reports).                                                  |
| Urges to speak | Medium: “The screenshot queue is UTRs, not Dues.”                                                                                  |
| Outcome        | Label **UTRs** is domain-accurate; first-time owner may still not know the word                                                    |
| IA change      | Subtitle on UTRs: “Slips waiting for you.” Deep link from due row → events already planned.                                        |

## Next live sessions (do not skip)

Sit one tenant, one owner, one warden. Same sheets. **Say nothing.** Replace this heuristic with dated live rows.
