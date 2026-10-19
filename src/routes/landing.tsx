import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  KeyRound,
  Home,
  Receipt,
  QrCode,
  Lock,
  ArrowRight,
  Flame,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const ROLES = [
  {
    icon: Home,
    title: "Tenants",
    tagline: "Move in with dignity, not paper registers",
    description: "Scan your room-bound code, complete instant Aadhaar verification, and pay rent with UPI.",
    benefits: [
      "Room & floor-bound invite code",
      "UIDAI Aadhaar OTP verification in 20 seconds",
      "Pay dues via UPI QR or deep link with instant UTR slip",
      "Keep your on-time streak flame burning to earn perks",
    ],
    ctaText: "Join with room code",
    ctaLink: "/",
  },
  {
    icon: KeyRound,
    title: "Property Owners",
    tagline: "One single ledger for every rupee and room",
    description: "Track dues across all properties, reconcile bank statements, and stop chasing payments on WhatsApp.",
    benefits: [
      "Consolidated live dues ledger across all rooms",
      "Automated bank statement CSV and 12-digit UTR reconciliation",
      "Every tenant identity-checked via Aadhaar before move-in",
      "Provision wardens with restricted property-level access",
    ],
    ctaText: "Open owner portal",
    ctaLink: "/login",
  },
  {
    icon: ClipboardList,
    title: "Wardens & Managers",
    tagline: "Hallway-ready ops from your phone",
    description: "Log in with owner-issued credentials to manage the floor: inspections, daily headcount, and meters.",
    benefits: [
      "Owner-provisioned credentials scoped to assigned property",
      "Room inspection audits with mandatory photo failure proof",
      "Daily kitchen meal headcount forecast for breakfast, lunch, and dinner",
      "Log electricity sub-meters and resolve safety hazards",
    ],
    ctaText: "Manager sign in",
    ctaLink: "/login",
  },
];

const FUNDAMENTALS = [
  {
    icon: ShieldCheck,
    title: "Real identity, not a selfie photo",
    description: "UIDAI Aadhaar OTP verification as the first gate. DPDP Act 2023 compliant, zero plain-text storage.",
  },
  {
    icon: QrCode,
    title: "Room & floor-bound invite codes",
    description: "Codes are generated per bed and room. Tenants land precisely where they are assigned.",
  },
  {
    icon: Receipt,
    title: "Rent without the WhatsApp chase",
    description: "Automated due codes (PG-XXXXXX), instant dynamic UPI QR, and one-click reminder tokens.",
  },
  {
    icon: Lock,
    title: "Owner-controlled access scopes",
    description: "Wardens see only their building's daily checklist. Owner bank reserves and VPAs stay private.",
  },
];

const VERIFICATION_STEPS = [
  {
    step: "01",
    title: "Enter the room code",
    description: "Issued by the owner or warden — bound to a specific building, floor, and room. Never guessable.",
  },
  {
    step: "02",
    title: "Phone authentication",
    description: "Secure one-time phone passcode verifies your mobile number before any records are created.",
  },
  {
    step: "03",
    title: "Aadhaar OTP — ~20s fast path",
    description: "Government-backed check confirms your real name, DOB, and masked UID. Zero document photos required.",
  },
  {
    step: "04",
    title: "Manual review fallback",
    description: "If Aadhaar OTP cannot complete, upload documents for manual review by your owner. Never left in limbo.",
  },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent-tint selection:text-accent">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface/90 backdrop-blur-md">
        <nav className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
            </span>
            <Link to="/" className="t-h3 font-bold tracking-tight text-ink hover:text-accent transition-colors">
              PG Cashflow
            </Link>
            {/* <span className="hidden sm:inline-flex items-center rounded-full bg-accent-tint px-2 py-0.5 t-caption font-semibold text-accent border border-hairline">
              pg-go
            </span> */}
          </div>

          <div className="hidden md:flex items-center gap-6 t-body-sm font-medium text-ink-muted">
            <a href="#roles" className="hover:text-ink transition-colors">Portals</a>
            <a href="#fundamentals" className="hover:text-ink transition-colors">The Ledger</a>
            <a href="#verification" className="hover:text-ink transition-colors">Aadhaar KYC</a>
            <a href="#security" className="hover:text-ink transition-colors">Security</a>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              to="/"
              className="hidden sm:inline-flex items-center h-9 px-3.5 rounded-[10px] border border-hairline bg-surface t-caption font-semibold text-ink hover:bg-bg transition-colors"
            >
              Join with code
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center h-9 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold hover:opacity-95 transition-opacity"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-12 sm:pt-20 pb-12 px-4 sm:px-6 mx-auto max-w-5xl text-center">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 t-caption text-ink-muted mb-6 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <span>Now verifying with Aadhaar OTP in under 30 seconds · DPDP Act 2023 compliant</span>
          </div> */}

          <h1 className="t-display sm:leading-tight font-bold tracking-tight text-ink max-w-[22ch] mx-auto">
            Run your PG, not your paperwork.
          </h1>

          <p className="t-body sm:t-h3 text-ink-muted mt-4 max-w-[56ch] mx-auto leading-relaxed">
            One ledger for rent, rooms, and real identity verification — built for PG and hostel owners who are done chasing payments on WhatsApp.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Link
              to="/login"
              className="h-11 inline-flex items-center justify-center rounded-[10px] bg-accent text-white px-6 t-body font-semibold hover:opacity-95 shadow-sm gap-2"
            >
              <span>Get your PG onboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="h-11 inline-flex items-center justify-center rounded-[10px] border border-hairline bg-surface px-5 t-body font-semibold text-ink hover:bg-bg gap-2"
            >
              <QrCode className="w-4 h-4 text-ink-muted" />
              <span>Join with a room code</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mt-10 t-caption text-ink-muted">
            <div className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>Aadhaar-verified tenants</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>Room &amp; floor-bound codes</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>Owner-controlled access</span>
            </div>
          </div>

          {/* Authentic Live Ledger Mock Card */}
          <div className="mt-12 rounded-[14px] border border-hairline bg-surface shadow-md overflow-hidden text-left">
            <div className="px-4 py-3 border-b border-hairline bg-bg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
                <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
                <span className="w-2.5 h-2.5 rounded-full bg-hairline" />
                <span className="ml-2 t-caption font-semibold text-ink-muted hidden sm:inline">
                  Greenfield PG · Koramangala 4th Block, Bengaluru
                </span>
              </div>
              <div className="flex items-center gap-2 t-caption text-ink-muted font-medium">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span>Ledger in sync</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hairline bg-surface">
              <div className="p-5">
                <div className="t-caption text-ink-muted">Rent collected this month</div>
                <div className="t-amount-lg text-ink mt-1">₹4,20,000</div>
                <div className="t-caption text-success font-semibold mt-1">↑ 96% on-time · 32/34 rooms settled</div>
              </div>
              <div className="p-5">
                <div className="t-caption text-ink-muted">Occupancy</div>
                <div className="t-amount-lg text-ink mt-1">38 / 40</div>
                <div className="t-caption text-accent font-semibold mt-1">↑ 2 tenants verified today</div>
              </div>
              <div className="p-5">
                <div className="t-caption text-ink-muted">Identity verified</div>
                <div className="t-amount-lg text-ink mt-1">100%</div>
                <div className="t-caption text-ink-muted font-semibold mt-1">UIDAI Aadhaar OTP · 0 paper forms</div>
              </div>
            </div>

            {/* Simulated Live Table Strip */}
            <div className="border-t border-hairline bg-bg px-4 py-3 text-ink-muted hidden sm:block">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 px-3 rounded-[8px] bg-surface border border-hairline t-body-sm">
                  <div className="flex items-center gap-3">
                    <span className="t-code font-medium text-ink">Room 204-B</span>
                    <span className="text-ink font-semibold">Rahul Verma</span>
                    <span className="rounded-full bg-accent-tint px-2 py-0.5 t-caption text-accent font-medium">Aadhaar verified</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="t-code text-ink-muted">UTR: 429188201948</span>
                    <span className="t-amount text-ink font-semibold">₹8,500</span>
                    <span className="inline-flex items-center gap-1 text-success t-caption font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                    </span>
                    <span className="t-caption text-ink-muted inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-accent" /> 5 mo streak
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5 px-3 rounded-[8px] bg-surface border border-hairline t-body-sm">
                  <div className="flex items-center gap-3">
                    <span className="t-code font-medium text-ink">Room 102-A</span>
                    <span className="text-ink font-semibold">Priya Nambiar</span>
                    <span className="rounded-full bg-accent-tint px-2 py-0.5 t-caption text-accent font-medium">Aadhaar verified</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="t-code text-ink-muted">UPI QR Match</span>
                    <span className="t-amount text-ink font-semibold">₹9,200</span>
                    <span className="inline-flex items-center gap-1 text-success t-caption font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                    </span>
                    <span className="t-caption text-ink-muted inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-accent" /> 8 mo streak
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles / Three Vantage Points */}
        <section id="roles" className="border-t border-hairline py-16 px-4 sm:px-6 mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="t-caption uppercase font-semibold text-accent tracking-wider mb-2">Three Doors, One Ledger</div>
            <h2 className="t-h1 text-ink">Built around three people, not one dashboard</h2>
            <p className="t-body text-ink-muted mt-2">
              Every role gets exactly what it needs — nothing borrowed from someone else's screen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="rounded-[14px] border border-hairline bg-surface p-6 flex flex-col justify-between hover:border-accent/40 transition-colors"
                >
                  <div>
                    <div className="w-10 h-10 rounded-[10px] bg-accent-tint text-accent flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="t-h2 text-ink">{role.title}</h3>
                    <p className="t-caption text-accent font-medium mt-0.5">{role.tagline}</p>
                    <p className="t-body-sm text-ink-muted mt-2.5 leading-relaxed">{role.description}</p>

                    <ul className="mt-5 space-y-2">
                      {role.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 t-body-sm text-ink-muted">
                          <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-hairline">
                    <Link
                      to={role.ctaLink}
                      className="inline-flex items-center gap-1.5 t-body-sm font-semibold text-accent hover:underline"
                    >
                      <span>{role.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Fundamentals */}
        <section id="fundamentals" className="border-t border-hairline bg-surface/50 py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl mb-12">
              <div className="t-caption uppercase font-semibold text-accent tracking-wider mb-2">What is actually inside</div>
              <h2 className="t-h1 text-ink">The fundamentals, done properly</h2>
              <p className="t-body text-ink-muted mt-2">
                Not a bloated feature list — the exact parts that stop a PG from running on guesswork and WhatsApp chats.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FUNDAMENTALS.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-[14px] border border-hairline bg-surface p-5 flex flex-col justify-between">
                    <div>
                      <div className="w-9 h-9 rounded-[8px] bg-accent-tint text-accent flex items-center justify-center mb-3.5">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <h4 className="t-h3 text-ink">{f.title}</h4>
                      <p className="t-body-sm text-ink-muted mt-2 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Verification & Trust Flow */}
        <section id="verification" className="border-t border-hairline py-16 px-4 sm:px-6 mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="t-caption uppercase font-semibold text-accent tracking-wider mb-2">Security, shown not claimed</div>
              <h2 className="t-h1 text-ink">How a tenant actually gets verified</h2>
              <p className="t-body text-ink-muted mt-2 mb-8">
                Every tenant is checked against official records before keys are handed over.
              </p>

              <div className="space-y-4">
                {VERIFICATION_STEPS.map((v) => (
                  <div key={v.step} className="flex gap-4 p-4 rounded-[12px] border border-hairline bg-surface">
                    <span className="t-code text-accent font-bold text-sm shrink-0 mt-0.5">{v.step}</span>
                    <div>
                      <h4 className="t-h3 text-ink font-semibold">{v.title}</h4>
                      <p className="t-body-sm text-ink-muted mt-1 leading-relaxed">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="security" className="lg:col-span-5">
              <div className="rounded-[14px] border border-hairline bg-surface p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-accent" />
                  <h3 className="t-h3 text-ink">Security Invariants</h3>
                </div>
                <p className="t-body-sm text-ink-muted mb-5 leading-relaxed">
                  Engineered from day one around financial fidelity and the DPDP Act 2023.
                </p>

                <div className="space-y-3.5 t-body-sm text-ink-muted">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Identity checked before move-in, every single time.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>No bare, guessable invite codes — bound to floor and room.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Zero cleartext Aadhaar number storage; masked UID only.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Owner stays in control of every staff and manager grant.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>Access immediately revoked upon move-out or notice.</span>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-hairline">
                  <div className="t-caption text-ink-muted">Authorized Integration</div>
                  <div className="t-body-sm font-semibold text-ink mt-0.5">UIDAI · DigiLocker Tier 1 · Cashfree Gateway</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Owner Onboarding Callout */}
        <section className="border-t border-hairline py-16 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[14px] border border-hairline bg-surface p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-sm">
              <div className="t-caption uppercase font-semibold text-accent tracking-wider mb-2">For PG &amp; Hostel Owners</div>
              <h2 className="t-h1 text-ink">Already running a PG the hard way?</h2>
              <p className="t-body text-ink-muted mt-3 max-w-xl mx-auto leading-relaxed">
                If chasing rent on WhatsApp, cross-checking bank slips by eye, and keeping paper registers sounds familiar — switch your property to PG Cashflow.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <Link
                  to="/login"
                  className="h-11 inline-flex items-center justify-center rounded-[10px] bg-accent text-white px-6 t-body font-semibold hover:opacity-95 shadow-sm"
                >
                  Sign in to your ledger
                </Link>
                <Link
                  to="/"
                  className="h-11 inline-flex items-center justify-center rounded-[10px] border border-hairline bg-bg px-6 t-body font-semibold text-ink hover:bg-surface"
                >
                  Join as a tenant
                </Link>
              </div>
            </div>

            <div className="mt-10">
              <PwaInstallPrompt />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline bg-surface py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="t-h3 font-bold text-ink">PG Cashflow</span>
            <span className="t-body-sm text-ink-muted">· Built for Indian PGs and hostels.</span>
          </div>

          <div className="flex items-center gap-6 t-caption font-medium text-ink-muted">
            <Link to="/" className="hover:text-ink transition-colors">Join Property</Link>
            <Link to="/login" className="hover:text-ink transition-colors">Owner Sign In</Link>
            <a href="#roles" className="hover:text-ink transition-colors">Portals</a>
            <a href="#security" className="hover:text-ink transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
