import { apiFetch, unwrapList } from "./client";
import type {
  DailySettlementBalance,
  ImportResult,
  MatchedBy,
  Payment,
  ReconciliationSummary,
} from "@pg/types";

export const getPayments = async (matchedBy?: MatchedBy): Promise<Payment[]> => {
  const qs = matchedBy ? `?matched_by=${matchedBy}` : "";
  const data = await apiFetch<{ payments: Payment[] }>(`/owner/payments${qs}`);
  return unwrapList(data, "payments");
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

