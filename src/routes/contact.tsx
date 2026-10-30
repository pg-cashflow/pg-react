import React from "react";
import { PublicPolicyLayout } from "@/components/layout/PublicPolicyLayout";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const ContactPage: React.FC = () => {
  return (
    <PublicPolicyLayout
      title="Contact Us &amp; Grievance Redressal"
      subtitle="Reach out to the PG Cashflow support team, report issues, or contact our customer support and compliance officers."
      lastUpdated="October 30, 2026"
    >
      <section className="space-y-4">
        <h2 className="t-h2 text-ink font-semibold">1. Customer &amp; Operations Support</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          For technical queries, ledger sync questions, payment receipt verification, or landlord onboarding support, our desk is available Monday through Saturday from 9:00 AM to 7:00 PM IST.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="rounded-[12px] border border-hairline bg-bg p-4 flex items-start gap-3">
            <Mail className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <div className="t-caption font-semibold text-ink">General Support</div>
              <a href="mailto:support@pgcashflow.in" className="t-body-sm text-accent hover:underline">
                support@pgcashflow.in
              </a>
              <p className="t-caption text-ink-muted mt-1">Average response within 4 hours</p>
            </div>
          </div>

          <div className="rounded-[12px] border border-hairline bg-bg p-4 flex items-start gap-3">
            <Phone className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <div className="t-caption font-semibold text-ink">Helpdesk Line</div>
              <a href="tel:+918045678900" className="t-body-sm text-accent hover:underline">
                +91 (080) 4567-8900
              </a>
              <p className="t-caption text-ink-muted mt-1">Mon-Sat, 9:00 AM - 7:00 PM IST</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="t-h2 text-ink font-semibold">2. Registered Operational Address</h2>
        <div className="rounded-[12px] border border-hairline bg-bg p-5 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="t-body-sm text-ink-muted space-y-1">
            <p className="font-semibold text-ink">PG Cashflow Technologies Private Limited</p>
            <p>Innovate Tech Park, 4th Block, Koramangala,</p>
            <p>Bengaluru, Karnataka 560034, India</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">3. DPDP Grievance Redressal Mechanism</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Pursuant to the Digital Personal Data Protection Act, 2023 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, any unresolved consumer grievance or privacy complaint may be escalated to our designated officer:
        </p>

        <div className="rounded-[12px] border border-hairline bg-bg p-5 space-y-2 t-body-sm text-ink-muted">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Clock className="w-4 h-4 text-accent" />
            <span>Designated Grievance &amp; Compliance Officer</span>
          </div>
          <p><strong>Name:</strong> Grievance Cell Officer</p>
          <p><strong>Designation:</strong> Head of Trust, Safety &amp; Compliance</p>
          <p><strong>Email:</strong> grievance@pgcashflow.in</p>
          <p><strong>Escalation SLA:</strong> Receipt acknowledged within 48 hours; full resolution within 15 working days.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">4. Payment Gateway Inquiries</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          For transactions processed through Cashfree Payments, you can reference your unique Order ID or Reference (CF-XXXXXX) shown on your payment receipt for expedited tracing.
        </p>
      </section>
    </PublicPolicyLayout>
  );
};
