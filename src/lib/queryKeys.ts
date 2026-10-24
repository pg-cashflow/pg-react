export const QUERY_KEYS = {
  tenants: ["tenants"] as const,
  tenant: (id: string) => ["tenants", id] as const,
  dues: (tenantId?: string) => (tenantId ? (["dues", tenantId] as const) : (["dues"] as const)),
  due: (id: string) => ["dues", "detail", id] as const,
  payments: (tenantId?: string) =>
    tenantId ? (["payments", tenantId] as const) : (["payments"] as const),
  reconciliation: (period?: string) =>
    period ? (["reconciliation", period] as const) : (["reconciliation"] as const),
  events: ["events"] as const,
  joinRequests: ["owner", "join-requests"] as const,
  slotInvites: (status?: string) =>
    status ? (["owner", "slot-invites", status] as const) : (["owner", "slot-invites"] as const),
  ownerOccupancy: ["owner", "occupancy"] as const,
  paymentReports: ["owner", "payment-reports"] as const,
  properties: ["owner", "properties"] as const,
  cashfreeReadiness: ["owner", "settings", "cashfree-readiness"] as const,
  tenantDues: ["tenant", "dues"] as const,
  tenantPayments: ["tenant", "payments"] as const,
  tenantProfile: ["tenant", "me"] as const,
  joinMe: ["join", "me"] as const,
  preferences: ["me", "preferences"] as const,
  locales: ["locales"] as const,
  sessions: ["auth", "sessions"] as const,

  // Gamification & Operations
  tenantPoints: ["tenant", "points"] as const,
  tenantRewards: ["tenant", "rewards"] as const,
  tenantInspections: ["tenant", "inspections"] as const,
  tenantMealRSVP: ["tenant", "meal-rsvp"] as const,
  tenantMenuPoll: ["tenant", "menu-poll"] as const,
  tenantViolations: ["tenant", "violations"] as const,
  tenantLeaderboard: ["tenant", "leaderboard"] as const,
  tenantReferrals: ["tenant", "referrals"] as const,

  // Manager Keys
  managerHeadcount: (propertyId: string, date?: string) =>
    ["manager", "headcount", propertyId, date || "today"] as const,
  managerInspections: (propertyId: string) => ["manager", "inspections", propertyId] as const,
  managerHazards: (propertyId: string, status?: string) =>
    ["manager", "hazards", propertyId, status || "all"] as const,

  // Owner Facility & Settings
  ownerGamificationSettings: (propertyId: string) =>
    ["owner", "gamification-settings", propertyId] as const,
  ownerFloors: (propertyId: string) => ["owner", "floors", propertyId] as const,
  ownerRooms: (propertyId: string) => ["owner", "rooms", propertyId] as const,
  ownerManagers: (propertyId: string) => ["owner", "managers", propertyId] as const,

  // Settlement Balancer
  settlementEOD: (date?: string) =>
    date ? (["settlement", "eod", date] as const) : (["settlement", "eod"] as const),
  settlementHistory: (limit?: number) => ["settlement", "history", limit || 30] as const,

  // KYC
  tenantKYCStatus: ["tenant", "kyc", "status"] as const,
  ownerKYCQueue: ["owner", "kyc", "queue"] as const,
  ownerTenantKYC: (tenantId: string) => ["owner", "tenants", tenantId, "kyc"] as const,

  // Payouts & Money Out
  payoutPayees: ["owner", "payouts", "payees"] as const,
  unbatchedPayoutItems: ["owner", "payouts", "items", "unbatched"] as const,
  payoutBatches: ["owner", "payouts", "batches"] as const,
  payoutBatch: (id: string) => ["owner", "payouts", "batches", id] as const,

  // Finance & Ledger (M6)
  financeSummary: (period?: string) =>
    period ? (["owner", "finance", "summary", period] as const) : (["owner", "finance", "summary"] as const),
  financeLedger: (period?: string, from?: string, to?: string, account?: string) =>
    ["owner", "finance", "ledger", period || "", from || "", to || "", account || ""] as const,
  financeExpenses: (beforeOccurredAt?: string, beforeId?: string) =>
    ["owner", "finance", "expenses", beforeOccurredAt || "", beforeId || ""] as const,
  financeCapital: ["owner", "finance", "capital"] as const,
  financeBudgets: (period?: string) =>
    period ? (["owner", "finance", "budgets", period] as const) : (["owner", "finance", "budgets"] as const),
  financeTieOut: (period?: string) =>
    period ? (["owner", "finance", "tie-out", period] as const) : (["owner", "finance", "tie-out"] as const),
  financeIncomeStatement: (period?: string) =>
    ["owner", "finance", "statements", "income", period || ""] as const,
  financeBalanceSheet: (period?: string) =>
    ["owner", "finance", "statements", "balance-sheet", period || ""] as const,
  financeCashFlow: (period?: string) =>
    ["owner", "finance", "statements", "cash-flow", period || ""] as const,
  financeTrialBalance: (period?: string) =>
    ["owner", "finance", "statements", "trial-balance", period || ""] as const,
  financeVarianceBridge: (period?: string) =>
    ["owner", "finance", "variance-bridge", period || ""] as const,
  financeClearingDrift: ["owner", "finance", "reports", "clearing-drift"] as const,
  financeDepositReserve: ["owner", "finance", "reports", "deposit-reserve"] as const,
  financeCapitalPayback: ["owner", "finance", "reports", "capital-payback"] as const,
  financeReconcilingItems: (asOf?: string) =>
    ["owner", "finance", "reconciling-items", asOf || ""] as const,

  // Staff Attendance & Payroll (Track M)
  staffProfiles: (activeOnly?: boolean) =>
    ["owner", "staff", activeOnly ? "active" : "all"] as const,
  leavePolicy: ["owner", "attendance", "leave-policy"] as const,
  monthlyAttendance: (month?: string) =>
    ["owner", "attendance", "monthly", month || "current"] as const,
  payrollPreview: (cycleMonth?: string) =>
    ["owner", "payroll", "preview", cycleMonth || "current"] as const,
};

