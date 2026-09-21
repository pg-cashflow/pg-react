import { describe, expect, it } from "vitest";
import { buildLedgerCsv } from "./exportLedgerCsv";
import type { Due, Tenant, Payment } from "@pg/types";

describe("buildLedgerCsv", () => {
  it("includes due_code and tenant room", () => {
    const dues = [
      {
        id: "d1",
        tenant_id: "t1",
        due_code: "PG-AAAAAA",
        amount: 850000,
        status: "pending",
        due_date: "2026-09-05T00:00:00Z",
      },
    ] as Due[];
    const tenants = [{ id: "t1", name: "Asha", room_number: "204" } as Tenant];
    const csv = buildLedgerCsv(dues, tenants, { name: "Dev PG" });
    expect(csv).toContain("due_code");
    expect(csv).toContain("PG-AAAAAA");
    expect(csv).toContain("Asha");
    expect(csv).toContain("204");
    expect(csv).toContain("Dev PG");
    expect(csv).toContain("utr");
  });

  it("fills UTR from matched payments", () => {
    const dues = [{ id: "d1", tenant_id: "t1", due_code: "PG-AAAAAA", amount: 1, status: "paid", due_date: "2026-09-05T00:00:00Z" }] as Due[];
    const csv = buildLedgerCsv(dues, [], { name: "Dev PG" }, [
      { id: "p1", due_id: "d1", tenant_id: "t1", amount: 1, matched_by: "manual", upi_txn_id: "UTR123", matched_at: "" } as Payment,
    ]);
    expect(csv).toContain("UTR123");
  });
});
