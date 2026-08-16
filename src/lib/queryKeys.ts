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
  ownerInvite: ["owner", "invite"] as const,
  paymentReports: ["owner", "payment-reports"] as const,
  properties: ["owner", "properties"] as const,
  tenantDues: ["tenant", "dues"] as const,
  tenantPayments: ["tenant", "payments"] as const,
  tenantProfile: ["tenant", "me"] as const,
  joinMe: ["join", "me"] as const,
};
