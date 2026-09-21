import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";
import type { Due, DueStatus, MatchedBy } from "@pg/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format paise as Indian rupee string, e.g. 150000 -> "₹1,500.00" */
export function rupeesToPaise(rupees: string | number): number {
  const n = typeof rupees === "number" ? rupees : parseFloat(String(rupees).replace(/,/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function paiseToRupeeInput(paise: number): string {
  return (Number(paise || 0) / 100).toString();
}

import { getStoredLocale } from "@/auth/storage";

/** Format paise as Indian rupee string, e.g. 150000 -> "₹1,500.00" */
export function formatPaise(paise: number, locale: string = getStoredLocale()): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

/** Format ISO date string into readable Indian standard format */
export function formatDate(dateString: string, locale: string = getStoredLocale()): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}


/** Local calendar date for HTML date inputs (yyyy-MM-dd) */
export function localDateInputValue(date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/** Normalize Indian phone input to E.164 (+91...) for Firebase and API */
export function toE164IndianPhone(input: string): string {
  const trimmed = input.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("91") && trimmed.length === 12) return `+${trimmed}`;
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}

/** Client-side overdue: pending/partial past due_date */
export function isOverdue(due: Due): boolean {
  if (due.status !== "pending" && due.status !== "partial") return false;
  const dueDay = new Date(due.due_date);
  dueDay.setHours(23, 59, 59, 999);
  return dueDay.getTime() < Date.now();
}

/** Display status including computed overdue */
export function displayDueStatus(due: Due): DueStatus | "overdue" {
  if (isOverdue(due)) return "overdue";
  return due.status;
}

export function formatMatchedBy(matchedBy: MatchedBy | string): string {
  return matchedBy.replace(/_/g, " ");
}

export function sumOutstandingFromDues(dues: Due[]): number {
  return dues
    .filter((d) => d.status === "pending" || d.status === "partial")
    .reduce((acc, d) => acc + d.amount, 0);
}

export function countOverdueDues(dues: Due[]): number {
  return dues.filter(isOverdue).length;
}

export function sumOverdueAmount(dues: Due[]): number {
  return dues.filter(isOverdue).reduce((acc, d) => acc + d.amount, 0);
}

export function eventKey(evt: {
  event_type: string;
  occurred_at: string;
  tenant_id?: string;
  due_id?: string;
}): string {
  return `${evt.occurred_at}-${evt.event_type}-${evt.tenant_id ?? ""}-${evt.due_id ?? ""}`;
}

/** “₹8,500 due on 5 Sep” — tenant passbook, reminders, pay sheet. */
export function formatDueSentence(due: Pick<Due, "amount" | "due_date">): string {
  return `${formatPaise(due.amount)} due on ${formatDate(due.due_date)}`;
}

export function addCalendarDays(isoDate: string, days: number): Date {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d;
}

export function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadTextFile(filename: string, contents: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type CopyFeedback = "idle" | "copied" | "failed";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function isOpenDue(due: Due): boolean {
  return due.status === "pending" || due.status === "partial";
}
