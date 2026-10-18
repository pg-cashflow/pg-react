import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  router,
  RequireManager,
  RequireOwner,
  RequireTenant,
  RequireActivation,
  AuthRedirect,
} from "../router";
import * as authContext from "../auth/context";

// Mock router navigation hooks
const mockNavigate = vi.fn();
let mockPathname = "/";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouterState: ({ select }: { select?: (s: any) => any } = {}) => {
      const state = { location: { pathname: mockPathname } };
      return select ? select(state) : state;
    },
  };
});

// Mock layouts & views with named exports matching router.tsx imports
vi.mock("@/components/layout/AppShell", () => ({
  AppShell: () => <div data-testid="app-shell">AppShell</div>,
}));
vi.mock("@/components/layout/TenantShell", () => ({
  TenantShell: () => <div data-testid="tenant-shell">TenantShell</div>,
}));
vi.mock("@/components/layout/ManagerShell", () => ({
  ManagerShell: () => <div data-testid="manager-shell">ManagerShell</div>,
}));
vi.mock("@/components/layout/AppLoadingScreen", () => ({
  AppLoadingScreen: () => <div data-testid="loading-screen">Loading...</div>,
}));
// The KYC onboarding gate has its own dedicated tests (see kycOnboardingGate.test.tsx).
// Here we only care that RequireTenant routes by role/auth state, so pass straight through.
vi.mock("@/components/shared/TenantKYCOnboardingGate", () => ({
  TenantKYCOnboardingGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/routes/join", () => ({
  JoinWaitingPage: () => <div data-testid="join-waiting">JoinWaitingPage</div>,
}));
vi.mock("@/routes/activation", () => ({
  ActivationPage: () => <div data-testid="activation-page">ActivationCelebration</div>,
}));
vi.mock("@/routes/landing", () => ({
  LandingPage: () => <div data-testid="landing-page">LandingPage</div>,
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  mockPathname = "/";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
  }
  if (container) {
    container.remove();
  }
  container = null;
  root = null;
});

describe("Router Configuration", () => {
  it("initializes router with defaultPreload: 'intent' and scrollRestoration: true", () => {
    expect(router.options.defaultPreload).toBe("intent");
    expect(router.options.scrollRestoration).toBe(true);
  });
});

describe("RequireManager Guard", () => {
  it("permits manager role to access ManagerShell", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "manager",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireManager />);
    });

    expect(container?.querySelector("[data-testid='manager-shell']")).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("permits owner role to access ManagerShell (dual-role access per HANDOFF.md)", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "owner",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireManager />);
    });

    expect(container?.querySelector("[data-testid='manager-shell']")).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user to /landing with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      role: null,
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireManager />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/landing", replace: true });
  });

  it("redirects tenant role to /tenant with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "tenant",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireManager />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/tenant", replace: true });
  });
});

describe("RequireOwner Guard", () => {
  it("permits owner role to access AppShell", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "owner",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireOwner />);
    });

    expect(container?.querySelector("[data-testid='app-shell']")).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirects manager to /manager/kitchen with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "manager",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireOwner />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/manager/kitchen", replace: true });
  });

  it("redirects unauthenticated to /landing with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      role: null,
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireOwner />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/landing", replace: true });
  });
});

describe("RequireTenant Guard", () => {
  it("permits allocated tenant to access TenantShell", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "tenant",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireTenant />);
    });

    expect(container?.querySelector("[data-testid='tenant-shell']")).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirects pending tenant to /join with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "tenant",
      isPendingJoin: true,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireTenant />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/join", replace: true });
  });

  it("redirects unauthenticated user to /landing with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      role: null,
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireTenant />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/landing", replace: true });
  });
});

describe("RequireActivation Guard", () => {
  it("renders ActivationPage when authenticated", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "tenant",
      isPendingJoin: false,
      justActivated: true,
    } as any);

    await act(async () => {
      root!.render(<RequireActivation />);
    });

    expect(container?.querySelector("[data-testid='activation-page']")).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user to /landing with replace: true", async () => {
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      role: null,
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(<RequireActivation />);
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/landing", replace: true });
  });
});

describe("Landing Route AuthRedirect", () => {
  it("redirects authenticated owner visiting /landing to /owner/dashboard with replace: true", async () => {
    mockPathname = "/landing";
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "owner",
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(
        <AuthRedirect>
          <div data-testid="child-content">Landing</div>
        </AuthRedirect>
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/owner/dashboard", replace: true });
  });

  it("renders children when user is unauthenticated", async () => {
    mockPathname = "/landing";
    vi.spyOn(authContext, "useAuth").mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      role: null,
      isPendingJoin: false,
      justActivated: false,
    } as any);

    await act(async () => {
      root!.render(
        <AuthRedirect>
          <div data-testid="child-content">Landing</div>
        </AuthRedirect>
      );
    });

    expect(container?.querySelector("[data-testid='child-content']")).not.toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
