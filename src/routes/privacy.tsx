import React from "react";
import { PublicPolicyLayout } from "@/components/layout/PublicPolicyLayout";

export const PrivacyPage: React.FC = () => {
  return (
    <PublicPolicyLayout
      title="Privacy Policy"
      subtitle="How PG Cashflow handles, protects, and stores personal data under the Digital Personal Data Protection (DPDP) Act, 2023."
      lastUpdated="October 30, 2026"
    >
      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">1. Data Fiduciary &amp; Overview</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          This Privacy Notice outlines how PG Cashflow operates as a Data Fiduciary under the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;). We are committed to data minimization, purpose limitation, and absolute transparency regarding personal data collected from property owners, managers, and tenants.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">2. Data We Collect &amp; Purpose</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          We collect only the minimum data strictly necessary to facilitate verified tenancy, dues accounting, and security operations:
        </p>
        <ul className="list-disc pl-5 space-y-2 t-body-sm text-ink-muted">
          <li><strong>Contact Identifiers:</strong> Mobile phone number (used for one-time password authentication and essential transactional push notifications).</li>
          <li><strong>Identity Proof (Aadhaar / Government ID):</strong> Processed via UIDAI-authorized DigiLocker / Aadhaar OTP fast-path through certified verification gateways. We collect full name, date of birth, and <em>masked UID</em> (only the last 4 digits, e.g., XXXX-XXXX-1234).</li>
          <li><strong>Payment &amp; Ledger Records:</strong> Payment transaction references, payment mode (UPI, card, netbanking), due identifiers, payment status, and settlement timestamps. Bank account details for refund/payout settlement are processed directly through certified payment aggregators.</li>
          <li><strong>Tenancy &amp; Operational Metadata:</strong> Building, room, and bed allocation, move-in and exit dates, meal RSVPs, and maintenance logs.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">3. Explicit Prohibition on Unmasked Aadhaar Storage</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          In strict compliance with the Aadhaar Act, 2016 and UIDAI regulations:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">
          <li>We <strong>never</strong> store raw, unmasked 12-digit Aadhaar numbers or biometric data.</li>
          <li>Aadhaar verification is entirely voluntary; tenants are entitled to provide approved alternative identification (Voter ID, Driving Licence, or Passport).</li>
          <li>Where document photos are submitted as a secondary verification fallback, redaction is enforced to conceal the first 8 digits and QR code before long-term archiving.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">4. Data Security, Encryption &amp; Storage</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          All data in transit is encrypted using Transport Layer Security (TLS 1.3). Sensitive identity and transaction records at rest are secured using AES-256 encryption. Access to tenant records is restricted by role-based scopes (Wardens cannot view owner bank accounts or tenant financial histories outside their building). Documents are served exclusively via short-lived temporary signatures with <code className="t-caption font-mono bg-bg px-1.5 py-0.5 rounded">no-store</code> caching directives.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">5. Data Retention &amp; Erasure</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Personal data is retained only for the duration of the active tenancy plus statutory limitation periods mandated by applicable tax and accounting laws in India (e.g., maintaining financial books for up to 7 years). Once the tenancy has ended and all dues/deposits are settled, identity documents are scheduled for automated purging.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">6. Rights of the Data Principal</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Under the DPDP Act 2023, you have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">
          <li>Access a summary of personal data held about you and processing activities undertaken.</li>
          <li>Request correction or completion of inaccurate personal data.</li>
          <li>Withdraw consent for optional communications and request data erasure upon tenancy termination.</li>
          <li>Nominate an individual to exercise rights on your behalf in the event of incapacity.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">7. Grievance Officer &amp; Inquiries</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          If you have questions, feedback, or grievances regarding your data, contact our designated Grievance Officer:
        </p>
        <div className="rounded-[10px] border border-hairline bg-bg p-4 t-body-sm text-ink-muted space-y-1">
          <p><strong>Grievance Redressal Officer:</strong> Data Protection Cell, PG Cashflow</p>
          <p><strong>Email:</strong> privacy@pgcashflow.in</p>
          <p><strong>Response Turnaround:</strong> Acknowledged within 48 hours; resolved within 15 business days.</p>
        </div>
      </section>
    </PublicPolicyLayout>
  );
};

