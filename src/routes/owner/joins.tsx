import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { activateJoin, getJoinRequests, rejectJoin } from "@/api/join";
import { getTenantIdPhotoBlob, getTenants } from "@/api/tenants";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { QueryState } from "@/components/shared/QueryState";
import { formatDate, rupeesToPaise } from "@/lib/utils";
import type { JoinRequest } from "@pg/types";

export const JoinsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<JoinRequest | null>(null);
  const [room, setRoom] = useState("");
  const [rent, setRent] = useState("");
  const [dueDay, setDueDay] = useState(5);
  const [deposit, setDeposit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const awaitingQuery = useQuery({
    queryKey: [...QUERY_KEYS.joinRequests, "approved"],
    queryFn: () => getJoinRequests("approved"),
    refetchInterval: 15000,
  });

  const incompleteQuery = useQuery({
    queryKey: [...QUERY_KEYS.joinRequests, "pending"],
    queryFn: () => getJoinRequests("pending"),
    refetchInterval: 15000,
  });

  const tenantsQuery = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: getTenants,
    refetchInterval: 15000,
  });

  const activateMutation = useMutation({
    mutationFn: () => {
      if (!active) throw new Error("No request selected");
      const rentPaise = rupeesToPaise(rent);
      if (rentPaise <= 0) throw new Error("Rent is required");
      if (dueDay < 1 || dueDay > 28) throw new Error("Due day must be 1–28");
      return activateJoin(active.id, {
        room_number: room.trim() || undefined,
        rent_amount: rentPaise,
        due_day: dueDay,
        deposit_amount: deposit.trim() ? rupeesToPaise(deposit) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.joinRequests });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
      setActive(null);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectJoin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.joinRequests }),
  });

  const pendingTenantIds = new Set(
    (tenantsQuery.data ?? [])
      .filter((t) => t.status === "pending_allocation")
      .map((t) => t.id)
  );
  const awaiting = (awaitingQuery.data ?? []).filter(
    (j) => j.tenant_id && pendingTenantIds.has(j.tenant_id)
  );
  const incomplete = incompleteQuery.data ?? [];
  const isLoading = awaitingQuery.isLoading || incompleteQuery.isLoading || tenantsQuery.isLoading;
  const isError = awaitingQuery.isError || incompleteQuery.isError || tenantsQuery.isError;
  const err = (awaitingQuery.error || incompleteQuery.error || tenantsQuery.error) as Error | null;

  const openAssign = async (j: JoinRequest) => {
    setActive(j);
    setRoom("");
    setRent("");
    setDueDay(5);
    setDeposit("");
    setError(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    if (j.tenant_id) {
      try {
        const blob = await getTenantIdPhotoBlob(j.tenant_id);
        setPhotoUrl(URL.createObjectURL(blob));
      } catch {
        // photo optional in UI if missing
      }
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-400">
        Invite code already authorized these people. Assign room, rent, and due day here — pay unlocks after
        assignment. Reject only incomplete profiles that never finished onboarding.
      </p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
          Awaiting room & rent
        </h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={err}
            isEmpty={!isLoading && awaiting.length === 0}
            emptyMessage="No tenants waiting for room/rent assignment."
            onRetry={() => {
              awaitingQuery.refetch();
              incompleteQuery.refetch();
              tenantsQuery.refetch();
            }}
          >
            <div className="divide-y divide-slate-800">
              {awaiting.map((j) => (
                <div key={j.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-slate-100">{j.name || "Unnamed"}</p>
                    <p className="text-xs text-slate-400 font-mono">{j.phone}</p>
                    {j.parent_name && (
                      <p className="text-xs text-slate-500">Parent: {j.parent_name}</p>
                    )}
                    {j.emergency_phone && (
                      <p className="text-xs text-slate-500 font-mono">Emergency: {j.emergency_phone}</p>
                    )}
                    {j.permanent_address && (
                      <p className="text-xs text-slate-500 truncate">Home: {j.permanent_address}</p>
                    )}
                    {j.current_address && (
                      <p className="text-xs text-slate-500 truncate">Current: {j.current_address}</p>
                    )}
                    {j.joined_on && (
                      <p className="text-xs text-slate-500">Joined {formatDate(j.joined_on)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => void openAssign(j)}
                    className="px-3 py-2 rounded-xl bg-primary text-slate-950 text-sm font-semibold shrink-0"
                  >
                    Assign room & rent
                  </button>
                </div>
              ))}
            </div>
          </QueryState>
        </div>
      </section>

      {incomplete.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Incomplete profiles
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
            {incomplete.map((j) => (
              <div key={j.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="font-medium text-slate-100">{j.name || "Unnamed"}</p>
                  <p className="text-xs text-slate-400 font-mono">{j.phone}</p>
                  <p className="text-xs text-slate-500">{formatDate(j.created_at)}</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Reject ${j.name || j.phone}?`)) rejectMutation.mutate(j.id);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-rose-400 text-sm"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              activateMutation.mutate();
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-3 my-8"
          >
            <h3 className="text-lg font-bold text-slate-100">
              Assign terms — {active.name || active.phone}
            </h3>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="text-xs text-slate-400 space-y-1 rounded-xl bg-slate-800/60 p-3">
              {active.parent_name && <p>Parent: {active.parent_name}</p>}
              {active.emergency_phone && <p className="font-mono">Emergency: {active.emergency_phone}</p>}
              {active.permanent_address && <p>Home: {active.permanent_address}</p>}
              {active.current_address && <p>Current: {active.current_address}</p>}
            </div>
            {photoUrl && (
              <img src={photoUrl} alt="ID photo" className="w-full max-h-48 object-contain rounded-xl bg-slate-800" />
            )}
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Room number"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100"
            />
            <input
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="Monthly rent (₹)"
              type="number"
              min={1}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100"
            />
            <input
              value={dueDay}
              onChange={(e) => setDueDay(Number(e.target.value))}
              type="number"
              min={1}
              max={28}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100"
            />
            <input
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="Deposit (₹, optional — defaults to rent)"
              type="number"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(null);
                }}
                className="px-3 py-2 text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activateMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-slate-950 font-semibold text-sm disabled:opacity-50"
              >
                {activateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
                Confirm assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
