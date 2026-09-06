import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { lookupInvite } from "@/api/join";
import { setInviteCode } from "@/auth/storage";
import { ApiError } from "@/api/client";
import { ThemeToggle } from "@/components/common/ThemeToggle";

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
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 relative transition-colors">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-surface border border-hairline rounded-2xl shadow-xl p-8 transition-colors">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent-tint text-accent flex items-center justify-center mb-4 ring-8 ring-accent/5">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-ink">PG / Hostel</h1>
          <p className="text-sm text-ink-muted mt-1">
            Enter the invite from your owner. Owners can skip and sign in.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-tint border border-danger/20 text-danger text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {property && (
          <div className="mb-4 p-3 rounded-xl bg-success-tint border border-success/20 text-success text-sm font-medium">
            {property.property_name} · {property.owner_name}
          </div>
        )}

        <form onSubmit={handleLookup} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            className="w-full px-4 py-2.5 bg-bg border border-hairline rounded-xl text-ink font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-accent"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-pressed transition active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {property && (
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="mt-3 w-full py-3 rounded-xl bg-accent-tint text-accent border border-accent/20 font-semibold text-sm hover:bg-accent-tint/80 transition"
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
          className="mt-4 w-full text-center text-xs text-ink-muted hover:text-ink transition"
        >
          I am the owner — sign in
        </button>
      </div>
    </div>
  );
};
