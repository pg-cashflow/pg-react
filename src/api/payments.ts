import { apiFetch, unwrapList } from "./client";
import type {
  DailySettlementBalance,
  GatewayRefund,
  ImportResult,
  MatchedBy,
  OwnerRefundInput,
  Payment,
  ReconciliationSummary,
} from "@pg/types";

export const getPayments = async (matchedBy?: MatchedBy): Promise<Payment[]> => {
  const qs = matchedBy ? `?matched_by=${matchedBy}` : "";
  const data = await apiFetch<{ payments: Payment[] }>(`/owner/payments${qs}`);
  return unwrapList(data, "payments");
};

export const requestRefundOTP = (paymentId: string): Promise<{ channel: string; destination: string }> =>
  apiFetch(`/owner/payments/${paymentId}/refund/request-otp`, { method: "POST", body: "{}" });

export interface PaymentRefundSummary {
  id: string;
  refund_reference?: string;
  amount_paise: number;
  status: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRefundHistory {
  payment_id: string;
  original_amount_paise: number;
  refunded_amount_paise: number;
  reserved_amount_paise: number;
  remaining_refundable_paise: number;
  refund_eligible: boolean;
  refund_window_days: number;
  refunds: PaymentRefundSummary[];
  pending_operation?: PaymentRefundSummary | null;
}

export const getPaymentRefundHistory = (paymentId: string): Promise<PaymentRefundHistory> =>
  apiFetch<PaymentRefundHistory>(`/owner/payments/${paymentId}/refunds`);

export interface RefundApprovalDecision {
  approver_id: string;
  approver_role: string;
  approved_at: string;
  note?: string;
}

export interface RefundApprovalRequest {
  id: string;
  property_id: string;
  payment_id: string;
  tenant_id: string;
  amount_paise: number;
  reason: string;
  idempotency_key: string;
  requested_by: string;
  requested_by_role: string;
  status: "pending" | "partially_approved" | "approved" | "rejected" | "dispatched" | "cancelled";
  required_approvals: number;
  approvals: RefundApprovalDecision[];
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  refund_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const listRefundApprovalRequests = (
  status?: string
): Promise<{ refund_requests: RefundApprovalRequest[] }> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ refund_requests: RefundApprovalRequest[] }>(`/owner/refund-requests${query}`);
};

export const createRefundApprovalRequest = (
  paymentId: string,
  input: { amount_paise: number; reason: string },
  idempotencyKey?: string
): Promise<{ message: string; refund_request: RefundApprovalRequest }> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }
  return apiFetch<{ message: string; refund_request: RefundApprovalRequest }>(
    `/owner/payments/${paymentId}/refund/requests`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    }
  );
};

export const approveRefundApprovalRequest = (
  requestId: string,
  input?: { note?: string; otp?: string }
): Promise<{ message: string; refund_request: RefundApprovalRequest }> => {
  return apiFetch<{ message: string; refund_request: RefundApprovalRequest }>(
    `/owner/refund-requests/${requestId}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input || {}),
    }
  );
};

export const rejectRefundApprovalRequest = (
  requestId: string,
  reason: string
): Promise<{ message: string; refund_request: RefundApprovalRequest }> => {
  return apiFetch<{ message: string; refund_request: RefundApprovalRequest }>(
    `/owner/refund-requests/${requestId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
};

export const refundPayment = async (
  paymentId: string,
  input: OwnerRefundInput,
  idempotencyKey?: string
): Promise<GatewayRefund> => {
  const key =
    idempotencyKey ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const res = await apiFetch<GatewayRefund | { message: string; refund: GatewayRefund }>(
    `/owner/payments/${paymentId}/refund`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": key,
      },
      body: JSON.stringify(input),
    }
  );

  if (res && typeof res === "object" && "refund" in res && res.refund) {
    return res.refund;
  }
  return res as GatewayRefund;
};

export const getReconciliation = (period?: string): Promise<ReconciliationSummary> => {
  const qs = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<ReconciliationSummary>(`/owner/reconciliation${qs}`);
};

export const importStatements = (file: File): Promise<ImportResult> => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/owner/statements/import", { method: "POST", body: fd });
};

export const getDailySettlementBalance = (date?: string): Promise<DailySettlementBalance> => {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<DailySettlementBalance>(`/owner/settlements/eod-balance${qs}`);
};

export const runDailySettlementBalance = (date?: string): Promise<DailySettlementBalance> => {
  return apiFetch<DailySettlementBalance>("/owner/settlements/eod-balance/run", {
    method: "POST",
    body: JSON.stringify(date ? { date } : {}),
  });
};

export const getDailySettlementHistory = async (
  limit = 30
): Promise<DailySettlementBalance[]> => {
  const data = await apiFetch<{ balances: DailySettlementBalance[]; total: number }>(
    `/owner/settlements/eod-balance/history?limit=${limit}`
  );
  return data.balances || [];
};

