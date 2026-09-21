import React from "react";
import { Link } from "@tanstack/react-router";
import { LanguageToggle } from "@/components/common/LanguageSelector";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface AuthLayoutProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/landing" className="block t-caption font-semibold text-accent">
            PG Cashflow
          </Link>
          {Icon && (
            <div className="mx-auto mt-4 flex items-center justify-center w-14 h-14 rounded-[14px] bg-accent text-white">
              <Icon className="w-7 h-7" aria-hidden />
            </div>
          )}
          <h1 className="t-h1 text-ink mt-4">{title}</h1>
          {subtitle && <p className="t-body text-ink-muted mt-2">{subtitle}</p>}
        </div>
        <div className="bg-surface rounded-[14px] border border-hairline p-6 sm:p-8">{children}</div>
        {footer && <p className="text-center t-body-sm text-ink-muted mt-6">{footer}</p>}
      </div>
    </div>
  );
}
