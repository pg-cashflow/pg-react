import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distHtmlPath = path.resolve(__dirname, "../dist/index.html");

if (!fs.existsSync(distHtmlPath)) {
  console.error("dist/index.html not found. Run vite build first.");
  process.exit(1);
}

const checkIcon = `<svg class="w-4 h-4 text-accent shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`;
const arrowRightIcon = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;
const qrIcon = `<svg class="w-4 h-4 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path></svg>`;
const lockIcon = `<svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;

const landingHtml = `
<div class="min-h-screen bg-bg text-ink selection:bg-accent-tint selection:text-accent">
  <header class="sticky top-0 z-30 border-b border-hairline bg-surface/90 backdrop-blur-md">
    <nav class="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/" class="t-h3 font-bold tracking-tight text-ink hover:text-accent transition-colors">PG Cashflow</a>
      </div>
      <div class="hidden md:flex items-center gap-6 t-body-sm font-medium text-ink-muted">
        <a href="#roles" class="hover:text-ink transition-colors">Portals</a>
        <a href="#fundamentals" class="hover:text-ink transition-colors">The Ledger</a>
        <a href="#verification" class="hover:text-ink transition-colors">Aadhaar KYC</a>
        <a href="#security" class="hover:text-ink transition-colors">Security</a>
      </div>
      <div class="flex items-center gap-2.5">
        <a href="/" class="hidden sm:inline-flex items-center h-9 px-3.5 rounded-[10px] border border-hairline bg-surface t-caption font-semibold text-ink hover:bg-bg transition-colors">Join with Room Code</a>
        <a href="/login" class="inline-flex items-center h-9 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold hover:opacity-95 transition-opacity">Owner Sign In</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="pt-12 sm:pt-20 pb-12 px-4 sm:px-6 mx-auto max-w-5xl text-center">
      <h1 class="t-display sm:leading-tight font-bold tracking-tight text-ink max-w-[22ch] mx-auto">
        Live dignified. Settle transparently.
      </h1>
      <p class="t-body sm:t-h3 text-ink-muted mt-4 max-w-[56ch] mx-auto leading-relaxed">
        From instant Aadhaar verification and zero-friction UPI rent to automated bank reconciliation and warden floor ops.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3 mt-8">
        <a href="/login" class="h-11 inline-flex items-center justify-center rounded-[10px] bg-accent text-white px-6 t-body font-semibold hover:opacity-95 shadow-sm gap-2">
          <span>Get your PG onboard</span>
          ${arrowRightIcon}
        </a>
        <a href="/" class="h-11 inline-flex items-center justify-center rounded-[10px] border border-hairline bg-surface px-5 t-body font-semibold text-ink hover:bg-bg gap-2">
          ${qrIcon}
          <span>Join with Room Code</span>
        </a>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mt-10 t-caption text-ink-muted">
        <div class="inline-flex items-center gap-1.5">
          ${checkIcon}
          <span>Aadhaar-verified tenants</span>
        </div>
        <div class="inline-flex items-center gap-1.5">
          ${checkIcon}
          <span>Room &amp; floor-bound codes</span>
        </div>
        <div class="inline-flex items-center gap-1.5">
          ${checkIcon}
          <span>Owner-controlled access</span>
        </div>
      </div>

      <div class="mt-12 rounded-[14px] border border-hairline bg-surface shadow-md overflow-hidden text-left">
        <div class="px-4 py-3 border-b border-hairline bg-bg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-hairline"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-hairline"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-hairline"></span>
            <span class="ml-2 t-caption font-semibold text-ink-muted hidden sm:inline">Greenfield PG · Koramangala 4th Block, Bengaluru</span>
          </div>
          <div class="flex items-center gap-2 t-caption text-ink-muted font-medium">
            <span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <span>Ledger in sync</span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hairline bg-surface">
          <div class="p-5">
            <div class="t-caption text-ink-muted">Rent collected this month</div>
            <div class="t-amount-lg text-ink mt-1">₹4,20,000</div>
            <div class="t-caption text-success font-semibold mt-1">↑ 96% on-time · 32/34 rooms settled</div>
          </div>
          <div class="p-5">
            <div class="t-caption text-ink-muted">Occupancy</div>
            <div class="t-amount-lg text-ink mt-1">38 / 40</div>
            <div class="t-caption text-accent font-semibold mt-1">↑ 2 tenants verified today</div>
          </div>
          <div class="p-5">
            <div class="t-caption text-ink-muted">Identity verified</div>
            <div class="t-amount-lg text-ink mt-1">100%</div>
            <div class="t-caption text-ink-muted font-semibold mt-1">UIDAI Aadhaar OTP · 0 paper forms</div>
          </div>
        </div>
      </div>
    </section>

    <section id="roles" class="border-t border-hairline py-16 px-4 sm:px-6 mx-auto max-w-5xl">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <div class="t-caption uppercase font-semibold text-accent tracking-wider mb-2">Three Doors, One Ledger</div>
        <h2 class="t-h1 text-ink">Built around three people, not one dashboard</h2>
        <p class="t-body text-ink-muted mt-2">Every role gets exactly what it needs — nothing borrowed from someone else's screen.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-5">
        <div class="rounded-[14px] border border-hairline bg-surface p-6 flex flex-col justify-between hover:border-accent/40 transition-colors">
          <div>
            <div class="w-10 h-10 rounded-[10px] bg-accent-tint text-accent flex items-center justify-center mb-4">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <h3 class="t-h2 text-ink">Tenants</h3>
            <p class="t-caption text-accent font-medium mt-0.5">Move in with dignity, not paper registers</p>
            <p class="t-body-sm text-ink-muted mt-2.5 leading-relaxed">Scan your room-bound code, complete instant Aadhaar verification, and pay rent with UPI.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-hairline">
            <a href="/" class="inline-flex items-center gap-1.5 t-body-sm font-semibold text-accent hover:underline">
              <span>Join with Room Code</span>
              ${arrowRightIcon}
            </a>
          </div>
        </div>

        <div class="rounded-[14px] border border-hairline bg-surface p-6 flex flex-col justify-between hover:border-accent/40 transition-colors">
          <div>
            <div class="w-10 h-10 rounded-[10px] bg-accent-tint text-accent flex items-center justify-center mb-4">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-1.5 1.5L12 11l4 4 5.5-5.5a2.121 2.121 0 0 0 0-3L20 5"></path><path d="M12 11l-8 8a2 2 0 0 0 0 3h3l1-1v-2h2v-2h2l1-1"></path></svg>
            </div>
            <h3 class="t-h2 text-ink">Property Owners</h3>
            <p class="t-caption text-accent font-medium mt-0.5">One single ledger for every rupee and room</p>
            <p class="t-body-sm text-ink-muted mt-2.5 leading-relaxed">Track dues across all properties, reconcile bank statements, and stop chasing payments on WhatsApp.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-hairline">
            <a href="/login" class="inline-flex items-center gap-1.5 t-body-sm font-semibold text-accent hover:underline">
              <span>Owner Sign In</span>
              ${arrowRightIcon}
            </a>
          </div>
        </div>

        <div class="rounded-[14px] border border-hairline bg-surface p-6 flex flex-col justify-between hover:border-accent/40 transition-colors">
          <div>
            <div class="w-10 h-10 rounded-[10px] bg-accent-tint text-accent flex items-center justify-center mb-4">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
            </div>
            <h3 class="t-h2 text-ink">Wardens &amp; Managers</h3>
            <p class="t-caption text-accent font-medium mt-0.5">Hallway-ready ops from your phone</p>
            <p class="t-body-sm text-ink-muted mt-2.5 leading-relaxed">Log in with owner-issued credentials to manage the floor: inspections, daily headcount, and meters.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-hairline">
            <a href="/login" class="inline-flex items-center gap-1.5 t-body-sm font-semibold text-accent hover:underline">
              <span>Owner Sign In</span>
              ${arrowRightIcon}
            </a>
          </div>
        </div>
      </div>
    </section>

    <section id="security" class="border-t border-hairline py-16 px-4 sm:px-6 mx-auto max-w-5xl">
      <div class="rounded-[14px] border border-hairline bg-surface p-6 shadow-xs max-w-2xl mx-auto">
        <div class="flex items-center gap-2 mb-4">
          ${lockIcon}
          <h3 class="t-h3 text-ink">Security Invariants</h3>
        </div>
        <p class="t-body-sm text-ink-muted mb-5 leading-relaxed">
          Engineered from day one around financial fidelity and the DPDP Act 2023.
        </p>
        <div class="space-y-3.5 t-body-sm text-ink-muted">
          <div class="flex items-start gap-2.5">
            ${checkIcon}
            <span>Identity checked before move-in, every single time.</span>
          </div>
          <div class="flex items-start gap-2.5">
            ${checkIcon}
            <span>No bare, guessable invite codes — bound to floor and room.</span>
          </div>
          <div class="flex items-start gap-2.5">
            ${checkIcon}
            <span>Zero cleartext Aadhaar number storage; masked UID only.</span>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="border-t border-hairline bg-surface py-10 px-4 sm:px-6">
    <div class="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="w-2 h-2 rounded-full bg-accent"></span>
        <span class="t-h3 font-bold text-ink">PG Cashflow</span>
        <span class="t-body-sm text-ink-muted">· Built for Indian PGs and hostels.</span>
      </div>
      <div class="flex items-center gap-6 t-caption font-medium text-ink-muted">
        <a href="/" class="hover:text-ink transition-colors">Join Property</a>
        <a href="/login" class="hover:text-ink transition-colors">Owner Sign In</a>
        <a href="#roles" class="hover:text-ink transition-colors">Portals</a>
        <a href="#security" class="hover:text-ink transition-colors">Security</a>
        <a href="/terms" class="hover:text-ink transition-colors">Terms</a>
        <a href="/privacy" class="hover:text-ink transition-colors">Privacy</a>
        <a href="/refund-policy" class="hover:text-ink transition-colors">Refunds</a>
        <a href="/contact" class="hover:text-ink transition-colors">Contact</a>
      </div>
    </div>
  </footer>
</div>
`.trim();

const currentHtml = fs.readFileSync(distHtmlPath, "utf-8");
const updatedHtml = currentHtml.replace(
  '<div id="root"></div>',
  `<div id="root">${landingHtml}</div>`
);

const landingHtmlPath = path.resolve(__dirname, "../dist/landing.html");
fs.writeFileSync(landingHtmlPath, updatedHtml, "utf-8");
console.log("✓ Pre-rendered static landing page written to dist/landing.html (dist/index.html preserved clean)");

function writeStaticPage(routeSlug, title, subtitle, sections) {
  const sectionsHtml = sections
    .map(
      (s) => `
    <section class="space-y-3 mb-8">
      <h2 class="t-h2 text-ink font-semibold">${s.heading}</h2>
      ${s.paragraphs.map((p) => `<p class="t-body-sm text-ink-muted leading-relaxed">${p}</p>`).join("")}
      ${s.list ? `<ul class="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">${s.list.map((li) => `<li>${li}</li>`).join("")}</ul>` : ""}
    </section>`
    )
    .join("");

  const pageHtml = `
<div class="min-h-screen bg-bg text-ink flex flex-col">
  <header class="sticky top-0 z-30 border-b border-hairline bg-surface/90 backdrop-blur-md">
    <nav class="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/landing" class="t-h3 font-bold tracking-tight text-ink flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-accent"></span>
          <span>PG Cashflow</span>
        </a>
      </div>
      <div class="flex items-center gap-3">
        <a href="/" class="hidden sm:inline-flex items-center h-9 px-3.5 rounded-[10px] border border-hairline bg-surface t-caption font-semibold text-ink">Join Property</a>
        <a href="/login" class="inline-flex items-center h-9 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold">Owner Sign In</a>
      </div>
    </nav>
  </header>
  <main class="flex-1 py-10 sm:py-16 px-4 sm:px-6">
    <div class="mx-auto max-w-3xl">
      <div class="mb-8">
        <a href="/landing" class="inline-flex items-center gap-1.5 t-caption font-medium text-ink-muted hover:text-accent mb-4">&larr; Back to Overview</a>
        <div class="t-caption uppercase font-semibold text-accent tracking-wider mb-2">Compliance &amp; Governance</div>
        <h1 class="t-display text-ink font-bold tracking-tight">${title}</h1>
        <p class="t-body text-ink-muted mt-2">${subtitle}</p>
        <p class="t-caption text-ink-muted mt-3">Last Updated: October 30, 2026</p>
      </div>
      <div class="rounded-[14px] border border-hairline bg-surface p-6 sm:p-10 shadow-xs">
        ${sectionsHtml}
      </div>
    </div>
  </main>
  <footer class="border-t border-hairline bg-surface py-10 px-4 sm:px-6 mt-auto">
    <div class="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="w-2 h-2 rounded-full bg-accent"></span>
        <span class="t-h3 font-bold text-ink">PG Cashflow</span>
        <span class="t-body-sm text-ink-muted">Built for Indian PGs and hostels.</span>
      </div>
      <div class="flex flex-wrap items-center gap-5 t-caption font-medium text-ink-muted">
        <a href="/terms" class="hover:text-ink">Terms of Service</a>
        <a href="/privacy" class="hover:text-ink">Privacy Policy</a>
        <a href="/refund-policy" class="hover:text-ink">Refund Policy</a>
        <a href="/contact" class="hover:text-ink">Contact Us</a>
        <a href="/landing" class="hover:text-ink">Overview</a>
      </div>
    </div>
  </footer>
</div>`.trim();

  const rendered = currentHtml.replace('<div id="root"></div>', `<div id="root">${pageHtml}</div>`);
  const flatPath = path.resolve(__dirname, `../dist/${routeSlug}.html`);
  fs.writeFileSync(flatPath, rendered, "utf-8");

  const dirPath = path.resolve(__dirname, `../dist/${routeSlug}`);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.resolve(dirPath, "index.html"), rendered, "utf-8");
  console.log(`✓ Pre-rendered static policy page written to dist/${routeSlug}.html and dist/${routeSlug}/index.html`);
}

writeStaticPage("terms", "Terms of Service", "Operating terms and conditions governing the use of the PG Cashflow platform.", [
  {
    heading: "1. Platform Nature & Scope",
    paragraphs: [
      "PG Cashflow is a technology platform providing digital ledger management, automated rent collection records, daily operational workflows, and verified tenant onboarding infrastructure for paying guest accommodations, co-living spaces, and student hostels across India.",
      "The Platform acts solely as a technological intermediary connecting property owners/operators, designated managers, and residents."
    ]
  },
  {
    heading: "2. Payments, Dues & Gateway Processing",
    paragraphs: [
      "All financial transactions (rent payments, security deposits, and operational dues) are routed through authorized, RBI-regulated payment aggregators (including Cashfree Payments India Pvt. Ltd.)."
    ],
    list: [
      "Rent dues generated with specific reference identifiers (e.g., PG-XXXXXX) reflect contractual obligations set by the respective property owner.",
      "The Platform records transaction receipts and updates ledgers upon receiving cryptographic confirmation from the payment gateway."
    ]
  },
  {
    heading: "3. Governing Law & Jurisdiction",
    paragraphs: [
      "These Terms are governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India."
    ]
  }
]);

writeStaticPage("privacy", "Privacy Policy", "How PG Cashflow handles, protects, and stores personal data under the Digital Personal Data Protection (DPDP) Act, 2023.", [
  {
    heading: "1. Data Fiduciary & Compliance",
    paragraphs: [
      "This Privacy Notice outlines how PG Cashflow operates as a Data Fiduciary under the Digital Personal Data Protection Act, 2023. We are committed to data minimization, purpose limitation, and absolute transparency regarding personal data."
    ]
  },
  {
    heading: "2. Data We Collect & Masking Standards",
    paragraphs: [
      "We collect contact identifiers (mobile number for OTP authentication), payment transaction references, and identity proof processed through UIDAI-authorized DigiLocker / Aadhaar OTP fast-path.",
      "In strict compliance with UIDAI regulations and the Aadhaar Act 2016, raw unmasked 12-digit Aadhaar numbers and biometric data are never stored. Only the masked UID (last 4 digits) is retained."
    ]
  },
  {
    heading: "3. Grievance Redressal",
    paragraphs: [
      "Data principals may contact our designated Grievance Officer at privacy@pgcashflow.in. Complaints are acknowledged within 48 hours and resolved within 15 business days."
    ]
  }
]);

writeStaticPage("refund-policy", "Refund and Cancellation Policy", "Comprehensive rules, timelines, and payment rail processing for rent dues, security deposits, and duplicate charges.", [
  {
    heading: "1. Rent Dues & Monthly Payments",
    paragraphs: [
      "Monthly rent payments made toward an active tenancy period are final and non-refundable once allocated to an invoice or ledger due."
    ]
  },
  {
    heading: "2. Security Deposit Refunds & Two-Tier Processing",
    paragraphs: [
      "Security deposits are settled upon departure after move-out inspection and deduction of pending utility bills.",
      "Within 120 days of deposit payment, refunds are reversed via the Payment Gateway Source Refund API directly to the original payment instrument. Beyond 120-180 days, refunds are settled via Direct Payout (IMPS / UPI) to prevent gateway expiration failures."
    ]
  },
  {
    heading: "3. Duplicate Transactions & Timelines",
    paragraphs: [
      "Duplicate deductions caused by network timeouts are automatically reconciled within 24 to 48 hours. Gateway UPI refunds credit within 24-48 hours; cards and netbanking credit within 3 to 7 business days."
    ]
  }
]);

writeStaticPage("contact", "Contact Us & Grievance Redressal", "Reach out to the PG Cashflow support team or contact our compliance officers.", [
  {
    heading: "1. Customer & Operations Support",
    paragraphs: [
      "General Support: support@pgcashflow.in (Mon-Sat, 9:00 AM - 7:00 PM IST)",
      "Helpdesk Line: +91 (080) 4567-8900",
      "Registered Address: PG Cashflow Technologies Private Limited, Innovate Tech Park, 4th Block, Koramangala, Bengaluru, Karnataka 560034, India"
    ]
  },
  {
    heading: "2. Grievance Officer Details",
    paragraphs: [
      "Designated Grievance & Compliance Officer: grievance@pgcashflow.in (acknowledged within 48 hours; resolved within 15 business days per DPDP requirements)."
    ]
  }
]);
