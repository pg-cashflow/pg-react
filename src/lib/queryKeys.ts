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
};

