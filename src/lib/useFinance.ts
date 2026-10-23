import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";
import {
  closeTieOut,
  createCapitalEntry,
  createExpense,
  getBalanceSheet,
  getBudgets,
  getCapitalEntries,
  getCapitalPaybackReport,
  getCashFlowStatement,
  getClearingDriftReport,
  getDepositReserveReport,
  getExpenses,
  getFinanceLedger,
  getFinanceSummary,
  getIncomeStatement,
  getReconcilingItems,
  getTieOutState,
  getTrialBalance,
  getVarianceBridge,
  recordExpensePayment,
  reopenTieOut,
  saveBudget,
  voidExpense,
} from "@/api/finance";
import type {
  CreateCapitalInput,
  CreateExpenseInput,
  ExpensePaymentInput,
  ReopenTieOutInput,
  SaveBudgetInput,
} from "@pg/types";

// -- Summary & Ledger --------------------------------------------------------

export function useFinanceSummary(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeSummary(period),
    queryFn: () => getFinanceSummary(period),
  });
}

export function useFinanceLedger(
  period?: string,
  from?: string,
  to?: string,
  account?: string
) {
  return useQuery({
    queryKey: QUERY_KEYS.financeLedger(period, from, to, account),
    queryFn: () => getFinanceLedger(period, from, to, account),
  });
}

// -- Expenses ----------------------------------------------------------------

export function useExpenses(
  limit = 50,
  beforeOccurredAt?: string,
  beforeId?: string
) {
  return useQuery({
    queryKey: QUERY_KEYS.financeExpenses(beforeOccurredAt, beforeId),
    queryFn: () => getExpenses(limit, beforeOccurredAt, beforeId),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "summary"] });
    },
  });
}

export function useRecordExpensePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseId,
      input,
    }: {
      expenseId: string;
      input: ExpensePaymentInput;
    }) => recordExpensePayment(expenseId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "summary"] });
    },
  });
}

export function useVoidExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseId,
      reason,
    }: {
      expenseId: string;
      reason: string;
    }) => voidExpense(expenseId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "summary"] });
    },
  });
}

// -- Capital -----------------------------------------------------------------

export function useCapitalEntries() {
  return useQuery({
    queryKey: QUERY_KEYS.financeCapital,
    queryFn: getCapitalEntries,
  });
}

export function useCreateCapitalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCapitalInput) => createCapitalEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeCapital });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "summary"] });
    },
  });
}

// -- Budgets -----------------------------------------------------------------

export function useBudgets(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeBudgets(period),
    queryFn: () => getBudgets(period),
  });
}

export function useSaveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveBudgetInput) => saveBudget(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.financeBudgets(variables.period_month),
      });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "budgets"] });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "variance-bridge"] });
    },
  });
}

// -- Tie-out / Close ---------------------------------------------------------

export function useTieOutState(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeTieOut(period),
    queryFn: () => getTieOutState(period),
  });
}

export function useCloseTieOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period?: string) => closeTieOut(period),
    onSuccess: (_data, period) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financeTieOut(period) });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "summary"] });
    },
  });
}

export function useReopenTieOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReopenTieOutInput) => reopenTieOut(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.financeTieOut(variables.period),
      });
      queryClient.invalidateQueries({ queryKey: ["owner", "finance", "summary"] });
    },
  });
}

// -- Statements --------------------------------------------------------------

export function useIncomeStatement(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeIncomeStatement(period),
    queryFn: () => getIncomeStatement(period),
  });
}

export function useBalanceSheet(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeBalanceSheet(period),
    queryFn: () => getBalanceSheet(period),
  });
}

export function useCashFlowStatement(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeCashFlow(period),
    queryFn: () => getCashFlowStatement(period),
  });
}

export function useTrialBalance(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeTrialBalance(period),
    queryFn: () => getTrialBalance(period),
  });
}

// -- Reports -----------------------------------------------------------------

export function useVarianceBridge(period?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeVarianceBridge(period),
    queryFn: () => getVarianceBridge(period),
  });
}

export function useClearingDriftReport() {
  return useQuery({
    queryKey: QUERY_KEYS.financeClearingDrift,
    queryFn: getClearingDriftReport,
  });
}

export function useDepositReserveReport() {
  return useQuery({
    queryKey: QUERY_KEYS.financeDepositReserve,
    queryFn: getDepositReserveReport,
  });
}

export function useCapitalPaybackReport() {
  return useQuery({
    queryKey: QUERY_KEYS.financeCapitalPayback,
    queryFn: getCapitalPaybackReport,
  });
}

export function useReconcilingItems(asOf?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.financeReconcilingItems(asOf),
    queryFn: () => getReconcilingItems(asOf),
  });
}
