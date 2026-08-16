import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { lookupInvite } from "@/api/join";
import { setInviteCode } from "@/auth/storage";
import { ApiError } from "@/api/client";

export const InvitePage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<{ property_name: string; owner_name: string } | null>(
    null
  );

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const out = await lookupInvite(trimmed);
      setInviteCode(trimmed);
      setProperty({ property_name: out.property_name, owner_name: out.owner_name });
    } catch (err) {
      setProperty(null);
      setError(err instanceof ApiError ? err.message : "Invalid invite code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 ring-8 ring-primary/5">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">PG / Hostel</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter the invite from your owner. Owners can skip and sign in.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {property && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
            {property.property_name} · {property.owner_name}
          </div>
        )}

        <form onSubmit={handleLookup} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 font-mono tracking-widest text-center"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-slate-950 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {property && (
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="mt-3 w-full py-3 rounded-xl bg-slate-800 text-slate-100 font-semibold text-sm"
          >
            Sign in to join
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setInviteCode("");
            navigate({ to: "/login" });
          }}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-200"
        >
          I am the owner — sign in
        </button>
      </div>
    </div>
  );
};
