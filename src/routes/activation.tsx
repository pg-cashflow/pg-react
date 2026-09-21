import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export const ActivationCelebration: React.FC<{ role?: string }> = ({ role = "tenant" }) => {
  const navigate = useNavigate();
  const dest = role === "owner" ? "/owner/dashboard" : role === "manager" ? "/manager/kitchen" : "/tenant";
  const copy =
    role === "owner"
      ? { headline: "You're live!", line: "Your property is on the ledger.", cta: "Open your portal" }
      : role === "manager"
        ? { headline: "You're in!", line: "Your floors are assigned. Operations are yours.", cta: "Start your first round" }
        : { headline: "You're in!", line: "Your room is on the ledger.", cta: "Go to your passbook" };

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <Flame className="mx-auto h-16 w-16 text-accent" strokeWidth={1.75} aria-hidden />
        <h1 className="t-h1 mt-6">{copy.headline}</h1>
        <p className="t-body text-ink-muted mt-2">{copy.line}</p>
        <button
          type="button"
          onClick={() => navigate({ to: dest })}
          className="w-full h-12 font-semibold mt-8 rounded-[10px] bg-accent text-white"
        >
          {copy.cta}
        </button>
      </div>
    </div>
  );
};

export const ActivationPage = ActivationCelebration;
