# ADR-017: Cashfree Web Checkout for Tenant Rent Payment

**Status:** Accepted

## Context
Rent collection uses Cashfree as the primary online payment gateway. The backend (`pg-go`) creates and reuses orders with 10-minute validity and singleflight concurrency control. The backend verifies HMAC webhooks and updates the ledger.

The initial frontend implementation had several critical gaps:
1. It used `_self` redirection, which broke Single Page Application (SPA) state.
2. It ignored the Cashfree SDK promise response.
3. It hid the manual UTR and receipt upload fallback when the property was in Cashfree mode.
4. It lacked verification and status observation workflows.

## Decision

We select **Modal Checkout (`redirectTarget: "_modal"`)** with server ledger observation:

1. **Evaluation Order for Cashfree SDK Response:**
   The SDK result object can contain multiple properties. The helper evaluates outcomes in strict precedence order:
   - First: `result.paymentDetails` $\rightarrow$ triggers immediate verification and polling (`CONFIRMING`).
   - Second: `result.redirect` $\rightarrow$ triggers navigation to return URL (`REDIRECTING`).
   - Third: `result.error` $\rightarrow$ triggers ledger check before dismissal (`CHECKING`).

2. **Immediate Verification with Polling Backstop:**
   When the SDK returns `paymentDetails`, the client immediately calls `POST /tenant/dues/:id/pay/verify`.
   - If the endpoint returns `paid: true`, the flow transitions immediately to `PAID`.
   - If the endpoint returns 404 (endpoint not yet deployed), the hook ignores the error and relies on dues polling.
   - If the transaction is still pending at the gateway, the client polls `GET /tenant/dues` every 2s for up to 60s.
   - If 60s elapse without confirmation, the flow transitions to `STILL_PENDING`.

3. **Ledger Decides All Outcomes (No Synthetic Client Approvals):**
   - On SDK `result.error`: Polling continues for ~10s (`CHECKING`). If unpaid after 10s, return quietly to `READY` without showing an error banner (treated as modal close).
   - On manual proof upload HTTP 409: The client does not assume the due is paid. If the error is `duplicate utr`, display the error message. If the error is `already recorded`, refresh `QUERY_KEYS.tenantDues` and let the server status dictate whether the due is `PAID`.
   - For `payable: false`: Display `"Already paid or waived"` to accurately reflect both terminal states.

4. **Return URL Safety Net:**
   In environments where popups cannot open (e.g., in-app WebViews like WhatsApp), the SDK executes the redirect path.
   - `pg-go` configures `order_meta.return_url` as:
     `/tenant/pay-return?order_id={order_id}&due_id={due_id}`
   - The route `/tenant/pay-return` lives under `RequireTenant`. It reads `due_id`, polls the due status, and navigates back to `/tenant/dues`.
   - Public magic links (`/p/:token`) remain server-rendered HTML pages in `pg-go` and handle their own unauthenticated redirects.

5. **Backend Verification Safeguards (`pg-go` Contract):**
   - Verify caller tenant ownership and due ID match the order ID.
   - Require `order_status == "PAID"` from Cashfree and verify `order_amount` matches `due.amount`.
   - Apply payment through the exact same idempotent ledger transaction used by the webhook handler.
   - Rate limit verification requests per due ID to protect upstream Cashfree rate limits.

## State Machine

```
READY ──tap Pay──▶ OPENING (fetch intent, payable?) ──▶ CHECKOUT_OPEN
CHECKOUT_OPEN ──promise──▶
   paymentDetails  → CONFIRMING (call verify immediately; poll dues 2s, up to 60s)
   error           → CHECKING   (poll dues up to 10s; if unpaid → READY)
   redirect        → REDIRECTING (navigate to return_url)

CHECKING   ──paid→ PAID | timeout (10s)→ READY (quiet dismissal)
CONFIRMING ──paid→ PAID | timeout (60s)→ STILL_PENDING

STILL_PENDING ──Check again (re-verify & poll)──▶ CONFIRMING
STILL_PENDING ──Submit screenshot──▶ PROOF_UPLOAD
```

## Consequences

- **Positive:** Immediate verification eliminates waiting when webhooks are delayed.
- **Positive:** Graceful degradation: client works seamlessly via dues polling even before the backend `verify` route deploys.
- **Positive:** Zero risk of false payment claims from duplicate UTR submissions.
- **Positive:** SPA state is preserved for tenants.
- **Trade-off:** Client must handle intermediate states (`CHECKING`, `CONFIRMING`) before settling.
