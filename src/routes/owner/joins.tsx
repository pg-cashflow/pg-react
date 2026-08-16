import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { activateJoin, getJoinRequests, rejectJoin } from "@/api/join";
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

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.joinRequests,
    queryFn: () => getJoinRequests("pending"),
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
    },
    onError: (err: Error) => setError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectJoin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.joinRequests }),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        New phones join with your invite. Set room, rent, and due day here — tenants never send money terms.
      </p>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <QueryState
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          error={listQuery.error as Error | null}
          isEmpty={!listQuery.isLoading && rows.length === 0}
          emptyMessage="No pending join requests."
          onRetry={() => listQuery.refetch()}
        >
          <div className="divide-y divide-slate-800">
            {rows.map((j) => (
              <div key={j.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="font-medium text-slate-100">{j.name || "Unnamed"}</p>
                  <p className="text-xs text-slate-400 font-mono">{j.phone}</p>
                  {j.aadhaar_last4 && (
                    <p className="text-xs text-slate-500">Aadhaar ****{j.aadhaar_last4}</p>
                  )}
                  <p className="text-xs text-slate-500">{formatDate(j.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActive(j);
                      setNameDefaults(j);
                      setError(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-primary text-slate-950 text-sm font-semibold"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Reject ${j.name || j.phone}?`)) rejectMutation.mutate(j.id);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-rose-400 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              activateMutation.mutate();
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-3"
          >
            <h3 className="text-lg font-bold text-slate-100">Activate {active.name || active.phone}</h3>
            {error && <p className="text-xs text-rose-400">{error}</p>}
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
              <button type="button" onClick={() => setActive(null)} className="px-3 py-2 text-slate-400">
                Cancel
              </button>
              <button
                type="submit"
                disabled={activateMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-slate-950 font-semibold text-sm disabled:opacity-50"
              >
                {activateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
                Confirm activate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  function setNameDefaults(j: JoinRequest) {
    setRoom("");
    setRent("");
    setDueDay(5);
    setDeposit("");
    void j;
  }
};
