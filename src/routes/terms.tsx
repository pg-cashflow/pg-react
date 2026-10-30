import React from "react";
import { PublicPolicyLayout } from "@/components/layout/PublicPolicyLayout";

export const TermsPage: React.FC = () => {
  return (
    <PublicPolicyLayout
      title="Terms of Service"
      subtitle="Operating terms and conditions governing the use of the PG Cashflow platform."
      lastUpdated="October 30, 2026"
    >
      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">1. Platform Nature &amp; Scope</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          PG Cashflow (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a technology application providing digital ledger management, automated rent collection records, daily operational workflows, and verified tenant onboarding infrastructure for paying guest (PG) accommodations, co-living spaces, and student hostels across India.
        </p>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          The Platform acts solely as a technological intermediary connecting property owners/operators (&ldquo;Owners&rdquo;), designated property managers or wardens (&ldquo;Managers&rdquo;), and residents (&ldquo;Tenants&rdquo;). The Platform does not own, lease, or manage real estate properties, nor does it act as a real estate broker.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">2. User Eligibility &amp; Accounts</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          You must be at least 18 years of age and legally competent to enter into contracts under the Indian Contract Act, 1872. Accounts are established through phone authentication and assigned role-based permissions (Owner, Manager, Tenant).
        </p>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          You are responsible for safeguarding your login credentials and one-time passcodes. You agree to provide accurate, truthful, and updated identity information during onboarding.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">3. Payments, Dues &amp; Gateway Processing</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          All financial transactions (rent payments, security deposits, and operational dues) are routed through authorized, RBI-regulated payment aggregators and payment gateways (including Cashfree Payments India Pvt. Ltd.).
        </p>
        <ul className="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">
          <li>Rent dues generated with specific reference identifiers (e.g., PG-XXXXXX) reflect contractual obligations set by the respective property owner.</li>
          <li>The Platform records transaction receipts and updates ledgers upon receiving cryptographic confirmation from the payment gateway.</li>
          <li>Convenience fees or payment processing charges, where applicable, are transparently presented before checkout completion.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">4. Tenancy &amp; House Rules</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          The physical tenancy contract, room allocations, notice periods, meal plans, and property rules remain an agreement strictly between the Owner and the Tenant. The Platform provides digital records of dues, occupancy, and inventory, but is not party to landlord-tenant disputes regarding physical accommodations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">5. Prohibited Conduct</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Users agree not to: (a) impersonate any individual or provide falsified identification documents; (b) attempt unauthorized access to another property&apos;s records or server infrastructure; (c) initiate fraudulent chargebacks or dispute validly settled rent obligations; (d) deploy automated scraping or reverse-engineering mechanisms against the application.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">6. Termination &amp; Access Revocation</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Owners may revoke Manager or Tenant access upon tenancy completion or breach of rules. We reserve the right to suspend or terminate accounts involved in payment fraud, security violations, or abuse of the services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">7. Limitation of Liability &amp; Governing Law</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          To the maximum extent permitted under applicable law, the Platform shall not be liable for indirect, incidental, or consequential damages arising from gateway downtime, network delays, or landlord-tenant disputes.
        </p>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          These Terms are governed by the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.
        </p>
      </section>
    </PublicPolicyLayout>
  );
};

