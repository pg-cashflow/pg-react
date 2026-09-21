import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { lookupInvite } from "@/api/join";
import { setInviteCode } from "@/auth/storage";
import { ApiError } from "@/api/client";
import AuthLayout from "@/components/layout/AuthLayout";
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
    <div className="relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <AuthLayout
        icon={Building2}
        title="Join a property"
        subtitle="Enter the invite from your owner. Owners can skip and sign in."
        footer={
          <button
            type="button"
            onClick={() => {
              setInviteCode("");
              navigate({ to: "/login" });
            }}
            className="text-ink-muted hover:text-ink"
          >
            I am the owner — sign in
          </button>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-[10px] bg-danger-tint border border-danger/20 text-danger text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {property && (
          <div className="mb-4 p-3 rounded-[10px] bg-success-tint border border-success/20 text-success text-sm font-medium">
            {property.property_name} · {property.owner_name}
          </div>
        )}

        <form onSubmit={handleLookup} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Invite code"
            className="w-full h-12 px-4 bg-bg border border-hairline rounded-[10px] text-ink font-mono tracking-widest text-center text-base focus:outline-none focus:ring-2 focus:ring-accent"
            autoCapitalize="characters"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-[10px] bg-accent text-white font-semibold text-sm hover:bg-accent-pressed disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {property && (
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="mt-3 w-full h-12 rounded-[10px] bg-accent-tint text-accent border border-accent/20 font-semibold text-sm"
          >
            Sign in to join
          </button>
        )}
      </AuthLayout>
    </div>
  );
};
