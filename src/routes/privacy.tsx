import React from "react";
import { PublicPolicyLayout } from "@/components/layout/PublicPolicyLayout";
import company from "@/config/company.json";
import policyData from "@/config/privacy-policy.json";

export const PrivacyPage: React.FC = () => {
  return (
    <PublicPolicyLayout
      title={policyData.title}
      subtitle={policyData.subtitle}
      lastUpdated={policyData.lastUpdated}
    >
      {policyData.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="t-h2 text-ink font-semibold">{section.heading}</h2>
          {section.paragraphs.map((p, idx) => (
            <p key={idx} className="t-body-sm text-ink-muted leading-relaxed">
              {p}
            </p>
          ))}
          {section.bullets && (
            <ul className="list-disc pl-5 space-y-1.5 t-body-sm text-ink-muted">
              {section.bullets.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          )}
          {section.contactDetails && (
            <div className="rounded-[10px] border border-hairline bg-bg p-4 t-body-sm text-ink-muted space-y-1">
              <p>
                <strong>Grievance Redressal Officer:</strong> {section.contactDetails.title},{" "}
                {company.legalName}
              </p>
              <p>
                <strong>Email:</strong> {company.privacyEmail || company.grievanceEmail}
              </p>
              <p>
                <strong>Response Turnaround:</strong> Acknowledged within {company.ackTimelineHours}{" "}
                hours; resolved within {company.resolutionTimelineDays} business days.
              </p>
            </div>
          )}
        </section>
      ))}
    </PublicPolicyLayout>
  );
};
