import React from "react";
import { MapPinOff, ArrowLeft, Home } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/auth/context";
import { homeForRole } from "@/auth/roles";

export const NotFoundView: React.FC = () => {
  const { isAuthenticated, role, isPendingJoin } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const homeDest = isAuthenticated ? homeForRole(role, isPendingJoin) : "/";

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-accent-tint text-accent shadow-sm">
          <MapPinOff className="h-7 w-7" />
        </div>
        <div className="t-display-num text-ink-faint mt-6">404</div>
        <h1 className="t-h2 mt-2">This page isn't on the ledger</h1>
        <p className="t-body-sm text-ink-muted mt-2 max-w-sm mx-auto">
          We couldn't find <span className="font-mono text-ink text-xs bg-surface px-1.5 py-0.5 rounded border border-hairline">{path}</span> in PG Cashflow.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            to={homeDest}
            className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-6 font-semibold bg-accent text-white hover:bg-accent/90 transition shadow-sm"
          >
            <Home className="w-4 h-4" />
            Go to {isAuthenticated ? "Dashboard" : "Home"}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 font-semibold border border-hairline bg-surface text-ink hover:bg-bg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
};
