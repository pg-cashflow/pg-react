import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  savePassbookCache,
  restorePassbookCache,
  clearPassbookCache,
  setupPassbookCache,
  PASSBOOK_STORAGE_KEY,
} from "../lib/passbookCache";

describe("passbookCache", () => {
  let client: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    client = new QueryClient();
  });

  it("persists only tenant passbook queries to localStorage", () => {
    client.setQueryData(["tenant", "dues"], [{ id: "due_1", amount: 6500 }]);
    client.setQueryData(["tenant", "payments"], [{ id: "pay_1", amount: 6500 }]);
    client.setQueryData(["owner", "dues"], [{ id: "owner_due_1", amount: 10000 }]);

    savePassbookCache(client);

    const storedRaw = localStorage.getItem(PASSBOOK_STORAGE_KEY);
    expect(storedRaw).toBeTruthy();

    const parsed = JSON.parse(storedRaw!);
    const keys = parsed.queries.map((q: { queryKey: unknown[] }) => q.queryKey);

    expect(keys).toContainEqual(["tenant", "dues"]);
    expect(keys).toContainEqual(["tenant", "payments"]);
    expect(keys).not.toContainEqual(["owner", "dues"]);
  });

  it("restores cached passbook queries on cold boot", () => {
    client.setQueryData(["tenant", "dues"], [{ id: "due_cached", amount: 8000 }]);
    savePassbookCache(client);

    const freshClient = new QueryClient();
    expect(freshClient.getQueryData(["tenant", "dues"])).toBeUndefined();

    restorePassbookCache(freshClient);
    expect(freshClient.getQueryData(["tenant", "dues"])).toEqual([{ id: "due_cached", amount: 8000 }]);
  });

  it("purges storage cleanly on clearPassbookCache", () => {
    client.setQueryData(["tenant", "dues"], [{ id: "due_1" }]);
    savePassbookCache(client);
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeTruthy();

    clearPassbookCache();
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("handles corrupted json gracefully without throwing", () => {
    localStorage.setItem(PASSBOOK_STORAGE_KEY, "invalid-json{");
    expect(() => restorePassbookCache(client)).not.toThrow();
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();
  });

  it("debounces save on setupPassbookCache query updates", async () => {
    vi.useFakeTimers();
    const unsubscribe = setupPassbookCache(client);

    client.setQueryData(["tenant", "dues"], [{ id: "due_stream" }]);
    // Before debounce timer
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeNull();

    // Fast-forward past debounce
    vi.advanceTimersByTime(350);
    expect(localStorage.getItem(PASSBOOK_STORAGE_KEY)).toBeTruthy();

    unsubscribe();
    vi.useRealTimers();
  });
});

