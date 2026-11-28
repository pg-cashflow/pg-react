import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PaymentsView } from "@/routes/owner/payments";
import { LocaleProvider } from "@/i18n";
import * as paymentsApi from "@/api/payments";
import * as tenantsApi from "@/api/tenants";
import type { Payment } from "@pg/types";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 57,
        end: (index + 1) * 57,
      })),
    getTotalSize: () => count * 57,
    measureElement: () => {},
  }),
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let queryClient: QueryClient;

const makePayment = (id: string, amount: number, upiTxnId: string): Payment => ({
  id,
  tenant_id: "t-1",
  due_id: "d-1",
  amount,
  matched_by: "cashfree",
  upi_txn_id: upiTxnId,
  matched_at: "2026-11-28T06:00:00.123456Z",
  raw_note: "",
  created_at: "2026-11-28T06:00:00.123456Z",
});

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.spyOn(tenantsApi, "getTenants").mockResolvedValue([
    {
      id: "t-1",
      property_id: "p-1",
      name: "Asha Rao",
      phone: "9999999999",
      room_id: "r-1",
      rent_amount: 100000,
      deposit_amount: 100000,
      status: "active",
      joined_at: "2026-01-01T00:00:00Z",
    },
  ]);
  vi.spyOn(paymentsApi, "getRefundApprovals").mockResolvedValue([]);
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
});

const renderPaymentsView = async () => {
  await act(async () => {
    root!.render(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <PaymentsView />
        </LocaleProvider>
      </QueryClientProvider>
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
};

describe("PaymentsView infinite pagination and refresh", () => {
  it("loads next page on Load more and resets to page 1 on Refresh", async () => {
    const getPaymentsPageSpy = vi
      .spyOn(paymentsApi, "getPaymentsPage")
      .mockResolvedValueOnce({
        payments: [makePayment("p-1", 50000, "UTR_PAGE_1")],
        limit: 50,
        next_cursor: "2026-11-28T06:00:00.123456Z",
        next_cursor_id: "p-1",
      })
      .mockResolvedValueOnce({
        payments: [makePayment("p-2", 60000, "UTR_PAGE_2")],
        limit: 50,
        next_cursor: null,
        next_cursor_id: null,
      })
      .mockResolvedValueOnce({
        payments: [makePayment("p-1", 50000, "UTR_PAGE_1_FRESH")],
        limit: 50,
        next_cursor: "2026-11-28T06:00:00.123456Z",
        next_cursor_id: "p-1",
      });

    await renderPaymentsView();
    expect(container?.textContent).toContain("UTR_PAGE_1");
    expect(container?.textContent).not.toContain("UTR_PAGE_2");

    const loadMoreBtn = Array.from(container!.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Load more")
    );
    expect(loadMoreBtn).toBeDefined();

    await act(async () => {
      loadMoreBtn!.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container?.textContent).toContain("UTR_PAGE_1");
    expect(container?.textContent).toContain("UTR_PAGE_2");
    expect(getPaymentsPageSpy).toHaveBeenNthCalledWith(2, {
      cursor: "2026-11-28T06:00:00.123456Z",
      cursorId: "p-1",
      limit: 50,
    });

    const refreshBtn = Array.from(container!.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Refresh")
    );
    expect(refreshBtn).toBeDefined();

    await act(async () => {
      refreshBtn!.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(container?.textContent).toContain("UTR_PAGE_1_FRESH");
    expect(container?.textContent).not.toContain("UTR_PAGE_2");
    expect(getPaymentsPageSpy).toHaveBeenCalledTimes(3);
  });
});
