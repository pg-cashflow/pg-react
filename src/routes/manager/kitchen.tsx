import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { getManagerKitchenHeadcount, listManagerInspections } from "@/api/gamification";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useManagerAction } from "@/components/layout/ManagerShell";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

export const KitchenHeadcountView: React.FC = () => {
  const { user } = useAuth();
  const setAction = useManagerAction();
  const propertyId = user?.property_id || "";
  const [dayOffset, setDayOffset] = useState(0);

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const iso = date.toISOString().slice(0, 10);
  const dateLabel = date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  const headcountQuery = useQuery({
    queryKey: QUERY_KEYS.managerHeadcount(propertyId, iso),
    queryFn: () => getManagerKitchenHeadcount(propertyId, iso),
    enabled: !!propertyId,
  });
  const inspectionsQuery = useQuery({
    queryKey: QUERY_KEYS.managerInspections(propertyId),
    queryFn: () => listManagerInspections(propertyId),
    enabled: !!propertyId,
  });

  const hc = headcountQuery.data?.headcount;
  const flagged = (inspectionsQuery.data ?? [])
    .filter((r) => new Date(r.inspected_at).toDateString() === date.toDateString())
    .reduce((n, r) => n + (r.items?.filter((i) => !i.passed).length ?? (r.passed ? 0 : 1)), 0);

  const meals = [
    { name: "Breakfast", n: hc?.breakfast ?? 0 },
    { name: "Lunch", n: hc?.lunch ?? 0 },
    { name: "Dinner", n: hc?.dinner ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setDayOffset((d) => d - 1)}
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-hairline bg-surface"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="t-h2">{dayOffset === 0 ? "Today" : dateLabel.split(",")[0]}</div>
          <div className="t-body-sm text-ink-muted">{dateLabel}</div>
        </div>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => setDayOffset((d) => d + 1)}
          className="grid h-10 w-10 place-items-center rounded-[10px] border border-hairline bg-surface"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <Link
        to="/manager/inspections"
        className="flex items-center gap-4 rounded-[14px] border border-hairline bg-surface px-4 py-4"
      >
        <div className={`grid h-11 w-11 place-items-center rounded-[10px] ${flagged ? "bg-danger-tint text-danger" : "bg-accent-tint text-accent"}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="t-h3">Flagged today</div>
          <div className="t-body-sm text-ink-muted">
            {flagged === 0 ? "Nothing flagged in today's rounds" : `${flagged} failed items from today's rounds`}
          </div>
        </div>
        <div className="t-display-num">{flagged}</div>
      </Link>

      {meals.map((m) => (
        <div key={m.name} className="flex items-center gap-4 rounded-[14px] border border-hairline bg-surface px-4 py-4">
          <div className="flex-1">
            <div className="t-h3">{m.name}</div>
            <div className="t-caption text-ink-muted">Tenant RSVPs</div>
          </div>
          <div className="t-display-num text-accent">{m.n}</div>
        </div>
      ))}
      <div className="rounded-[14px] bg-accent-tint px-4 py-3 t-body-sm text-accent">
        Counts are tenant RSVPs only. Kitchen staff should add staff and guest plates on top.
      </div>
    </div>
  );
};
