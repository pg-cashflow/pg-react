# PG Cashflow — UX validation

**Polish is not clarity.** Tokens and `lint:palette` keep the surface trustworthy. This document is how we check whether a **stranger** can finish the job without us narrating.

Related: [CRAFT.md](./CRAFT.md) (fast vs slow lanes), [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (constraints), [BRAND_VOICE.md](./BRAND_VOICE.md) (copy), [HANDOFF.md](../HANDOFF.md) §5 (API steps). Session logs: [UX_SESSIONS.md](./UX_SESSIONS.md).

## Two jobs

| Job             | Question                       | Evidence                                     |
| --------------- | ------------------------------ | -------------------------------------------- |
| Visual / system | Does it look like one product? | Design tokens, `.t-*`, palette CI            |
| Interaction     | Does the flow stand up cold?   | Journeys below, silent sessions, wrong paths |

A passing palette lint is **not** “UX done.”

## Critical journeys (user language)

Chart **reason to open → taps to done**. Route names are for builders only; **do not say them in a test**.

### Tenant

| ID  | Job                            | Happy path                                                                          | Routes (internal)                                            | Likely blocks                                               |
| --- | ------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| T1  | Rent is due — pay and prove it | Home or Dues → open due → Pay → UPI/Cashfree → submit UTR → see “waiting for owner” | `/tenant`, `/tenant/dues` (`PayPanel`, `DuePaymentTimeline`) | Pending allocation; missing UPI app; 12-digit UTR           |
| T2  | Did the owner get my money?    | Open **Passbook** — status without calling                                          | `/tenant/payments`, dashboard                                | History only; pay is on **Dues** (T1 IA applied 2026-09-16) |

### Owner

| ID  | Job                           | Happy path                                           | Routes                            | Likely blocks                                    |
| --- | ----------------------------- | ---------------------------------------------------- | --------------------------------- | ------------------------------------------------ |
| O1  | Who hasn’t paid? Nudge them   | Ledger → open due or Reminders → Send now (WhatsApp) | `/owner/dues`, `/owner/reminders` | Phone missing; reminders under **More** on phone |
| O2  | Someone sent a UPI screenshot | UTRs / reports → confirm or reject                   | `/owner/reports`                  | Bottom nav **UTRs** vs **Payments** vs **Dues**  |
| O3  | New person wants a bed        | Joins → KYC → room + rent + due day → activate       | `/owner/joins`                    | Incomplete KYC; no rooms                         |

### Public / join

| ID  | Job          | Happy path                                                    | Routes                                | Likely blocks                                       |
| --- | ------------ | ------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| J1  | Join this PG | Invite code → OTP → KYC → wait → continue after owner assigns | `/`, `/login`, `/join`, `/activation` | Pending `tenant_id`; “Continue” needs token refresh |

### Warden

| ID  | Job                   | Happy path                                                                 | Routes                     | Likely blocks                                                      |
| --- | --------------------- | -------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| W1  | Morning kitchen count | Open kitchen → read numbers (or submit if that day’s flow)                 | `/manager/kitchen`         | Property id missing                                                |
| W2  | Room inspection       | New inspection → scope → one item at a time → fail needs evidence → submit | `/manager/inspections/new` | Bottom **Next** disabled until `stepReady`; photo vs notes on fail |

Minimum taps and API gates live in HANDOFF workflows A/B/C. Update this table if IA changes (nav labels, default landing).

## Silent-test protocol (moderated)

1. **One task** from the table, spoken in user language (“Pay this month’s rent and tell me when you’re done”).
2. **Write a prediction** (one line) _before_ they start — what you think they will tap first.
3. **Say nothing.** Count urges to speak. Every urge is a comprehension gap.
4. Log **pauses** (cursor / thumb hesitation), not only questions or errors.
5. A **wrong path is a finding**, not user error. They are showing the product you built.
6. After they finish (or give up): “What did you expect here?” “How would you normally do this?” Do **not** defend the design.
7. Domain facts (what a UTR is) may get **one** clarification. UI how-to gets **zero**.

Do not run this on people who built the screen. Prefer someone who tried the product and stopped.

### Prediction sheet (copy per session)

```
Date:
Portal / journey ID:
Participant (role, first time? y/n):
Task in their words:
Prediction (one line):
First tap:
Pauses (screen + what they were looking at):
Wrong paths:
Urges to speak (count):
Outcome: success / success with help / fail
What they expected:
IA change (if any) — not a tooltip:
```

## Heuristic pass (before a live user)

Use [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) § QA. Fail the pass if:

- More than one primary CTA competes on the same viewport
- Primary action is outside the thumb zone on phone (warden bottom bar is the pattern)
- Status is color-only
- You cannot complete the journey without explaining a label

## AI as critic (not as fan)

Do **not** ask a model if the flow is good. Paste a journey + screenshot or component tree and use:

```
You are reviewing PG Cashflow, an Indian PG rent ledger (tenant / owner / warden).
Do not praise. Do not suggest more polish or new colors.
Give the strongest case that a first-time [tenant|owner|warden] fails this task:
[task in user language]
Screens / nav labels: [list]
List: (1) first-tap mistakes, (2) pauses, (3) IA fixes (rename, move, default route) — no tooltips.
```

Opposite instruction, same model. Still **not a user**. It cannot be confused.

## Success

- Stranger completes T1, O2, J1, W2 without you speaking (or ≤1 domain clarification).
- Pause count on the prediction sheet drops session over session.
- Wrong paths change **labels, landing, or cross-links** — not more copy on the same wrong screen.
