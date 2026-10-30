import React from "react";
import { PublicPolicyLayout } from "@/components/layout/PublicPolicyLayout";

export const RefundPolicyPage: React.FC = () => {
  return (
    <PublicPolicyLayout
      title="Refund and Cancellation Policy"
      subtitle="Comprehensive rules, timelines, and payment rail processing for rent dues, security deposits, and duplicate charges."
      lastUpdated="October 30, 2026"
    >
      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">1. Overview of Payment Processing</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          PG Cashflow provides payment reconciliation and automated ledger facilities between tenants and property owners through licensed payment aggregators (including Cashfree Payments). This policy defines how cancellations, adjustments, and refunds are initiated and executed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">2. Monthly Rent Dues</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Monthly rent payments made toward an active tenancy period are considered final and non-refundable once allocated to an invoice or ledger due.
        </p>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          In cases where a tenant moves out mid-cycle under an agreed pro-rata arrangement with the property owner, any rent adjustment or credit must be confirmed and authorized by the owner on the digital ledger prior to checkout.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">3. Security Deposit Refunds &amp; Settlement Flow</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Security deposits collected at the time of onboarding are held by the property owner and settled upon departure after formal move-out inspection and deduction of pending utility bills, damages, or unpaid dues.
        </p>
        <div className="space-y-2 t-body-sm text-ink-muted">
          <p><strong>Two-Tier Gateway Settlement Processing:</strong></p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Source Reversal (Within 120 Days):</strong> If the move-out settlement occurs within 120 days of the deposit payment, the refund is initiated via the Payment Gateway Source Refund API directly back to the original funding instrument (UPI ID, debit/credit card, or netbanking account).
            </li>
            <li>
              <strong>Direct Payout Rail (Over 120 Days):</strong> For tenancies where the original payment exceeds 120 to 180 days (standard card network and banking reversal limits), the platform automatically transitions to Direct Payout transfer (via IMPS / NEFT / verified UPI VPA) to ensure the tenant receives their deposit without gateway expiration failures.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">4. Duplicate or Erroneous Transactions</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          If your account is debited twice for a single due code (e.g., due to an intermittent mobile connection or network timeout at checkout):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">
          <li>Our automated polling and reconciliation system detects duplicate receipts and initiates a refund within 24 to 48 hours.</li>
          <li>Alternatively, you can report the transaction ID to support@pgcashflow.in for immediate verification and manual initiation.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">5. Refund Timelines &amp; Banking Credits</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          Once an authorized refund is committed by the PG owner:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">
          <li><strong>UPI Transactions:</strong> Typically credited within 24 to 48 hours.</li>
          <li><strong>Netbanking / Debit Cards:</strong> Typically credited within 3 to 7 working days, subject to the issuing bank&apos;s processing cycles.</li>
          <li><strong>Direct IMPS Payouts:</strong> Credited within minutes of release by the property owner.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="t-h2 text-ink font-semibold">6. Cancellations &amp; Booking Withdrawals</h2>
        <p className="t-body-sm text-ink-muted leading-relaxed">
          If a prospective tenant reserves a bed/room and cancels prior to physical check-in, the refund of any advance booking fee is determined by the specific cancellation window established by the property owner in the room code offer. If eligible, refunds are processed within 5 business days.
        </p>
      </section>
    </PublicPolicyLayout>
  );
};

