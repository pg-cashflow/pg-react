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
  refunds: PaymentRefundSummary[];
  pending_operation?: PaymentRefundSummary | null;
}

export const getPaymentRefundHistory = (paymentId: string): Promise<PaymentRefundHistory> =>
  apiFetch<PaymentRefundHistory>(`/owner/payments/${paymentId}/refunds`);

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

