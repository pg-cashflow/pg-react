import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distHtmlPath = path.resolve(__dirname, "../dist/index.html");
const companyConfigPath = path.resolve(__dirname, "../src/config/company.json");

let company = {
  legalName: "PG Cashflow Technologies Private Limited",
  address: "Innovate Tech Park, 4th Block, Koramangala, Bengaluru, Karnataka 560034, India",
  supportEmail: "support@pgcashflow.in",
  helpdeskPhone: "+91 (080) 4567-8900",
  grievanceEmail: "grievance@pgcashflow.in",
  privacyEmail: "grievance@pgcashflow.in",
  ackTimelineHours: 48,
  resolutionTimelineDays: 15,
};

if (fs.existsSync(companyConfigPath)) {
  try {
    company = { ...company, ...JSON.parse(fs.readFileSync(companyConfigPath, "utf-8")) };
  } catch (e) {
    console.warn("Could not read company.json, falling back to defaults", e.message);
  }
}

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
        From smart Aadhaar verification and zero-friction UPI rent to automated bank reconciliation and warden floor ops.
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
            <span class="ml-2 t-caption font-semibold text-ink-muted hidden sm:inline">Illustrative Demo · Sample PG Property</span>
          </div>
          <div class="flex items-center gap-2 t-caption text-ink-muted font-medium">
            <span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            <span>Illustrative sample preview</span>
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
            <div class="t-caption text-ink-muted font-semibold mt-1">Smart OCR &amp; Secure QR · 0 paper forms</div>
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
            <p class="t-body-sm text-ink-muted mt-2.5 leading-relaxed">Scan your room-bound code, complete verified Aadhaar onboarding, and pay rent with UPI.</p>
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

function stripModuleScripts(html) {
  return html
    .replace(/<script\s+type="module"[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\s+rel="modulepreload"[^>]*>/gi, "");
}

const currentHtml = fs.readFileSync(distHtmlPath, "utf-8");
const updatedHtml = stripModuleScripts(
  currentHtml.replace(
    '<div id="root"></div>',
    `<div id="root">${landingHtml}</div>`
  )
);

const landingHtmlPath = path.resolve(__dirname, "../dist/landing.html");
fs.writeFileSync(landingHtmlPath, updatedHtml, "utf-8");

const landingDir = path.resolve(__dirname, "../dist/landing");
if (!fs.existsSync(landingDir)) fs.mkdirSync(landingDir, { recursive: true });
fs.writeFileSync(path.resolve(landingDir, "index.html"), updatedHtml, "utf-8");
console.log("✓ Pre-rendered static landing page written to dist/landing.html and dist/landing/index.html (dist/index.html preserved clean)");

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

  const rendered = stripModuleScripts(
    currentHtml.replace('<div id="root"></div>', `<div id="root">${pageHtml}</div>`)
  );
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
      "PG Cashflow (\"Platform\", \"we\", \"us\") is a technology application providing digital ledger management, automated rent collection records, daily operational workflows, and verified tenant onboarding infrastructure for paying guest (PG) accommodations, co-living spaces, and student hostels across India.",
      "The Platform acts solely as a technological intermediary connecting property owners/operators (\"Owners\"), designated property managers or wardens (\"Managers\"), and residents (\"Tenants\"). The Platform does not own, lease, or manage real estate properties, nor does it act as a real estate broker."
    ]
  },
  {
    heading: "2. User Eligibility & Accounts",
    paragraphs: [
      "You must be at least 18 years of age and legally competent to enter into contracts under the Indian Contract Act, 1872. Accounts are established through phone authentication and assigned role-based permissions (Owner, Manager, Tenant).",
      "You are responsible for safeguarding your login credentials and one-time passcodes. You agree to provide accurate, truthful, and updated identity information during onboarding."
    ]
  },
  {
    heading: "3. Payments, Dues & Gateway Processing",
    paragraphs: [
      "All financial transactions (rent payments, security deposits, and operational dues) are routed through authorized, RBI-regulated payment aggregators and payment gateways (including Cashfree Payments India Pvt. Ltd.)."
    ],
    list: [
      "Rent dues generated with specific reference identifiers (e.g., PG-XXXXXX) reflect contractual obligations set by the respective property owner.",
      "The Platform records transaction receipts and updates ledgers upon receiving cryptographic confirmation from the payment gateway.",
      "Convenience fees or payment processing charges, where applicable, are transparently presented before checkout completion."
    ]
  },
  {
    heading: "4. Tenancy & House Rules",
    paragraphs: [
      "The physical tenancy contract, room allocations, notice periods, meal plans, and property rules remain an agreement strictly between the Owner and the Tenant. The Platform provides digital records of dues, occupancy, and inventory, but is not party to landlord-tenant disputes regarding physical accommodations."
    ]
  },
  {
    heading: "5. Prohibited Conduct",
    paragraphs: [
      "Users agree not to: (a) impersonate any individual or provide falsified identification documents; (b) attempt unauthorized access to another property's records or server infrastructure; (c) initiate fraudulent chargebacks or dispute validly settled rent obligations; (d) deploy automated scraping or reverse-engineering mechanisms against the application."
    ]
  },
  {
    heading: "6. Termination & Access Revocation",
    paragraphs: [
      "Owners may revoke Manager or Tenant access upon tenancy completion or breach of rules. We reserve the right to suspend or terminate accounts involved in payment fraud, security violations, or abuse of the services."
    ]
  },
  {
    heading: "7. Limitation of Liability & Governing Law",
    paragraphs: [
      "To the maximum extent permitted under applicable law, the Platform shall not be liable for indirect, incidental, or consequential damages arising from gateway downtime, network delays, or landlord-tenant disputes.",
      "These Terms are governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India."
    ]
  }
]);

const privacyPolicyPath = path.resolve(__dirname, "../src/config/privacy-policy.json");
const privacyPolicy = JSON.parse(fs.readFileSync(privacyPolicyPath, "utf-8"));

const privacySections = privacyPolicy.sections.map((sec) => {
  const item = {
    heading: sec.heading,
    paragraphs: [...sec.paragraphs],
  };
  if (sec.bullets) {
    item.list = sec.bullets;
  }
  if (sec.contactDetails) {
    item.paragraphs.push(
      `Grievance Redressal Officer: ${sec.contactDetails.title}, ${company.legalName}. Email: ${company.privacyEmail || company.grievanceEmail}. Response Turnaround: Acknowledged within ${company.ackTimelineHours} hours; resolved within ${company.resolutionTimelineDays} business days.`
    );
  }
  return item;
});

writeStaticPage("privacy", privacyPolicy.title, privacyPolicy.subtitle, privacySections);

writeStaticPage("refund-policy", "Refund and Cancellation Policy", "Comprehensive rules, timelines, and payment rail processing for rent dues, security deposits, and duplicate charges.", [
  {
    heading: "1. Overview of Payment Processing",
    paragraphs: [
      "PG Cashflow provides payment reconciliation and automated ledger facilities between tenants and property owners through licensed payment aggregators (including Cashfree Payments). This policy defines how cancellations, adjustments, and refunds are initiated and executed."
    ]
  },
  {
    heading: "2. Monthly Rent Dues",
    paragraphs: [
      "Monthly rent payments made toward an active tenancy period are considered final and non-refundable once allocated to an invoice or ledger due.",
      "In cases where a tenant moves out mid-cycle under an agreed pro-rata arrangement with the property owner, any rent adjustment or credit must be confirmed and authorized by the owner on the digital ledger prior to checkout."
    ]
  },
  {
    heading: "3. Security Deposit Refunds & Settlement Flow",
    paragraphs: [
      "Security deposits collected at the time of onboarding are held by the property owner and settled upon departure after formal move-out inspection and deduction of pending utility bills, damages, or unpaid dues."
    ],
    list: [
      "Source Reversal (Within 120 Days): If the move-out settlement occurs within 120 days of the deposit payment, the refund is initiated via the Payment Gateway Source Refund API directly back to the original funding instrument (UPI ID, debit/credit card, or netbanking account).",
      "Payments Exceeding 120 Days: In accordance with payment gateway and banking regulations, gateway refund requests cannot be accepted after 120 days. Any deposit settlement beyond 120 days requires explicit operational review and offline verification before funds can be disbursed."
    ]
  },
  {
    heading: "4. Duplicate or Erroneous Transactions",
    paragraphs: [
      "If your account is debited twice for a single due code (for example, due to an intermittent mobile connection or network timeout at checkout):"
    ],
    list: [
      "Our automated polling and reconciliation system detects duplicate receipts and initiates a refund request within 24 to 48 hours.",
      `Alternatively, you can report the transaction ID to ${company.supportEmail} for immediate verification and manual initiation.`
    ]
  },
  {
    heading: "5. Refund Timelines & Banking Credits",
    paragraphs: [
      "The platform initiates authorized refunds immediately upon owner approval through our licensed payment aggregator (Cashfree Payments). Actual credit to your account depends on banking settlement cycles:"
    ],
    list: [
      "UPI, Cards & Netbanking: Credit to the customer account typically takes 5 to 7 working days after initiation, subject to receiving bank clearance and acquiring bank exceptions.",
      "Direct IMPS Payouts: Credited within minutes of release by the property owner, subject to beneficiary bank network availability.",
      "Gateway Cutoff Limit: Payment gateway source refunds are permitted only within 120 days of payment. Transactions older than 120 days require offline verification and settlement."
    ]
  },
  {
    heading: "6. Cancellations & Booking Withdrawals",
    paragraphs: [
      "If a prospective tenant reserves a bed/room and cancels prior to physical check-in, the refund of any advance booking fee is determined by the specific cancellation window established by the property owner in the room code offer. If eligible, refunds are processed within 5 business days."
    ]
  },
  {
    heading: "7. Support & Grievance Redressal",
    paragraphs: [
      `For refund escalations or payment queries, contact our Helpdesk Line at ${company.helpdeskPhone} or email ${company.supportEmail}.`,
      `Grievance Officer: ${company.grievanceEmail} | Registered Address: ${company.legalName}, ${company.address}.`
    ]
  }
]);

writeStaticPage("contact", "Contact Us & Grievance Redressal", "Reach out to the PG Cashflow support team, report issues, or contact our customer support and compliance officers.", [
  {
    heading: "1. Customer & Operations Support",
    paragraphs: [
      "For technical queries, ledger sync questions, payment receipt verification, or landlord onboarding support, our desk is available Monday through Saturday from 9:00 AM to 7:00 PM IST.",
      `General Support: ${company.supportEmail} (Mon-Sat, 9:00 AM - 7:00 PM IST)`,
      `Helpdesk Line: ${company.helpdeskPhone}`,
      `Registered Address: ${company.legalName}, ${company.address}`
    ]
  },
  {
    heading: "2. Registered Operational Address",
    paragraphs: [
      `${company.legalName}`,
      `${company.address}`
    ]
  },
  {
    heading: "3. DPDP Grievance Redressal Mechanism",
    paragraphs: [
      "Pursuant to the Digital Personal Data Protection Act, 2023 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, any unresolved consumer grievance or privacy complaint may be escalated to our designated officer:",
      `Designated Grievance & Compliance Officer: ${company.grievanceEmail} (acknowledged within ${company.ackTimelineHours} hours; resolved within ${company.resolutionTimelineDays} working days per DPDP requirements).`
    ]
  },
  {
    heading: "4. Payment Gateway Inquiries",
    paragraphs: [
      "For transactions processed through Cashfree Payments, you can reference your unique Order ID or Reference (CF-XXXXXX) shown on your payment receipt for expedited tracing."
    ]
  }
]);
