import { apiFetch, unwrapList } from "./client";
import type { Payment, PaymentReport, PaymentReportStatus } from "@pg/types";

export const getPaymentReports = async (
  status?: PaymentReportStatus
): Promise<PaymentReport[]> => {
  const qs = status ? `?status=${status}` : "";
  const data = await apiFetch<{ payment_reports: PaymentReport[] }>(
    `/owner/payment-reports${qs}`
  );
  return unwrapList(data, "payment_reports");
};

export const confirmPaymentReport = (
  id: string
): Promise<{ report: PaymentReport; payment: Payment }> =>
  apiFetch(`/owner/payment-reports/${id}/confirm`, { method: "POST", body: "{}" });

export const rejectPaymentReport = (
  id: string,
  note?: string
): Promise<PaymentReport> =>
  apiFetch(`/owner/payment-reports/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ note: note ?? "" }),
  });
