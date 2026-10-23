import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import {
  listPayees,
  createPayee,
  verifyPayee,
  listUnbatchedPayoutItems,
  listPayoutBatches,
  getPayoutBatch,
  createPayoutBatch,
  requestPayoutBatchOTP,
  approvePayoutBatch,
  dispatchPayoutBatch,
  type CreatePayeeInput,
} from "@/api/payouts";
import type { ApprovePayoutBatchInput } from "@pg/types";

export function usePayees() {
  return useQuery({
    queryKey: QUERY_KEYS.payoutPayees,
    queryFn: listPayees,
  });
}

export function useCreatePayee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePayeeInput) => createPayee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutPayees });
    },
  });
}

export function useVerifyPayee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payeeId: string) => verifyPayee(payeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutPayees });
    },
  });
}

export function useUnbatchedPayoutItems() {
  return useQuery({
    queryKey: QUERY_KEYS.unbatchedPayoutItems,
    queryFn: listUnbatchedPayoutItems,
  });
}

export function usePayoutBatches() {
  return useQuery({
    queryKey: QUERY_KEYS.payoutBatches,
    queryFn: listPayoutBatches,
  });
}

export function usePayoutBatch(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.payoutBatch(id),
    queryFn: () => getPayoutBatch(id),
    enabled: Boolean(id),
  });
}

export function useCreatePayoutBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notes?: string) => createPayoutBatch(notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unbatchedPayoutItems });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutBatches });
    },
  });
}

export function useRequestPayoutBatchOTP() {
  return useMutation({
    mutationFn: (batchId: string) => requestPayoutBatchOTP(batchId),
  });
}

export function useApprovePayoutBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, input }: { batchId: string; input: ApprovePayoutBatchInput }) =>
      approvePayoutBatch(batchId, input),
    onSuccess: (_, { batchId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutBatches });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutBatch(batchId) });
    },
  });
}

export function useDispatchPayoutBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => dispatchPayoutBatch(batchId),
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutBatches });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payoutBatch(batchId) });
    },
  });
}
