import { csvEscape, displayDueStatus, formatDate, formatPaise } from "@/lib/utils";
import type { Due, Payment, Property, Tenant } from "@pg/types";

export function buildLedgerCsv(
  dues: Due[],
  tenants: Tenant[],
  property?: Pick<Property, "name"> | { name?: string },
  payments: Payment[] = []
): string {
  const byId = new Map(tenants.map((t) => [t.id, t]));
  const utrByDue = new Map<string, string>();
  for (const p of payments) {
    if (p.due_id && p.upi_txn_id) utrByDue.set(p.due_id, p.upi_txn_id);
  }
  const month = dues[0]?.due_date ? formatDate(dues[0].due_date) : "";
  const header = [
    "due_code",
    "tenant",
    "room",
    "amount",
    "status",
    "due_date",
    "property",
    "month",
    "utr",
  ];
  const rows = dues.map((d) => {
    const t = byId.get(d.tenant_id);
    return [
      csvEscape(d.due_code),
      csvEscape(t?.name ?? d.tenant_id),
      csvEscape(t?.room_number ?? ""),
      csvEscape(formatPaise(d.amount)),
      csvEscape(displayDueStatus(d)),
      csvEscape(formatDate(d.due_date)),
      csvEscape(property?.name ?? ""),
      csvEscape(month),
      csvEscape(utrByDue.get(d.id) ?? ""),
    ].join(",");
  });
  return `\uFEFF${header.join(",")}\n${rows.join("\n")}\n`;
}
