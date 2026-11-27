import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { TenantDuesView } from "@/routes/tenant/dues";
import { TenantPaymentsView } from "@/routes/tenant/payments";
import { LocaleProvider } from "@/i18n";
import * as tenantApi from "@/api/tenant";
import * as kycApi from "@/api/kyc";
import { setStoredUser } from "@/auth/storage";
import {
  savePassbookCache,
  setPassbookOfflineEnabled,
  PASSBOOK_STORAGE_KEY,
  PASSBOOK_MAX_AGE_MS,
} from "@/lib/passbookCache";
import type { Due, Payment } from "@pg/types";

vi.mock("@/api/tenant", () => ({
  getMyProfile: vi.fn(),
  getMyDues: vi.fn(),
  getMyPayments: vi.fn(),
}));

vi.mock("@/api/kyc", () => ({
  getTenantKYCStatus: vi.fn(),
}));

vi.mock("@/components/shared/TenantBatchPayPanel", () => ({
  TenantBatchPayPanel: () => <div data-testid="batch-pay-panel">Batch Pay</div>,
}));

vi.mock("@/components/shared/PayPanel", () => ({
  PayPanel: ({ dueId }: { dueId: string }) => <div data-testid={`pay-panel-${dueId}`}>Pay Panel</div>,
}));

vi.mock("@/components/shared/TenantKYCCard", () => ({
  TenantKYCCard: () => <div data-testid="kyc-card" />,
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

const setNavigatorOnLine = (online: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
  onlineManager.setOnline(online);
};

const flushQueries = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
};

const sampleDues: Due[] = [
  {
    id: "due_1",
    due_code: "RENT-NOV-2026",
    tenant_id: "tenant-1",
    property_id: "prop-1",
    kind: "rent",
    amount: 650000,
    original_amount: 650000,
    period_start: "2026-11-01",
    period_end: "2026-11-30",
    due_date: "2026-11-05",
    status: "pending",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  },
];

const samplePayments: Payment[] = [
  {
    id: "pay_1",
    property_id: "prop-1",
    tenant_id: "tenant-1",
    due_id: "due_0",
    amount: 650000,
    matched_by: "upi_utr",
    upi_txn_id: "UTR9988776655",
    matched_at: "2026-10-05T10:00:00Z",
    status: "paid",
    created_at: "2026-10-05T10:00:00Z",
  },
];

const seedValidSnapshot = () => {
  setPassbookOfflineEnabled(true);
  const seedClient = new QueryClient();
  seedClient.setQueryData(["tenant", "dues"], sampleDues);
  seedClient.setQueryData(["tenant", "payments"], samplePayments);
  savePassbookCache(seedClient);
};

const renderView = async (node: React.ReactElement) => {
  await act(async () => {
    root?.render(
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
      </LocaleProvider>
    );
  });
  await flushQueries();
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setNavigatorOnLine(true);
  setStoredUser({ id: "tenant-user-1", role: "tenant", phone: "+919000000001" });

  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  vi.mocked(tenantApi.getMyProfile).mockResolvedValue({
    id: "tenant-1",
    status: "active",
  } as Awaited<ReturnType<typeof tenantApi.getMyProfile>>);

  vi.mocked(kycApi.getTenantKYCStatus).mockResolvedValue({
    verification: { status: "verified" },
  } as Awaited<ReturnType<typeof kycApi.getTenantKYCStatus>>);

  vi.mocked(tenantApi.getMyDues).mockResolvedValue(sampleDues);
  vi.mocked(tenantApi.getMyPayments).mockResolvedValue(samplePayments);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  if (container && document.body.contains(container)) {
    document.body.removeChild(container);
  }
  container = null;
  root = null;
  setNavigatorOnLine(true);
});

describe("F-04 offline passbook route regression tests", () => {
  it("1 & 2 & 3. TenantDuesView immediately suppresses payment controls and in-memory dues offline, showing only aggregate summary", async () => {
    seedValidSnapshot();
    await renderView(<TenantDuesView />);

    // Online initially: individual due and payment controls are visible
    expect(container?.textContent).toContain("RENT-NOV-2026");
    expect(container?.querySelector("[data-testid='batch-pay-panel']")).toBeTruthy();

    // Go offline while React Query still holds sampleDues in memory (isError is false)
    await act(async () => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    await flushQueries();

    expect(container?.textContent).toContain("Offline summary (saved locally)");
    expect(container?.textContent).toContain("1 pending due(s)");
    expect(container?.textContent).not.toContain("RENT-NOV-2026");
    expect(container?.querySelector("[data-testid='batch-pay-panel']")).toBeNull();
    expect(container?.textContent).not.toContain("Pay");
  });

  it("2 & 3. TenantPaymentsView hides individual payments, provider refs, and copy buttons offline, showing only aggregate summary", async () => {
    seedValidSnapshot();
    await renderView(<TenantPaymentsView />);

    expect(container?.textContent).toContain("UTR9988776655");
    expect(container?.querySelector("button[title='Copy reference ID']")).toBeTruthy();

    await act(async () => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    await flushQueries();

    expect(container?.textContent).toContain("Offline Snapshot");
    expect(container?.textContent).toContain("Offline summary (saved locally)");
    expect(container?.textContent).not.toContain("UTR9988776655");
    expect(container?.querySelector("button[title='Copy reference ID']")).toBeNull();
  });

  it("4. Online API errors display a distinct server recovery message rather than offline disconnection copy", async () => {
    seedValidSnapshot();
    vi.mocked(tenantApi.getMyDues).mockRejectedValue(new Error("500 Internal Server Error"));
    vi.mocked(tenantApi.getMyPayments).mockRejectedValue(new Error("502 Bad Gateway"));

    await renderView(<TenantDuesView />);
    expect(container?.textContent).toContain("Unable to refresh from server");
    expect(container?.textContent).not.toContain("Offline summary (saved locally)");
    expect(container?.textContent).not.toContain("RENT-NOV-2026");

    await renderView(<TenantPaymentsView />);
    expect(container?.textContent).toContain("Server error — last saved summary");
    expect(container?.textContent).not.toContain("Offline Snapshot");
    expect(container?.textContent).not.toContain("UTR9988776655");
  });

  it("5. Reconnection restores authoritative server data and payment controls", async () => {
    seedValidSnapshot();
    await renderView(<TenantDuesView />);

    await act(async () => {
      setNavigatorOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    await flushQueries();
    expect(container?.textContent).not.toContain("RENT-NOV-2026");

    await act(async () => {
      setNavigatorOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    await flushQueries();

    expect(container?.textContent).toContain("RENT-NOV-2026");
    expect(container?.querySelector("[data-testid='batch-pay-panel']")).toBeTruthy();
  });

  it("6. Invalid or expired snapshots never render", async () => {
    seedValidSnapshot();
    const raw = JSON.parse(localStorage.getItem(PASSBOOK_STORAGE_KEY)!);
    raw.savedAt -= PASSBOOK_MAX_AGE_MS + 60_000;
    localStorage.setItem(PASSBOOK_STORAGE_KEY, JSON.stringify(raw));

    setNavigatorOnLine(false);
    await renderView(<TenantDuesView />);

    expect(container?.textContent).toContain("You are offline");
    expect(container?.textContent).not.toContain("Offline summary (saved locally)");
    expect(container?.textContent).not.toContain("RENT-NOV-2026");

    // Tampered JSON is also rejected
    localStorage.setItem(PASSBOOK_STORAGE_KEY, "{not-valid-json");
    await renderView(<TenantPaymentsView />);
    expect(container?.textContent).toContain("No valid local summary is available");
    expect(container?.textContent).not.toContain("Offline summary (saved locally)");
    expect(container?.textContent).not.toContain("UTR9988776655");
  });
});
