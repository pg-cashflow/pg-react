import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface PublicPolicyLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const PublicPolicyLayout: React.FC<PublicPolicyLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  children,
}) => {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col selection:bg-accent-tint selection:text-accent">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface/90 backdrop-blur-md">
        <nav className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/landing"
              className="t-h3 font-bold tracking-tight text-ink hover:text-accent transition-colors flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span>PG Cashflow</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="hidden sm:inline-flex items-center h-9 px-3.5 rounded-[10px] border border-hairline bg-surface t-caption font-semibold text-ink hover:bg-bg transition-colors"
            >
              Join Property
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center h-9 px-4 rounded-[10px] bg-accent text-white t-caption font-semibold hover:opacity-95 transition-opacity"
            >
              Owner Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 py-10 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <Link
              to="/landing"
              className="inline-flex items-center gap-1.5 t-caption font-medium text-ink-muted hover:text-accent transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Link>
            <div className="flex items-center gap-2 t-caption uppercase font-semibold text-accent tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Compliance &amp; Governance</span>
            </div>
            <h1 className="t-display text-ink font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="t-body text-ink-muted mt-2 leading-relaxed">{subtitle}</p>}
            <p className="t-caption text-ink-muted mt-3">Last Updated: {lastUpdated}</p>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none rounded-[14px] border border-hairline bg-surface p-6 sm:p-10 shadow-xs space-y-8">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline bg-surface py-10 px-4 sm:px-6 mt-auto">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="t-h3 font-bold text-ink">PG Cashflow</span>
            <span className="t-body-sm text-ink-muted">Built for Indian PGs and hostels.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 t-caption font-medium text-ink-muted">
            <Link to="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link to="/refund-policy" className="hover:text-ink transition-colors">Refund Policy</Link>
            <Link to="/contact" className="hover:text-ink transition-colors">Contact Us</Link>
            <Link to="/landing" className="hover:text-ink transition-colors">Overview</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

