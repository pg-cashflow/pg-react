import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/api/events";
import { getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate, eventKey } from "@/lib/utils";
import { Activity, Send, CheckCircle2 } from "lucide-react";

export const EventsView: React.FC = () => {
  const { data: tenants = [] } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
  });

  const { data: events = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: getEvents,
  });

  const tenantMap = React.useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  const getEventIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("reminder") || lower.includes("push")) {
      return <Send className="w-4 h-4 text-accent" />;
    }
    if (lower.includes("payment") || lower.includes("paid") || lower.includes("cash")) {
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    }
    return <Activity className="w-4 h-4 text-accent" />;
  };

  return (
    <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-sm">
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isEmpty={!isLoading && !isError && events.length === 0}
        loadingMessage="Loading audit events..."
        emptyMessage="No events logged yet."
        onRetry={() => refetch()}
      >
        <div className="divide-y divide-hairline">
          {events.map((evt) => (
            <div key={eventKey(evt)} className="p-4 hover:bg-accent-tint transition flex items-start gap-3">
              <div className="p-2 rounded-xl bg-surface mt-0.5">{getEventIcon(evt.event_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink font-mono uppercase">
                    {evt.event_type}
                  </span>
                  <span className="text-xs text-ink-muted">{formatDate(evt.occurred_at)}</span>
                </div>
                {evt.tenant_id && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    Tenant: {tenantMap.get(evt.tenant_id) || evt.tenant_id}
                  </p>
                )}
                {evt.payload && (
                  <pre className="mt-2 p-2 rounded-lg bg-bg text-[11px] font-mono text-ink-muted overflow-x-auto border border-hairline/60">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
};
