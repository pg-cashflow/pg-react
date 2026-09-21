import React from "react";
import { MapPinOff } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const NotFoundView: React.FC = () => {
  return (
    <div className="min-h-screen grid place-items-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <div className="grid h-12 w-12 mx-auto place-items-center rounded-[14px] bg-accent-tint text-accent">
          <MapPinOff className="h-6 w-6" />
        </div>
        <div className="t-display-num text-ink-faint mt-6">404</div>
        <h1 className="t-h2 mt-2">This page isn't on the ledger</h1>
        <p className="t-body-sm text-ink-muted mt-2">We couldn't find this path in PG Cashflow.</p>
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-[10px] mt-8 px-5 font-semibold bg-accent text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
};
