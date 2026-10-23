import { apiFetch, unwrapList } from "./client";
import type {
  BalanceSheetResponse,
  Budget,
  CapitalPaybackReport,
  CapitalTransaction,
  CashFlowStatementResponse,
  ClearingDriftReport,
  CreateCapitalInput,
  CreateExpenseInput,
  DepositReserveReport,
  Expense,
  ExpensePaymentInput,
  FinanceSummaryResponse,
  IncomeStatementResponse,
  PeriodTieOut,
  ReconcilingItem,
  ReopenTieOutInput,
  SaveBudgetInput,
  TrialBalanceResponse,
  VarianceBridge,
} from "@pg/types";

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// -- Summary & Ledger --------------------------------------------------------

export const getFinanceSummary = (period?: string): Promise<FinanceSummaryResponse> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<FinanceSummaryResponse>(`/owner/finance/summary${query}`);
};

export const getFinanceLedger = (
  period?: string,
  from?: string,
  to?: string,
  account?: string
): Promise<{ entries: unknown[] }> => {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (account) params.set("account", account);
  const qs = params.toString();
  return apiFetch<{ entries: unknown[] }>(`/owner/finance/ledger${qs ? `?${qs}` : ""}`);
};

// -- Expenses ----------------------------------------------------------------

export interface ListExpensesResponse {
  expenses: Expense[];
  next_cursor: string | null;
  next_cursor_id: string | null;
}

export const getExpenses = (
  limit = 50,
  beforeOccurredAt?: string,
  beforeId?: string
): Promise<ListExpensesResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeOccurredAt) params.set("before_occurred_at", beforeOccurredAt);
  if (beforeId) params.set("before_id", beforeId);
  return apiFetch<ListExpensesResponse>(`/owner/finance/expenses?${params.toString()}`);
};

export const createExpense = (
  input: CreateExpenseInput
): Promise<{ expense: Expense; approval?: unknown }> =>
  apiFetch<{ expense: Expense; approval?: unknown }>("/owner/finance/expenses", {
    method: "POST",
    headers: {
      "Idempotency-Key": createIdempotencyKey(),
    },
    body: JSON.stringify(input),
  });

export const recordExpensePayment = (
  expenseId: string,
  input: ExpensePaymentInput
): Promise<{ payment: unknown }> =>
  apiFetch<{ payment: unknown }>(`/owner/finance/expenses/${expenseId}/payments`, {
    method: "POST",
    headers: {
      "Idempotency-Key": createIdempotencyKey(),
    },
    body: JSON.stringify(input),
  });

export const voidExpense = (
  expenseId: string,
  reason: string
): Promise<{ expense: Expense }> =>
  apiFetch<{ expense: Expense }>(`/owner/finance/expenses/${expenseId}/void`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// -- Capital -----------------------------------------------------------------

export const getCapitalEntries = async (): Promise<CapitalTransaction[]> => {
  const data = await apiFetch<{ capital: CapitalTransaction[] }>("/owner/finance/capital");
  return unwrapList(data, "capital");
};

export const createCapitalEntry = (
  input: CreateCapitalInput
): Promise<{ capital: CapitalTransaction }> =>
  apiFetch<{ capital: CapitalTransaction }>("/owner/finance/capital", {
    method: "POST",
    headers: {
      "Idempotency-Key": createIdempotencyKey(),
    },
    body: JSON.stringify(input),
  });

// -- Budgets -----------------------------------------------------------------

export const getBudgets = async (period?: string): Promise<Budget[]> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  const data = await apiFetch<{ budgets: Budget[] }>(`/owner/finance/budgets${query}`);
  return unwrapList(data, "budgets");
};

export const saveBudget = (input: SaveBudgetInput): Promise<{ budget: Budget }> =>
  apiFetch<{ budget: Budget }>("/owner/finance/budgets", {
    method: "POST",
    body: JSON.stringify(input),
  });

// -- Tie-out / Close ---------------------------------------------------------

export const getTieOutState = (
  period?: string
): Promise<{ tie_out: PeriodTieOut; label: string }> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<{ tie_out: PeriodTieOut; label: string }>(`/owner/finance/tie-out${query}`);
};

export const closeTieOut = (period?: string): Promise<{ tie_out: PeriodTieOut }> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<{ tie_out: PeriodTieOut }>(`/owner/finance/tie-out/close${query}`, {
    method: "POST",
  });
};

export const reopenTieOut = (
  input: ReopenTieOutInput
): Promise<{ tie_out: PeriodTieOut; status: string }> =>
  apiFetch<{ tie_out: PeriodTieOut; status: string }>("/owner/finance/tie-out/reopen", {
    method: "POST",
    body: JSON.stringify(input),
  });

// -- Statements --------------------------------------------------------------

export const getIncomeStatement = (period?: string): Promise<IncomeStatementResponse> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<IncomeStatementResponse>(`/owner/finance/statements/income-statement${query}`);
};

export const getBalanceSheet = (period?: string): Promise<BalanceSheetResponse> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<BalanceSheetResponse>(`/owner/finance/statements/balance-sheet${query}`);
};

export const getCashFlowStatement = (period?: string): Promise<CashFlowStatementResponse> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<CashFlowStatementResponse>(`/owner/finance/statements/cash-flow${query}`);
};

export const getTrialBalance = (period?: string): Promise<TrialBalanceResponse> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<TrialBalanceResponse>(`/owner/finance/statements/trial-balance${query}`);
};

// -- Reports -----------------------------------------------------------------

export const getVarianceBridge = (
  period?: string
): Promise<{ variance_bridge: VarianceBridge; label: string }> => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch<{ variance_bridge: VarianceBridge; label: string }>(
    `/owner/finance/variance-bridge${query}`
  );
};

export const getClearingDriftReport = (): Promise<ClearingDriftReport> =>
  apiFetch<ClearingDriftReport>("/owner/finance/reports/clearing-drift");

export const getDepositReserveReport = (): Promise<DepositReserveReport> =>
  apiFetch<DepositReserveReport>("/owner/finance/reports/deposit-reserve");

export const getCapitalPaybackReport = (): Promise<CapitalPaybackReport> =>
  apiFetch<CapitalPaybackReport>("/owner/finance/reports/capital-payback");

export const getReconcilingItems = (
  asOf?: string
): Promise<{ as_of: string; items: ReconcilingItem[] }> => {
  const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : "";
  return apiFetch<{ as_of: string; items: ReconcilingItem[] }>(
    `/owner/finance/reconciling-items${query}`
  );
};
