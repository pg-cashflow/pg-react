import React, { useEffect } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { TenantKYCOnboardingGate } from "@/components/shared/TenantKYCOnboardingGate";
import { AppLoadingScreen } from "@/components/layout/AppLoadingScreen";
import { homeForRole } from "@/auth/roles";

// Helper to catch chunk loading errors after new deployments and refresh once
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    sessionStorage.removeItem("pg_chunk_reload");
  });
}

function safeImport<T>(loader: () => Promise<T>): Promise<T> {
  return loader()
    .then((result) => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pg_chunk_reload");
      }
      return result;
    })
    .catch((error: any) => {
      const isChunkLoadFailed =
        error?.name === "ChunkLoadError" ||
        /loading chunk/i.test(error?.message || "") ||
        /failed to fetch dynamically imported module/i.test(error?.message || "");
      if (isChunkLoadFailed && typeof window !== "undefined") {
        const reloadKey = "pg_chunk_reload";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
      }
      throw error;
    });
}

// Helper for code-splitting route views with automatic Suspense boundary
function lazyView<T extends React.ComponentType<any>>(
  loader: () => Promise<any>,
  exportName?: string
) {
  const LazyComponent = React.lazy(async () => {
    const mod = await safeImport(loader);
    const comp = exportName ? mod[exportName] : (mod.default ?? Object.values(mod)[0]);
    return { default: comp };
  });

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <React.Suspense fallback={<AppLoadingScreen />}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

// Lazy-loaded Portal Layout Shells
const LazyAppShell = React.lazy(() =>
  safeImport(() => import("@/components/layout/AppShell").then((m) => ({ default: m.AppShell })))
);
const LazyTenantShell = React.lazy(() =>
  safeImport(() => import("@/components/layout/TenantShell").then((m) => ({ default: m.TenantShell })))
);
const LazyManagerShell = React.lazy(() =>
  safeImport(() => import("@/components/layout/ManagerShell").then((m) => ({ default: m.ManagerShell })))
);

// Lazy-loaded Onboarding & Auth Pages
const LazyJoinWaitingPage = React.lazy(() =>
  safeImport(() => import("@/routes/join").then((m) => ({ default: m.JoinWaitingPage })))
);
const LazyActivationPage = React.lazy(() =>
  safeImport(() => import("@/routes/activation").then((m) => ({ default: m.ActivationPage })))
);
const LandingPage = lazyView(() => import("@/routes/landing"), "LandingPage");
const InvitePage = lazyView(() => import("@/routes/invite"), "InvitePage");
const LoginPage = lazyView(() => import("@/routes/login"), "LoginPage");
const AccessDeniedView = lazyView(() => import("@/routes/access-denied"), "AccessDeniedView");
const NotFoundView = lazyView(() => import("@/routes/not-found"), "NotFoundView");

// Lazy-loaded Owner Views
const JoinsView = lazyView(() => import("@/routes/owner/joins"), "JoinsView");
const OwnerKYCView = lazyView(() => import("@/routes/owner/kyc"), "OwnerKYCView");
const ReportsView = lazyView(() => import("@/routes/owner/reports"), "ReportsView");
const TenantsView = lazyView(() => import("@/routes/owner/tenants"), "TenantsView");
const DuesView = lazyView(() => import("@/routes/owner/dues"), "DuesView");
const PaymentsView = lazyView(() => import("@/routes/owner/payments"), "PaymentsView");
const PayoutsView = lazyView(() => import("@/routes/owner/payouts"), "PayoutsView");
const AttendanceView = lazyView(() => import("@/routes/owner/attendance"), "AttendanceView");
const ReconciliationView = lazyView(() => import("@/routes/owner/reconciliation"), "ReconciliationView");
const EventsView = lazyView(() => import("@/routes/owner/events"), "EventsView");
const MoreView = lazyView(() => import("@/routes/owner/more"), "MoreView");
const DashboardView = lazyView<React.ComponentType<{ onNavigate: (tab: string) => void }>>(
  () => import("@/routes/owner/dashboard"),
  "DashboardView"
);
const OwnerFacilityView = lazyView(() => import("@/routes/owner/facility"), "OwnerFacilityView");
const OwnerRemindersView = lazyView(() => import("@/routes/owner/reminders"), "OwnerRemindersView");
const FinanceOverviewView = lazyView(() => import("@/routes/owner/finance/index"), "FinanceOverviewView");
const FinanceExpensesView = lazyView(() => import("@/routes/owner/finance/expenses"), "FinanceExpensesView");
const FinanceBudgetsView = lazyView(() => import("@/routes/owner/finance/budgets"), "FinanceBudgetsView");
const FinanceCapitalView = lazyView(() => import("@/routes/owner/finance/capital"), "FinanceCapitalView");
const FinanceStatementsView = lazyView(() => import("@/routes/owner/finance/statements"), "FinanceStatementsView");
const FinanceReportsView = lazyView(() => import("@/routes/owner/finance/reports"), "FinanceReportsView");
const FinanceCloseView = lazyView(() => import("@/routes/owner/finance/close"), "FinanceCloseView");

// Lazy-loaded Tenant Views
const TenantDashboardView = lazyView<React.ComponentType<{ onNavigate: (tab: string) => void }>>(
  () => import("@/routes/tenant/dashboard"),
  "TenantDashboardView"
);
const TenantDuesView = lazyView(() => import("@/routes/tenant/dues"), "TenantDuesView");
const TenantPaymentsView = lazyView(() => import("@/routes/tenant/payments"), "TenantPaymentsView");
const TenantRewardsView = lazyView(() => import("@/routes/tenant/rewards"), "TenantRewardsView");
const TenantCommunityView = lazyView(() => import("@/routes/tenant/community"), "TenantCommunityView");
const TenantProfileView = lazyView(() => import("@/routes/tenant/profile"), "TenantProfileView");
const TenantPayReturnView = lazyView(() => import("@/routes/tenant/pay-return"), "TenantPayReturnView");

// Lazy-loaded Manager Views
const KitchenHeadcountView = lazyView(() => import("@/routes/manager/kitchen"), "KitchenHeadcountView");
const InspectionsListView = lazyView(() => import("@/routes/manager/inspections"), "InspectionsListView");
const InspectionNewView = lazyView(() => import("@/routes/manager/inspection-new"), "InspectionNewView");
const InspectionDetailView = lazyView(() => import("@/routes/manager/inspection-detail"), "InspectionDetailView");
const MetersView = lazyView(() => import("@/routes/manager/meters"), "MetersView");
const HazardsView = lazyView(() => import("@/routes/manager/hazards"), "HazardsView");
const ManagerProfileView = lazyView(() => import("@/routes/manager/profile"), "ManagerProfileView");
const ViolationsView = lazyView(() => import("@/routes/manager/violations"), "ViolationsView");

export const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, role, isPendingJoin, justActivated } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      if (justActivated && !isPendingJoin) {
        if (path === "/" || path === "/login" || path === "/landing") {
          navigate({ to: "/activation", replace: true });
          return;
        }
      }
      const dest = homeForRole(role, isPendingJoin);
      if (path === "/" || path === "/login" || path === "/landing") {
        navigate({ to: dest, replace: true });
      }
    }
  }, [isAuthenticated, isLoading, role, isPendingJoin, justActivated, path, navigate]);

  if (isLoading) return <AppLoadingScreen />;
  return <>{children}</>;
};

export function RequireOwner() {
  const { isAuthenticated, isLoading, role, isPendingJoin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing", replace: true });
    else if (role === "manager") navigate({ to: "/manager/kitchen", replace: true });
    else if (role === "tenant") navigate({ to: isPendingJoin ? "/join" : "/tenant", replace: true });
    else if (role !== "owner") navigate({ to: "/denied", replace: true });
  }, [isAuthenticated, isLoading, role, isPendingJoin, navigate]);
  if (isLoading || role !== "owner") return <AppLoadingScreen />;
  return (
    <React.Suspense fallback={<AppLoadingScreen />}>
      <LazyAppShell />
    </React.Suspense>
  );
}

export function RequireTenant() {
  const { isAuthenticated, isLoading, role, isPendingJoin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing", replace: true });
    else if (isPendingJoin) navigate({ to: "/join", replace: true });
    else if (role === "owner") navigate({ to: "/owner/dashboard", replace: true });
    else if (role === "manager") navigate({ to: "/manager/kitchen", replace: true });
    else if (role !== "tenant") navigate({ to: "/denied", replace: true });
  }, [isAuthenticated, isLoading, role, isPendingJoin, navigate]);
  if (isLoading || role !== "tenant" || isPendingJoin) return <AppLoadingScreen />;
  return (
    <TenantKYCOnboardingGate>
      <React.Suspense fallback={<AppLoadingScreen />}>
        <LazyTenantShell />
      </React.Suspense>
    </TenantKYCOnboardingGate>
  );
}

export function RequireManager() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing", replace: true });
    else if (role === "tenant") navigate({ to: "/tenant", replace: true });
    else if (role !== "manager" && role !== "owner") navigate({ to: "/denied", replace: true });
  }, [isAuthenticated, isLoading, role, navigate]);
  if (isLoading || (role !== "manager" && role !== "owner")) return <AppLoadingScreen />;
  return (
    <React.Suspense fallback={<AppLoadingScreen />}>
      <LazyManagerShell />
    </React.Suspense>
  );
}

export function RequireJoin() {
  const { isAuthenticated, isLoading, isPendingJoin, role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing", replace: true });
    else if (role === "owner") navigate({ to: "/owner/dashboard", replace: true });
    else if (role === "manager") navigate({ to: "/manager/kitchen", replace: true });
    else if (!isPendingJoin) navigate({ to: "/tenant", replace: true });
  }, [isAuthenticated, isLoading, isPendingJoin, role, navigate]);
  if (isLoading || !isPendingJoin) return <AppLoadingScreen />;
  return (
    <React.Suspense fallback={<AppLoadingScreen />}>
      <LazyJoinWaitingPage />
    </React.Suspense>
  );
}

export function RequireActivation() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing", replace: true });
  }, [isAuthenticated, isLoading, navigate]);
  if (isLoading || !isAuthenticated) return <AppLoadingScreen />;
  return (
    <React.Suspense fallback={<AppLoadingScreen />}>
      <LazyActivationPage />
    </React.Suspense>
  );
}

function WaitingJoinListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const go = () => navigate({ to: "/join", replace: true });
    window.addEventListener("pg:waiting-join", go);
    return () => window.removeEventListener("pg:waiting-join", go);
  }, [navigate]);
  return null;
}

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundView,
  component: () => (
    <>
      <WaitingJoinListener />
      <React.Suspense fallback={<AppLoadingScreen />}>
        <Outlet />
      </React.Suspense>
    </>
  ),
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/landing",
  component: () => (
    <AuthRedirect>
      <LandingPage />
    </AuthRedirect>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <AuthRedirect>
      <InvitePage />
    </AuthRedirect>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => (
    <AuthRedirect>
      <LoginPage />
    </AuthRedirect>
  ),
});

const activationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/activation",
  component: RequireActivation,
});

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join",
  component: RequireJoin,
});

const deniedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/denied",
  component: AccessDeniedView,
});

const ownerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/owner",
  component: RequireOwner,
});

const ownerIndex = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/owner/dashboard" });
  },
});

const ownerJoins = createRoute({ getParentRoute: () => ownerRoute, path: "/joins", component: JoinsView });
const ownerJoinRequests = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/join-requests",
  beforeLoad: () => {
    throw redirect({ to: "/owner/joins" });
  },
});
const ownerKYC = createRoute({ getParentRoute: () => ownerRoute, path: "/kyc", component: OwnerKYCView });
const ownerKYCQueue = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/kyc-queue",
  beforeLoad: () => {
    throw redirect({ to: "/owner/kyc" });
  },
});
const ownerReports = createRoute({ getParentRoute: () => ownerRoute, path: "/reports", component: ReportsView });
const ownerPaymentReports = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/payment-reports",
  beforeLoad: () => {
    throw redirect({ to: "/owner/reports" });
  },
});
const ownerTenants = createRoute({ getParentRoute: () => ownerRoute, path: "/tenants", component: TenantsView });
const ownerDues = createRoute({ getParentRoute: () => ownerRoute, path: "/dues", component: DuesView });
const ownerBilling = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/billing",
  beforeLoad: () => {
    throw redirect({ to: "/owner/dues" });
  },
});
const ownerPayments = createRoute({ getParentRoute: () => ownerRoute, path: "/payments", component: PaymentsView });
const ownerPayouts = createRoute({ getParentRoute: () => ownerRoute, path: "/payouts", component: PayoutsView });
const ownerAttendance = createRoute({ getParentRoute: () => ownerRoute, path: "/attendance", component: AttendanceView });
const ownerStaff = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/staff",
  beforeLoad: () => {
    throw redirect({ to: "/owner/attendance" });
  },
});
const ownerPayroll = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/payroll",
  beforeLoad: () => {
    throw redirect({ to: "/owner/attendance" });
  },
});
const ownerRecon = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/reconciliation",
  component: ReconciliationView,
});
const ownerFinance = createRoute({ getParentRoute: () => ownerRoute, path: "/finance", component: FinanceOverviewView });
const ownerFinanceExpenses = createRoute({ getParentRoute: () => ownerRoute, path: "/finance/expenses", component: FinanceExpensesView });
const ownerFinanceBudgets = createRoute({ getParentRoute: () => ownerRoute, path: "/finance/budgets", component: FinanceBudgetsView });
const ownerFinanceCapital = createRoute({ getParentRoute: () => ownerRoute, path: "/finance/capital", component: FinanceCapitalView });
const ownerFinanceStatements = createRoute({ getParentRoute: () => ownerRoute, path: "/finance/statements", component: FinanceStatementsView });
const ownerFinanceReports = createRoute({ getParentRoute: () => ownerRoute, path: "/finance/reports", component: FinanceReportsView });
const ownerFinanceClose = createRoute({ getParentRoute: () => ownerRoute, path: "/finance/close", component: FinanceCloseView });
const ownerTieOut = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/finance/tie-out",
  beforeLoad: () => {
    throw redirect({ to: "/owner/finance/close" });
  },
});
const ownerTieOutShort = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/tie-out",
  beforeLoad: () => {
    throw redirect({ to: "/owner/finance/close" });
  },
});
const ownerEvents = createRoute({ getParentRoute: () => ownerRoute, path: "/events", component: EventsView });
const ownerAudit = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/audit",
  beforeLoad: () => {
    throw redirect({ to: "/owner/events" });
  },
});
const ownerLogs = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/logs",
  beforeLoad: () => {
    throw redirect({ to: "/owner/events" });
  },
});
const ownerFacility = createRoute({ getParentRoute: () => ownerRoute, path: "/facility", component: OwnerFacilityView });
const ownerHazards = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/hazards",
  beforeLoad: () => {
    throw redirect({ to: "/owner/facility" });
  },
});
const ownerHazardDetail = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/hazards/$id",
  beforeLoad: () => {
    throw redirect({ to: "/owner/facility" });
  },
});
const ownerInspections = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/inspections",
  beforeLoad: () => {
    throw redirect({ to: "/owner/facility" });
  },
});
const ownerInspectionDetail = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/inspections/$id",
  beforeLoad: () => {
    throw redirect({ to: "/owner/facility" });
  },
});
const ownerMore = createRoute({ getParentRoute: () => ownerRoute, path: "/more", component: MoreView });
const ownerSettings = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/settings",
  beforeLoad: () => {
    throw redirect({ to: "/owner/more" });
  },
});
const ownerReminders = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/reminders",
  component: OwnerRemindersView,
});
const ownerDash = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/dashboard",
  component: function OwnerDash() {
    const navigate = useNavigate();
    return (
      <DashboardView
        onNavigate={(tab) => navigate({ to: `/owner/${tab === "dashboard" ? "dashboard" : tab}` })}
      />
    );
  },
});

const tenantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tenant",
  component: RequireTenant,
});

const tenantIndex = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/",
  component: function TenantHome() {
    const navigate = useNavigate();
    return (
      <TenantDashboardView
        onNavigate={(tab) => navigate({ to: tab === "dashboard" ? "/tenant" : `/tenant/${tab}` })}
      />
    );
  },
});
const tenantMe = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/me",
  beforeLoad: () => {
    throw redirect({ to: "/tenant" });
  },
});
const tenantDues = createRoute({ getParentRoute: () => tenantRoute, path: "/dues", component: TenantDuesView });
const tenantPayments = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/payments",
  component: TenantPaymentsView,
});
const tenantRewards = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/rewards",
  component: TenantRewardsView,
});
const tenantPoints = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/points",
  beforeLoad: () => {
    throw redirect({ to: "/tenant/rewards" });
  },
});
const tenantCommunity = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/community",
  component: TenantCommunityView,
});
const tenantProfile = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/profile",
  component: TenantProfileView,
});
const tenantPayReturn = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/pay-return",
  component: TenantPayReturnView,
});
const tenantKYC = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/kyc",
  beforeLoad: () => {
    throw redirect({ to: "/tenant/profile" });
  },
});
const tenantHazards = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/hazards",
  beforeLoad: () => {
    throw redirect({ to: "/tenant" });
  },
});
const tenantInspections = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/inspections",
  beforeLoad: () => {
    throw redirect({ to: "/tenant" });
  },
});
const tenantInspectionDetail = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/inspections/$id",
  beforeLoad: () => {
    throw redirect({ to: "/tenant" });
  },
});
const tenantViolations = createRoute({
  getParentRoute: () => tenantRoute,
  path: "/violations",
  beforeLoad: () => {
    throw redirect({ to: "/tenant" });
  },
});

const managerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manager",
  component: RequireManager,
});

const managerIndex = createRoute({
  getParentRoute: () => managerRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/manager/kitchen" });
  },
});
const managerKitchen = createRoute({
  getParentRoute: () => managerRoute,
  path: "/kitchen",
  component: KitchenHeadcountView,
});
const managerInspections = createRoute({
  getParentRoute: () => managerRoute,
  path: "/inspections",
  component: InspectionsListView,
});
const managerInspectionNew = createRoute({
  getParentRoute: () => managerRoute,
  path: "/inspections/new",
  component: InspectionNewView,
});
const managerInspectionDetail = createRoute({
  getParentRoute: () => managerRoute,
  path: "/inspections/$id",
  component: InspectionDetailView,
});
const managerMeters = createRoute({
  getParentRoute: () => managerRoute,
  path: "/meters",
  component: MetersView,
});
const managerHazards = createRoute({
  getParentRoute: () => managerRoute,
  path: "/hazards",
  component: HazardsView,
});
const managerHazardDetail = createRoute({
  getParentRoute: () => managerRoute,
  path: "/hazards/$id",
  component: HazardsView,
});
const managerProfile = createRoute({
  getParentRoute: () => managerRoute,
  path: "/profile",
  component: ManagerProfileView,
});
const managerViolations = createRoute({
  getParentRoute: () => managerRoute,
  path: "/violations",
  component: ViolationsView,
});
const managerKYC = createRoute({
  getParentRoute: () => managerRoute,
  path: "/kyc",
  component: OwnerKYCView,
});

const rootDashboard = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <AuthRedirect>
      <AppLoadingScreen />
    </AuthRedirect>
  ),
});

const rootJoinRequests = createRoute({
  getParentRoute: () => rootRoute,
  path: "/join-requests",
  beforeLoad: () => {
    throw redirect({ to: "/owner/joins" });
  },
});

const rootJoins = createRoute({
  getParentRoute: () => rootRoute,
  path: "/joins",
  beforeLoad: () => {
    throw redirect({ to: "/owner/joins" });
  },
});

const rootKYC = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kyc",
  beforeLoad: () => {
    throw redirect({ to: "/owner/kyc" });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  landingRoute,
  loginRoute,
  activationRoute,
  joinRoute,
  deniedRoute,
  rootDashboard,
  rootJoinRequests,
  rootJoins,
  rootKYC,
  ownerRoute.addChildren([
    ownerIndex,
    ownerJoins,
    ownerJoinRequests,
    ownerKYC,
    ownerKYCQueue,
    ownerReports,
    ownerPaymentReports,
    ownerTenants,
    ownerDues,
    ownerBilling,
    ownerPayments,
    ownerPayouts,
    ownerAttendance,
    ownerStaff,
    ownerPayroll,
    ownerRecon,
    ownerFinance,
    ownerFinanceExpenses,
    ownerFinanceBudgets,
    ownerFinanceCapital,
    ownerFinanceStatements,
    ownerFinanceReports,
    ownerFinanceClose,
    ownerTieOut,
    ownerTieOutShort,
    ownerEvents,
    ownerAudit,
    ownerLogs,
    ownerFacility,
    ownerHazards,
    ownerHazardDetail,
    ownerInspections,
    ownerInspectionDetail,
    ownerMore,
    ownerSettings,
    ownerReminders,
    ownerDash,
  ]),
  tenantRoute.addChildren([
    tenantIndex,
    tenantMe,
    tenantDues,
    tenantPayments,
    tenantRewards,
    tenantPoints,
    tenantCommunity,
    tenantProfile,
    tenantPayReturn,
    tenantKYC,
    tenantHazards,
    tenantInspections,
    tenantInspectionDetail,
    tenantViolations,
  ]),
  managerRoute.addChildren([
    managerIndex,
    managerKitchen,
    managerInspections,
    managerInspectionNew,
    managerInspectionDetail,
    managerMeters,
    managerHazards,
    managerHazardDetail,
    managerProfile,
    managerViolations,
    managerKYC,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
