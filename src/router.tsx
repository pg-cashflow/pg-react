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
import { InvitePage } from "@/routes/invite";
import { LoginPage } from "@/routes/login";
import { JoinWaitingPage } from "@/routes/join";
import { AccessDeniedView } from "@/routes/access-denied";
import { LandingPage } from "@/routes/landing";
import { NotFoundView } from "@/routes/not-found";
import { ActivationPage } from "@/routes/activation";
import { AppShell } from "@/components/layout/AppShell";
import { TenantShell } from "@/components/layout/TenantShell";
import { ManagerShell } from "@/components/layout/ManagerShell";
import { AppLoadingScreen } from "@/components/layout/AppLoadingScreen";
import { JoinsView } from "@/routes/owner/joins";
import { ReportsView } from "@/routes/owner/reports";
import { TenantsView } from "@/routes/owner/tenants";
import { DuesView } from "@/routes/owner/dues";
import { PaymentsView } from "@/routes/owner/payments";
import { ReconciliationView } from "@/routes/owner/reconciliation";
import { EventsView } from "@/routes/owner/events";
import { MoreView } from "@/routes/owner/more";
import { DashboardView } from "@/routes/owner/dashboard";
import { OwnerFacilityView } from "@/routes/owner/facility";
import { OwnerRemindersView } from "@/routes/owner/reminders";
import { TenantDashboardView } from "@/routes/tenant/dashboard";
import { TenantDuesView } from "@/routes/tenant/dues";
import { TenantPaymentsView } from "@/routes/tenant/payments";
import { TenantRewardsView } from "@/routes/tenant/rewards";
import { TenantCommunityView } from "@/routes/tenant/community";
import { TenantProfileView } from "@/routes/tenant/profile";
import { KitchenHeadcountView } from "@/routes/manager/kitchen";
import { InspectionsListView } from "@/routes/manager/inspections";
import { InspectionNewView } from "@/routes/manager/inspection-new";
import { InspectionDetailView } from "@/routes/manager/inspection-detail";
import { MetersView } from "@/routes/manager/meters";
import { HazardsView } from "@/routes/manager/hazards";
import { ManagerProfileView } from "@/routes/manager/profile";
import { ViolationsView } from "@/routes/manager/violations";

function homeForRole(role: string | null, pending: boolean): string {
  if (role === "owner") return "/owner/dashboard";
  if (role === "manager") return "/manager/kitchen";
  if (role === "tenant" && pending) return "/join";
  if (role === "tenant") return "/tenant";
  return "/landing";
}

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, role, isPendingJoin } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      const dest = homeForRole(role, isPendingJoin);
      if (path === "/" || path === "/login" || path === "/landing") navigate({ to: dest });
    }
  }, [isAuthenticated, isLoading, role, isPendingJoin, path, navigate]);

  if (isLoading) return <AppLoadingScreen />;
  return <>{children}</>;
};

function RequireOwner() {
  const { isAuthenticated, isLoading, role, isPendingJoin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing" });
    else if (role === "manager") navigate({ to: "/manager/kitchen" });
    else if (role === "tenant") navigate({ to: isPendingJoin ? "/join" : "/tenant" });
    else if (role !== "owner") navigate({ to: "/denied" });
  }, [isAuthenticated, isLoading, role, isPendingJoin, navigate]);
  if (isLoading || role !== "owner") return <AppLoadingScreen />;
  return <AppShell />;
}

function RequireTenant() {
  const { isAuthenticated, isLoading, role, isPendingJoin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing" });
    else if (isPendingJoin) navigate({ to: "/join" });
    else if (role === "owner") navigate({ to: "/owner/dashboard" });
    else if (role === "manager") navigate({ to: "/manager/kitchen" });
    else if (role !== "tenant") navigate({ to: "/denied" });
  }, [isAuthenticated, isLoading, role, isPendingJoin, navigate]);
  if (isLoading || role !== "tenant" || isPendingJoin) return <AppLoadingScreen />;
  return <TenantShell />;
}

function RequireManager() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing" });
    else if (role === "owner") navigate({ to: "/owner/dashboard" });
    else if (role === "tenant") navigate({ to: "/tenant" });
    else if (role !== "manager") navigate({ to: "/denied" });
  }, [isAuthenticated, isLoading, role, navigate]);
  if (isLoading || role !== "manager") return <AppLoadingScreen />;
  return <ManagerShell />;
}

function RequireJoin() {
  const { isAuthenticated, isLoading, isPendingJoin, role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) navigate({ to: "/landing" });
    else if (role === "owner") navigate({ to: "/owner/dashboard" });
    else if (!isPendingJoin) navigate({ to: "/tenant" });
  }, [isAuthenticated, isLoading, isPendingJoin, role, navigate]);
  if (isLoading || !isPendingJoin) return <AppLoadingScreen />;
  return <JoinWaitingPage />;
}

function WaitingJoinListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const go = () => navigate({ to: "/join" });
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
      <Outlet />
    </>
  ),
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/landing",
  component: LandingPage,
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
  component: ActivationPage,
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
const ownerReports = createRoute({ getParentRoute: () => ownerRoute, path: "/reports", component: ReportsView });
const ownerTenants = createRoute({ getParentRoute: () => ownerRoute, path: "/tenants", component: TenantsView });
const ownerDues = createRoute({ getParentRoute: () => ownerRoute, path: "/dues", component: DuesView });
const ownerPayments = createRoute({ getParentRoute: () => ownerRoute, path: "/payments", component: PaymentsView });
const ownerRecon = createRoute({
  getParentRoute: () => ownerRoute,
  path: "/reconciliation",
  component: ReconciliationView,
});
const ownerEvents = createRoute({ getParentRoute: () => ownerRoute, path: "/events", component: EventsView });
const ownerFacility = createRoute({ getParentRoute: () => ownerRoute, path: "/facility", component: OwnerFacilityView });
const ownerMore = createRoute({ getParentRoute: () => ownerRoute, path: "/more", component: MoreView });
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  landingRoute,
  loginRoute,
  activationRoute,
  joinRoute,
  deniedRoute,
  ownerRoute.addChildren([
    ownerIndex,
    ownerJoins,
    ownerReports,
    ownerTenants,
    ownerDues,
    ownerPayments,
    ownerRecon,
    ownerEvents,
    ownerFacility,
    ownerMore,
    ownerReminders,
    ownerDash,
  ]),
  tenantRoute.addChildren([
    tenantIndex,
    tenantDues,
    tenantPayments,
    tenantRewards,
    tenantCommunity,
    tenantProfile,
  ]),
  managerRoute.addChildren([
    managerIndex,
    managerKitchen,
    managerInspections,
    managerInspectionNew,
    managerInspectionDetail,
    managerMeters,
    managerHazards,
    managerProfile,
    managerViolations,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
