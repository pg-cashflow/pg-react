import { apiFetch, apiFetchBlob, unwrapList } from "./client";
import type {
  PayoutPayee,
  PayoutBatch,
  PayoutItem,
  ApprovePayoutBatchInput,
  RequestPayoutBatchOTPResponse,
  PayeeType,
} from "@pg/types";

export interface CreatePayeeInput {
  payee_type: PayeeType;
  name: string;
  phone?: string;
  account_number?: string;
  ifsc?: string;
  bank_name?: string;
  upi_vpa?: string;
}

export const listPayees = async (): Promise<PayoutPayee[]> => {
  const data = await apiFetch<{ payees: PayoutPayee[] }>("/owner/payouts/payees");
  return unwrapList(data, "payees");
};

export const createPayee = async (input: CreatePayeeInput): Promise<PayoutPayee> => {
  const data = await apiFetch<{ payee: PayoutPayee }>("/owner/payouts/payees", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.payee;
};

export const verifyPayee = async (payeeId: string): Promise<PayoutPayee> => {
  const data = await apiFetch<{ payee: PayoutPayee }>(`/owner/payouts/payees/${payeeId}/verify`, {
    method: "POST",
    body: "{}",
  });
  return data.payee;
};

export const listUnbatchedPayoutItems = async (): Promise<PayoutItem[]> => {
  const data = await apiFetch<{ items: PayoutItem[] }>("/owner/payouts/items/unbatched");
  return unwrapList(data, "items");
};

export const listPayoutBatches = async (): Promise<PayoutBatch[]> => {
  const data = await apiFetch<{ batches: PayoutBatch[] }>("/owner/payouts/batches");
  return unwrapList(data, "batches");
};

export const getPayoutBatch = async (
  batchId: string
): Promise<{ batch: PayoutBatch; items: PayoutItem[] }> => {
  return apiFetch<{ batch: PayoutBatch; items: PayoutItem[] }>(`/owner/payouts/batches/${batchId}`);
};

export const createPayoutBatch = async (notes?: string): Promise<{ batch: PayoutBatch; items: PayoutItem[] }> => {
  return apiFetch<{ batch: PayoutBatch; items: PayoutItem[] }>("/owner/payouts/batches", {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
};

export const requestPayoutBatchOTP = async (
  batchId: string
): Promise<RequestPayoutBatchOTPResponse> => {
  return apiFetch<RequestPayoutBatchOTPResponse>(
    `/owner/payouts/batches/${batchId}/approve/request-otp`,
    {
      method: "POST",
      body: "{}",
    }
  );
};

export const approvePayoutBatch = async (
  batchId: string,
  input: ApprovePayoutBatchInput
): Promise<{ batch: PayoutBatch; approval_mode: string }> => {
  return apiFetch<{ batch: PayoutBatch; approval_mode: string }>(
    `/owner/payouts/batches/${batchId}/approve`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
};

export const dispatchPayoutBatch = async (
  batchId: string
): Promise<{ batch: PayoutBatch; items: PayoutItem[] }> => {
  return apiFetch<{ batch: PayoutBatch; items: PayoutItem[] }>(
    `/owner/payouts/batches/${batchId}/dispatch`,
    {
      method: "POST",
      body: "{}",
    }
  );
};

export const exportPayoutBatchCSV = async (batchId: string): Promise<Blob> => {
  return apiFetchBlob(`/owner/payouts/batches/${batchId}/export`);
};
