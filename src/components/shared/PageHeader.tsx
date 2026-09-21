import React from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="t-h1 text-ink">{title}</h1>
        {subtitle && <p className="t-body-sm text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
