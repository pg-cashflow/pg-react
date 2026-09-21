import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createDueToken, getDues } from "@/api/dues";
import { getTenants } from "@/api/tenants";
import { getProperties } from "@/api/properties";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { addCalendarDays, formatDate, formatDueSentence, isOpenDue } from "@/lib/utils";
import { Send } from "lucide-react";

const SENT_KEY = "pg_reminder_sent";

function loadSent(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
}

export const OwnerRemindersView: React.FC = () => {
  const [sent, setSent] = useState(loadSent);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const duesQuery = useQuery({ queryKey: QUERY_KEYS.dues(), queryFn: () => getDues(), refetchInterval: 30000 });
  const tenantsQuery = useQuery({ queryKey: QUERY_KEYS.tenants, queryFn: getTenants });
  const propsQuery = useQuery({ queryKey: QUERY_KEYS.properties, queryFn: getProperties });

  const rows = useMemo(() => {
    const tenants = new Map((tenantsQuery.data ?? []).map((t) => [t.id, t]));
    return (duesQuery.data ?? [])
      .filter(isOpenDue)
      .map((d) => {
        const t = tenants.get(d.tenant_id);
        const sendOn = addCalendarDays(d.due_date, -3);
        return {
          due: d,
          tenant: t,
          sendOn,
          status: sent[d.id] ? "sent" : "scheduled",
        };
      })
      .sort((a, b) => a.sendOn.getTime() - b.sendOn.getTime());
  }, [duesQuery.data, tenantsQuery.data, sent]);

  const sendNow = async (dueId: string) => {
    setBusyId(dueId);
    setError(null);
    try {
      const token = await createDueToken(dueId);
      const next = { ...sent, [dueId]: new Date().toISOString() };
      localStorage.setItem(SENT_KEY, JSON.stringify(next));
      setSent(next);
      if (token.wa_me) window.open(token.wa_me, "_blank");
      else if (token.url) window.open(token.url, "_blank");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn’t send. Tenant needs a linked phone on an active join."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <QueryState
      isLoading={duesQuery.isLoading || tenantsQuery.isLoading}
      isError={duesQuery.isError}
      error={duesQuery.error as Error | null}
      onRetry={() => duesQuery.refetch()}
    >
      <div className="space-y-4 max-w-3xl">
        <div className="rounded-[14px] bg-accent-tint border border-accent/20 px-5 py-4 t-body-sm text-accent">
          Open dues get a reminder three days before the due date. Send now opens WhatsApp with the amount and due
          code. Automatic send needs a pg-go scheduled job — see docs/REMINDERS.md.
        </div>
        {error && <div className="rounded-[14px] bg-danger-tint text-danger p-3 t-body-sm">{error}</div>}
        <div className="rounded-[14px] border border-hairline bg-surface overflow-hidden">
          {rows.length === 0 && (
            <div className="px-5 py-10 text-center t-body-sm text-ink-muted">No open dues to remind.</div>
          )}
          {rows.map((r) => (
            <div key={r.due.id} className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-hairline last:border-0">
              <div className="min-w-0 flex-1">
                <div className="t-body font-semibold">{r.tenant?.name ?? r.due.tenant_id}</div>
                <div className="t-body-sm text-ink-muted">Room {r.tenant?.room_number ?? "—"}</div>
                <div className="t-caption text-ink-muted">{formatDueSentence(r.due)}</div>
                <div className="t-code text-ink-faint mt-0.5">{r.due.due_code}</div>
              </div>
              <AmountBadge amount={r.due.amount} />
              <div className="text-right w-32">
                <span className="inline-flex rounded-full px-2.5 py-0.5 t-caption font-medium bg-accent-tint text-accent">
                  {r.status === "sent" ? "Sent" : "Scheduled"}
                </span>
                <div className="t-date text-ink-faint mt-1">
                  {r.status === "sent" ? "Sent" : `Sends ${formatDate(r.sendOn.toISOString())}`}
                </div>
              </div>
              {r.status === "scheduled" ? (
                <button
                  type="button"
                  disabled={busyId === r.due.id || !r.tenant?.phone}
                  onClick={() => sendNow(r.due.id)}
                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 t-caption font-semibold text-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {busyId === r.due.id ? "Sending…" : "Send now"}
                </button>
              ) : (
                <span className="t-caption text-ink-faint">Delivered</span>
              )}
              {!r.tenant?.phone && r.status === "scheduled" && (
                <p className="w-full t-caption text-danger">No phone on file — attach phone on Tenants.</p>
              )}
            </div>
          ))}
        </div>
        <p className="t-caption text-ink-faint">{propsQuery.data?.[0]?.name ?? "Property"} · T−3 cadence from ledger due dates</p>
      </div>
    </QueryState>
  );
};
