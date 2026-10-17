import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveSessionsCard } from "@/components/shared/ActiveSessionsCard";
import * as authApi from "@/api/auth";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

describe("ActiveSessionsCard component", () => {
  it("renders active sessions and marks the current device with a badge", async () => {
    const mockSessions: authApi.ActiveSession[] = [
      {
        id: "session-1",
        device_label: "Chrome on Windows",
        user_agent: "Mozilla/5.0 ...",
        ip_address: "127.0.0.1",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_current: true,
      },
      {
        id: "session-2",
        device_label: "Safari on iPhone",
        user_agent: "Mozilla/5.0 ...",
        ip_address: "192.168.1.10",
        last_seen: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_current: false,
      },
    ];

    vi.spyOn(authApi, "getActiveSessions").mockResolvedValue({ sessions: mockSessions });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ActiveSessionsCard />
        </QueryClientProvider>
      );
    });

    // Wait for query to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const card = container?.querySelector("[data-testid='active-sessions-card']");
    expect(card).toBeTruthy();
    expect(card?.textContent).toContain("Active sessions");
    expect(card?.textContent).toContain("Chrome on Windows");
    expect(card?.textContent).toContain("Safari on iPhone");

    // Current device badge
    const badge = container?.querySelector("[data-testid='current-device-badge']");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("This device");

    // Revoke button exists for other session, but not for current session
    expect(container?.querySelector("[data-testid='revoke-btn-session-2']")).toBeTruthy();
    expect(container?.querySelector("[data-testid='revoke-btn-session-1']")).toBeNull();
  });

  it("calls deleteSession when revoking a non-current session", async () => {
    const mockSessions: authApi.ActiveSession[] = [
      {
        id: "session-1",
        device_label: "Chrome on Windows",
        user_agent: "Mozilla/5.0 ...",
        ip_address: "127.0.0.1",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_current: true,
      },
      {
        id: "session-2",
        device_label: "Safari on iPhone",
        user_agent: "Mozilla/5.0 ...",
        ip_address: "192.168.1.10",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_current: false,
      },
    ];

    vi.spyOn(authApi, "getActiveSessions").mockResolvedValue({ sessions: mockSessions });
    const deleteSpy = vi.spyOn(authApi, "deleteSession").mockResolvedValue({ ok: true });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ActiveSessionsCard />
        </QueryClientProvider>
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const revokeBtn = container?.querySelector("[data-testid='revoke-btn-session-2']") as HTMLButtonElement;
    expect(revokeBtn).toBeTruthy();

    await act(async () => {
      revokeBtn.click();
    });

    expect(deleteSpy).toHaveBeenCalledWith("session-2");
  });

  it("calls revokeAllSessions when clicking sign out other devices", async () => {
    const mockSessions: authApi.ActiveSession[] = [
      {
        id: "session-1",
        device_label: "Chrome on Windows",
        user_agent: "Mozilla/5.0 ...",
        ip_address: "127.0.0.1",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_current: true,
      },
      {
        id: "session-2",
        device_label: "Safari on iPhone",
        user_agent: "Mozilla/5.0 ...",
        ip_address: "192.168.1.10",
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_current: false,
      },
    ];

    vi.spyOn(authApi, "getActiveSessions").mockResolvedValue({ sessions: mockSessions });
    const revokeAllSpy = vi.spyOn(authApi, "revokeAllSessions").mockResolvedValue({ ok: true });

    await act(async () => {
      root?.render(
        <QueryClientProvider client={queryClient}>
          <ActiveSessionsCard />
        </QueryClientProvider>
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const signOutAllBtn = Array.from(container?.querySelectorAll("button") ?? []).find((b) =>
      b.textContent?.includes("Sign out other devices")
    );
    expect(signOutAllBtn).toBeTruthy();

    await act(async () => {
      signOutAllBtn?.click();
    });

    expect(revokeAllSpy).toHaveBeenCalled();
  });
});
