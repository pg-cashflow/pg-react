import { apiFetch, unwrapList } from "./client";
import type { ImportResult, MatchedBy, Payment, ReconciliationSummary } from "@pg/types";

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
