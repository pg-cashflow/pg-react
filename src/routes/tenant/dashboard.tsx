import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyDues, getMyPayments, getMyProfile, submitAadhaar } from "@/api/tenant";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { AmountBadge } from "@/components/shared/AmountBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { QueryState } from "@/components/shared/QueryState";
import {
  formatDate,
  formatMatchedBy,
  countOverdueDues,
  sumOutstandingFromDues,
  displayDueStatus,
} from "@/lib/utils";
import { subscribeToPush } from "@/push/subscribe";
import { Receipt, CreditCard, Clock, ArrowUpRight, AlertTriangle } from "lucide-react";

interface TenantDashboardProps {
  onNavigate: (tab: string) => void;
}

export const TenantDashboardView: React.FC<TenantDashboardProps> = ({ onNavigate }) => {
  const [aadhaarQr, setAadhaarQr] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");
  const [consent, setConsent] = useState(false);
  const [aadhaarMsg, setAadhaarMsg] = useState<string | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const profileQuery = useQuery({ queryKey: QUERY_KEYS.tenantProfile, queryFn: getMyProfile });
  const duesQuery = useQuery({
    queryKey: QUERY_KEYS.tenantDues,
    queryFn: getMyDues,
    refetchInterval: 30000,
  });
  const paymentsQuery = useQuery({
    queryKey: QUERY_KEYS.tenantPayments,
    queryFn: getMyPayments,
    refetchInterval: 30000,
  });

  const isLoading = profileQuery.isLoading || duesQuery.isLoading || paymentsQuery.isLoading;
  const isError = profileQuery.isError || duesQuery.isError || paymentsQuery.isError;
  const error = profileQuery.error || duesQuery.error || paymentsQuery.error;

  const profile = profileQuery.data;
  const dues = duesQuery.data ?? profile?.active_dues ?? [];
  const payments = paymentsQuery.data ?? [];

  const totalOutstanding = sumOutstandingFromDues(dues);
  const overdueCount = countOverdueDues(dues);

  const recentDues = [...dues]
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
    .slice(0, 5);
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime())
    .slice(0, 5);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
      onRetry={() => {
        profileQuery.refetch();
        duesQuery.refetch();
        paymentsQuery.refetch();
      }}
      loadingMessage="Loading your dashboard..."
    >
      <div className="space-y-6">
        {profile && profile.status === "pending_allocation" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm text-amber-200">
            Your profile is in. The owner still needs to assign your room and rent. Pay stays locked until then.
          </div>
        )}

        {profile && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase mb-1">Welcome back</p>
            <h2 className="text-xl font-bold text-slate-100">{profile.name}</h2>
            {profile.room_number && (
              <p className="text-sm text-slate-400 mt-1">Room {profile.room_number}</p>
            )}
            {profile.aadhaar_last4 && (
              <p className="text-xs text-slate-500 mt-1">Aadhaar ****{profile.aadhaar_last4}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Outstanding</span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <AmountBadge amount={totalOutstanding} variant="warning" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Overdue</span>
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{overdueCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Recent Dues
              </h3>
              <button onClick={() => onNavigate("dues")} className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentDues.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No dues yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentDues.map((due) => (
                  <div key={due.id} className="py-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">{due.due_code} · Due {formatDate(due.due_date)}</p>
                    <div className="flex items-center gap-3">
                      <AmountBadge amount={due.amount} />
                      <StatusPill status={displayDueStatus(due)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Recent Payments
              </h3>
              <button onClick={() => onNavigate("payments")} className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No payments yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentPayments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {formatDate(p.matched_at)} · {formatMatchedBy(p.matched_by)}
                    </p>
                    <AmountBadge amount={p.amount} variant="success" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Aadhaar (optional)</h3>
          <p className="text-xs text-slate-500">Last-4 only. Paste Secure QR or enter last-4 with consent.</p>
          {aadhaarMsg && <p className="text-xs text-slate-300">{aadhaarMsg}</p>}
          <textarea
            value={aadhaarQr}
            onChange={(e) => setAadhaarQr(e.target.value)}
            rows={2}
            placeholder="QR payload"
            className="w-full px-3 py-2 bg-slate-800 rounded-xl text-sm text-slate-100"
          />
          <input
            value={aadhaarLast4}
            onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            placeholder="Last 4"
            className="w-full px-3 py-2 bg-slate-800 rounded-xl text-sm text-slate-100"
          />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I consent
          </label>
          <button
            onClick={async () => {
              try {
                const out = await submitAadhaar({
                  consent,
                  qr_payload: aadhaarQr.trim() || undefined,
                  uid_last4: aadhaarLast4 || undefined,
                  confirm: true,
                  channel: "tenant_app",
                });
                setAadhaarMsg(out.needs_confirm ? `Preview ${out.name ?? ""}` : "Saved");
                profileQuery.refetch();
              } catch (err) {
                setAadhaarMsg(err instanceof Error ? err.message : "Failed");
              }
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-100"
          >
            Save Aadhaar
          </button>
          <button
            onClick={async () => {
              try {
                await subscribeToPush();
                setPushMsg("Push enabled");
              } catch (err) {
                setPushMsg(err instanceof Error ? err.message : "Push failed");
              }
            }}
            className="ml-2 px-4 py-2 rounded-xl bg-slate-800 text-sm text-slate-100"
          >
            Enable rent reminders
          </button>
          {pushMsg && <p className="text-xs text-slate-400">{pushMsg}</p>}
        </div>
      </div>
    </QueryState>
  );
};
