import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getJoinMe, submitJoinProfile } from "@/api/join";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { useAuth } from "@/auth/context";
import type { AadhaarPreview } from "@pg/types";

export const JoinWaitingPage: React.FC = () => {
  const { reExchangeFirebase, logout } = useAuth();
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [qr, setQr] = useState("");
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<AadhaarPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const meQuery = useQuery({
    queryKey: QUERY_KEYS.joinMe,
    queryFn: getJoinMe,
    refetchInterval: 15000,
  });

  const join = meQuery.data?.join;
  const message = meQuery.data?.message;

  const handlePreview = async () => {
    if (!qr.trim()) return;
    setError(null);
    setSaving(true);
    try {
      const out = await submitJoinProfile({ qr_payload: qr.trim(), consent: true, confirm: false });
      setPreview(out.aadhaar ?? null);
      if (out.aadhaar?.uid_last4) setLast4(out.aadhaar.uid_last4);
      if (out.aadhaar?.name && !name) setName(out.aadhaar.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR preview failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (qr.trim() && !consent) {
      setError("Consent is required to save Aadhaar details");
      return;
    }
    setSaving(true);
    try {
      await submitJoinProfile({
        name: name.trim(),
        uid_last4: last4.trim() || undefined,
        qr_payload: qr.trim() || undefined,
        consent: consent || !qr.trim(),
        confirm: true,
      });
      await meQuery.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await meQuery.refetch();
      if (result.data?.join.status === "approved") {
        await reExchangeFirebase();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh session");
    } finally {
      setRefreshing(false);
    }
  };

  if (join?.status === "approved") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-100">Room assigned</h1>
          <p className="text-sm text-slate-400">
            Your owner approved the join. Refresh your session to open the tenant portal.
          </p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="w-full py-3 rounded-xl bg-primary text-slate-950 font-semibold disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (join?.status === "rejected") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-100">Join declined</h1>
          <p className="text-sm text-slate-400">
            This invite request was rejected. Ask your owner for a new invite code.
          </p>
          <button onClick={logout} className="w-full py-3 rounded-xl bg-slate-800 text-slate-100 font-semibold">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
        <h1 className="text-xl font-bold text-slate-100">Waiting for your room</h1>
        <p className="text-sm text-slate-400">{message || "Owner will assign your room and rent."}</p>
        {join?.name && (
          <p className="text-xs text-slate-500">
            Profile: {join.name}
            {join.aadhaar_last4 ? ` · Aadhaar ****${join.aadhaar_last4}` : ""}
          </p>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm"
          />
          <input
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Aadhaar last 4 (optional)"
            maxLength={4}
            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm"
          />
          <textarea
            value={qr}
            onChange={(e) => setQr(e.target.value)}
            placeholder="Paste Aadhaar Secure QR payload (optional)"
            rows={3}
            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I consent to store Aadhaar last-4 only
          </label>
          {preview && (
            <p className="text-xs text-slate-400">
              Preview: {preview.name} · {preview.gender} · {preview.dob || preview.yob}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={saving || !qr.trim()}
              className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 text-sm disabled:opacity-50"
            >
              Preview QR
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-primary text-slate-950 font-semibold text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="w-full text-xs text-slate-400 hover:text-slate-200"
        >
          {refreshing ? "Checking…" : "Refresh status"}
        </button>
        <button type="button" onClick={logout} className="w-full text-xs text-rose-400">
          Sign out
        </button>
      </div>
    </div>
  );
};
