import React from "react";
import { Link } from "@tanstack/react-router";

const FEATURES = [
  ["01", "Dues ledger", "Every payment reconciled against a UTR and a date."],
  ["02", "Streaks", "Pay on time, keep the flame burning, earn perks."],
  ["03", "Inspections", "A checklist per room, with photos and notes from the walk."],
  ["04", "Kitchen headcount", "Know exactly how many plates to cook."],
  ["05", "Meter readings", "Excess usage measured, charged, and explained."],
  ["06", "Hazard reports", "Fix it before it costs you."],
];

const PORTALS = [
  { name: "Tenant", lines: ["Pay dues and track your passbook", "Keep your on-time streak alive", "Dispute inspections with evidence"] },
  { name: "Owner", lines: ["One ledger for every tenant and rupee", "Verify payments by UTR, not by memory", "Approve joins with real KYC"] },
  { name: "Warden", lines: ["Walk the floor with a step checklist", "Log meters, headcount, and hazards", "Submit reports from the hallway"] },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-hairline bg-surface">
        <nav className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="t-h3 font-bold text-accent">
            PG Cashflow
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="t-body font-semibold text-ink-muted hover:text-ink px-3 py-2">
              Sign in
            </Link>
            <Link
              to="/"
              className="h-9 inline-flex items-center rounded-[10px] bg-accent text-white px-4 t-caption font-semibold"
            >
              Join a property
            </Link>
          </div>
        </nav>
        <div className="mx-auto max-w-5xl px-4 pt-14 pb-12">
          <p className="t-caption text-ink-muted">Rent ledgers for Indian hostels and PGs</p>
          <h1 className="t-display mt-2">Every due, every room, accounted for.</h1>
          <p className="t-body text-ink-muted mt-3 max-w-[52ch]">
            One ledger connects tenants, owners, and wardens. Rent tracking, streaks, inspections, and daily
            operations run on numbers everyone can trust.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/"
              className="h-11 inline-flex items-center rounded-[10px] bg-accent text-white px-5 t-body font-semibold"
            >
              Join a property
            </Link>
            <Link
              to="/login"
              className="h-11 inline-flex items-center rounded-[10px] border border-hairline px-5 t-body font-semibold"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="t-h1">One app, three vantage points</h2>
        <p className="t-body text-ink-muted mt-2">Each role sees the same numbers through its own portal.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {PORTALS.map((p) => (
            <div key={p.name} className="rounded-[14px] border border-hairline bg-surface p-4">
              <h3 className="t-h3">{p.name}</h3>
              <ul className="mt-2 space-y-1.5">
                {p.lines.map((l) => (
                  <li key={l} className="t-body-sm text-ink-muted">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="t-h1">The ledger, the floor, and the flame</h2>
          <p className="t-body text-ink-muted mt-2">Six records replace the registers, notepads, and guesswork.</p>
          <div className="mt-6 rounded-[14px] border border-hairline overflow-hidden">
            {FEATURES.map(([n, title, desc], i) => (
              <div
                key={n}
                className={`flex flex-col md:flex-row gap-1 md:gap-4 px-4 py-4 bg-bg ${
                  i !== FEATURES.length - 1 ? "border-b border-hairline" : ""
                }`}
              >
                <div className="t-code text-ink-faint w-7">{n}</div>
                <div className="t-body font-semibold md:w-52 shrink-0">{title}</div>
                <div className="t-body-sm text-ink-muted">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col md:flex-row justify-between gap-3">
          <div>
            <div className="t-h3 font-bold text-accent">PG Cashflow</div>
            <div className="t-body-sm text-ink-muted">Rent ledgers for Indian hostels.</div>
          </div>
          <Link to="/login" className="t-body-sm font-semibold text-ink-muted hover:text-ink">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
};
