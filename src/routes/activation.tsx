import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useAuth } from "@/auth/context";
import { homeForRole } from "@/auth/roles";

export const ActivationCelebration: React.FC<{ role?: string }> = ({ role }) => {
  const navigate = useNavigate();
  const { role: authRole, isPendingJoin, consumeActivation } = useAuth();

  const queryRole =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("role")
      : null;

  const effectiveRole = role || queryRole || authRole || "tenant";
  const dest = homeForRole(effectiveRole, isPendingJoin);

  const copy =
    effectiveRole === "owner"
      ? { headline: "You're live!", line: "Your property is on the ledger.", cta: "Open your portal" }
      : effectiveRole === "manager"
        ? { headline: "You're in!", line: "Your floors are assigned. Operations are yours.", cta: "Start your first round" }
        : { headline: "You're in!", line: "Your room is on the ledger.", cta: "Go to your passbook" };

  const handleCta = () => {
    consumeActivation();
    navigate({ to: dest });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <Flame className="mx-auto h-16 w-16 text-accent" strokeWidth={1.75} aria-hidden />
        <h1 className="t-h1 mt-6">{copy.headline}</h1>
        <p className="t-body text-ink-muted mt-2">{copy.line}</p>
        <button
          type="button"
          onClick={handleCta}
          className="w-full h-12 font-semibold mt-8 rounded-[10px] bg-accent text-white hover:bg-accent-pressed transition active:scale-95"
        >
          {copy.cta}
        </button>
      </div>
    </div>
  );
};

export const ActivationPage = ActivationCelebration;
