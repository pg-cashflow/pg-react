import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { setStoredUser } from "../auth/storage";
import {
  savePassbookCache,
  restorePassbookCache,
  clearPassbookCache,
  setupPassbookCache,
  PASSBOOK_STORAGE_KEY,
  PASSBOOK_MAX_AGE_MS,
  isPassbookOfflineEnabled,
  isPassbookOfflineDisabled,
  setPassbookOfflineEnabled,
  setPassbookOfflineDisabled,
  getPassbookLastSync,
  getOfflinePassbookSummary,
} from "../lib/passbookCache";

describe("passbookCache (aggregate-only DTO)", () => {
  let client: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    client = new QueryClient();
    setStoredUser({ id: "tenant-user-1", role: "tenant", phone: "+919000000001" });
  });

  it("is disabled by default (in-memory only, no localStorage exposure)", () => {
    expect(isPassbookOfflineEnabled()).toBe(false);
    expect(isPassbookOfflineDisabled()).toBe(true);

    client.setQueryData(["tenant", "dues"], [{ id: "due_1", amount: 6500, status: "pending" }]);
    savePassbookCache(client);

    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("persists only an allowlisted aggregate DTO with no individual records, IDs, or references", () => {
    setPassbookOfflineEnabled(true);
    client.setQueryData(["tenant", "dues"], [
      { id: "due_1", due_code: "RENT-NOV", due_date: "2026-11-05", amount: 650000, status: "pending" },
      { id: "due_2", due_code: "RENT-DEC", due_date: "2026-12-05", amount: 700000, status: "pending" },
    ]);
    client.setQueryData(["tenant", "payments"], [
      { id: "pay_1", amount: 650000, status: "paid", upi_txn_id: "UTR99887766", provider_payment_id: "cf_pay_123" },
    ]);
    client.setQueryData(["owner", "dues"], [{ id: "owner_due_1", amount: 1000000, status: "pending" }]);

    savePassbookCache(client);

    const storedRaw = localStorage.getItem(PASSBOOK_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();

    // Forbidden individual fields/IDs/references must never appear in localStorage
    expect(storedRaw).not.toContain("due_1");
    expect(storedRaw).not.toContain("due_2");
    expect(storedRaw).not.toContain("pay_1");
    expect(storedRaw).not.toContain("RENT-NOV");
    expect(storedRaw).not.toContain("UTR99887766");
    expect(storedRaw).not.toContain("cf_pay_123");
    expect(storedRaw).not.toContain("owner_due_1");
    expect(storedRaw).not.toContain("queries");

    const parsed = JSON.parse(storedRaw!);
    expect(parsed.version).toBe(2);
    expect(Object.keys(parsed.summary).sort()).toEqual([
      "next_due_amount",
      "next_due_date",
      "outstanding_total",
      "pending_due_count",
      "total_paid",
    ]);
    expect(parsed.summary).toEqual({
      outstanding_total: 1350000,
      pending_due_count: 2,
      next_due_date: "2026-11-05",
      next_due_amount: 650000,
      total_paid: 650000,
    });
  });

  it("never hydrates individual dues or payments arrays into QueryClient on cold boot", () => {
    setPassbookOfflineEnabled(true);
    client.setQueryData(["tenant", "dues"], [{ id: "due_cached", amount: 8000, status: "pending", due_date: "2026-11-01" }]);
    savePassbookCache(client);

    const freshClient = new QueryClient();
    restorePassbookCache(freshClient);

    expect(freshClient.getQueryData(["tenant", "dues"])).toBeUndefined();
    expect(freshClient.getQueryData(["tenant", "payments"])).toBeUndefined();
    expect(getOfflinePassbookSummary()?.outstanding_total).toBe(8000);
  });

  it("purges storage cleanly on clearPassbookCache", () => {
    setPassbookOfflineEnabled(true);
    client.setQueryData(["tenant", "dues"], [{ id: "due_1", amount: 1000, status: "pending" }]);
    savePassbookCache(client);
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeTruthy();

    clearPassbookCache();
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("does not expose another account's offline summary", () => {
    setPassbookOfflineEnabled(true);
    client.setQueryData(["tenant", "dues"], [{ id: "private-due", amount: 5000, status: "pending" }]);
    savePassbookCache(client);
    setStoredUser({ id: "tenant-user-2", role: "tenant", phone: "+919000000002" });
    const fresh = new QueryClient();
    restorePassbookCache(fresh);
    expect(getOfflinePassbookSummary()).toBeNull();
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("removes cached summary after the 1-hour offline limit (PASSBOOK_MAX_AGE_MS)", () => {
    setPassbookOfflineEnabled(true);
    client.setQueryData(["tenant", "dues"], [{ id: "expired-due", amount: 5000, status: "pending" }]);
    savePassbookCache(client);
    const data = JSON.parse(localStorage.getItem(PASSBOOK_STORAGE_KEY)!);
    data.savedAt -= PASSBOOK_MAX_AGE_MS + 5 * 60 * 1000;
    localStorage.setItem(PASSBOOK_STORAGE_KEY, JSON.stringify(data));
    const fresh = new QueryClient();
    restorePassbookCache(fresh);
    expect(getOfflinePassbookSummary()).toBeNull();
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("handles user preference toggling via setPassbookOfflineDisabled", () => {
    expect(isPassbookOfflineDisabled()).toBe(true);

    setPassbookOfflineDisabled(false);
    expect(isPassbookOfflineDisabled()).toBe(false);
    expect(isPassbookOfflineEnabled()).toBe(true);

    client.setQueryData(["tenant", "dues"], [{ id: "due_opt_in", amount: 1000, status: "pending" }]);
    savePassbookCache(client);
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeTruthy();

    setPassbookOfflineDisabled(true);
    expect(isPassbookOfflineDisabled()).toBe(true);
    expect(isPassbookOfflineEnabled()).toBe(false);
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("tracks getPassbookLastSync correctly", () => {
    setPassbookOfflineEnabled(true);
    expect(getPassbookLastSync()).toBeNull();

    client.setQueryData(["tenant", "dues"], [{ id: "due_sync_check", amount: 1000, status: "pending" }]);
    savePassbookCache(client);

    const lastSync = getPassbookLastSync();
    expect(lastSync).toBeTypeOf("number");
    expect(Date.now() - lastSync!).toBeLessThan(5000);
  });

  it("handles corrupted json gracefully without throwing", () => {
    setPassbookOfflineEnabled(true);
    localStorage.setItem(PASSBOOK_STORAGE_KEY, "invalid-json{");
    expect(() => restorePassbookCache(client)).not.toThrow();
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("setupPassbookCache subscribes to QueryClient and persists aggregate summary on success", () => {
    vi.useFakeTimers();
    setPassbookOfflineEnabled(true);
    const cleanup = setupPassbookCache(client);
    client.setQueryData(["tenant", "dues"], [{ id: "due_sub", amount: 3000, status: "pending" }]);
    vi.advanceTimersByTime(350);
    expect(getOfflinePassbookSummary()?.outstanding_total).toBe(3000);
    cleanup();
    vi.useRealTimers();
  });
});
