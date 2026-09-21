import type { UserRole } from "@pg/types";

export interface NavIndexItem {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  keywords?: string;
}

const OWNER_NAV: NavIndexItem[] = [
  { id: "nav-dashboard", title: "Dashboard", path: "/owner/dashboard", keywords: "home overview" },
  { id: "nav-joins", title: "Join requests", path: "/owner/joins", keywords: "onboarding invite" },
  { id: "nav-reports", title: "UTR reports", path: "/owner/reports", keywords: "payment proof utr" },
  { id: "nav-tenants", title: "Tenants", path: "/owner/tenants", keywords: "roster rooms" },
  { id: "nav-dues", title: "Dues", path: "/owner/dues", keywords: "rent billing" },
  { id: "nav-payments", title: "Payments", path: "/owner/payments", keywords: "collections upi" },
  { id: "nav-recon", title: "Reconciliation", path: "/owner/reconciliation", keywords: "ledger period" },
  { id: "nav-events", title: "Audit log", path: "/owner/events", keywords: "events history" },
  { id: "nav-facility", title: "Facility & Operations", path: "/owner/facility", keywords: "gamification floors" },
  { id: "nav-reminders", title: "Reminders", path: "/owner/reminders", keywords: "sms nudge" },
  { id: "nav-more", title: "Settings", path: "/owner/more", keywords: "invite code" },
];

const MANAGER_NAV: NavIndexItem[] = [
  { id: "nav-kitchen", title: "Kitchen headcount", path: "/manager/kitchen", keywords: "meals rsvp" },
  { id: "nav-inspections", title: "Inspections", path: "/manager/inspections", keywords: "cleanliness room floor" },
  { id: "nav-meters", title: "Meter readings", path: "/manager/meters", keywords: "electricity water" },
  { id: "nav-hazards", title: "Hazard reports", path: "/manager/hazards", keywords: "safety gas leak" },
  { id: "nav-violations", title: "Violations", path: "/manager/violations", keywords: "rules discipline" },
  { id: "nav-profile", title: "Profile", path: "/manager/profile", keywords: "account" },
];

const TENANT_NAV: NavIndexItem[] = [
  { id: "nav-tenant-home", title: "My Dashboard", path: "/tenant", keywords: "home" },
  { id: "nav-tenant-dues", title: "My Dues", path: "/tenant/dues", keywords: "rent pay" },
  { id: "nav-tenant-payments", title: "Passbook", path: "/tenant/payments", keywords: "history upi payments" },
  { id: "nav-tenant-rewards", title: "Perks & Points", path: "/tenant/rewards", keywords: "redeem gamification" },
  { id: "nav-tenant-community", title: "Community & Meals", path: "/tenant/community", keywords: "rsvp menu" },
  { id: "nav-tenant-profile", title: "Profile", path: "/tenant/profile", keywords: "kyc aadhaar" },
];

export function navItemsForRole(role: UserRole): NavIndexItem[] {
  switch (role) {
    case "owner":
      return OWNER_NAV;
    case "manager":
      return MANAGER_NAV;
    case "tenant":
      return TENANT_NAV;
    default:
      return [];
  }
}

export function filterNavItems(items: NavIndexItem[], q: string): NavIndexItem[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 1) return items.slice(0, 6);
  return items.filter((item) => {
    const hay = `${item.title} ${item.subtitle ?? ""} ${item.keywords ?? ""}`.toLowerCase();
    return hay.includes(needle);
  });
}
