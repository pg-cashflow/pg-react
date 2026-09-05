/** All monetary values are paise (integer). Never divide unless displaying. */
export type Paise = number;

export type DueStatus = "pending" | "partial" | "paid" | "waived";
export type DueKind = "rent" | "deposit";
export type MatchedBy = "due_code" | "amount_date_window" | "manual" | "cash" | "cashfree";
export type UserRole = "owner" | "tenant";
export type TenantStatus = "pending_allocation" | "active" | "vacated";
export type ContactMode = "self_service" | "cash_only";
export type JoinStatus = "pending" | "approved" | "rejected";
export type PaymentReportStatus = "pending_review" | "confirmed" | "rejected";
export type PaymentMode = "manual" | "cashfree";

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  tenant_id?: string;
  property_id?: string;
  created_at?: string;
  last_login_at?: string;
}

export interface Property {
  id: string;
  name: string;
  address?: string;
  owner_phone: string;
  owner_name: string;
  owner_email: string;
  invite_code?: string;
  payment_mode?: PaymentMode;
  created_at: string;
}

export interface Tenant {
  id: string;
  property_id: string;
  name: string;
  phone?: string;
  room_number?: string;
  aadhaar_last4?: string;
  rent_amount: Paise;
  due_day?: number | null;
  notice_period_days: number;
  notice_given_at?: string;
  credit_balance_paise: Paise;
  status: TenantStatus;
  contact_mode: ContactMode;
  permanent_address?: string;
  current_address?: string;
  parent_name?: string;
  emergency_phone?: string;
  joined_on?: string;
  has_id_photo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Due {
  id: string;
  due_code: string;
  tenant_id: string;
  property_id: string;
  kind: DueKind;
  amount: Paise;
  original_amount: Paise;
  period_start: string;
  period_end: string;
  due_date: string;
  status: DueStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  due_id: string;
  tenant_id: string;
  amount: Paise;
  matched_by: MatchedBy;
  upi_txn_id?: string;
  recorded_by?: string;
  matched_at: string;
  raw_note?: string;
  created_at: string;
}

export interface ReconciliationSummary {
  period: string;
  rent_collected_paise: Paise;
  by_channel: Record<string, Paise>;
  outstanding_paise: Paise;
  credits_held_paise: Paise;
  deposits_held_paise: Paise;
  deposits_refunded_paise: Paise;
}

export interface DueTokenResponse {
  path: string;
  url: string;
  wa_me?: string;
}

export interface PayIntent {
  mode: PaymentMode;
  vpa?: string;
  upi_link?: string;
  note: string;
  due_code: string;
  amount_paise: Paise;
  qr_png_url: string;
  payable: boolean;
  payment_session_id?: string;
}

export interface JoinRequest {
  id: string;
  property_id: string;
  user_id: string;
  phone: string;
  name: string;
  aadhaar_last4?: string;
  permanent_address?: string;
  current_address?: string;
  parent_name?: string;
  emergency_phone?: string;
  joined_on?: string;
  status: JoinStatus;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InviteLookup {
  property_id: string;
  property_name: string;
  owner_name: string;
}

export interface OwnerInvite {
  invite_code: string;
  payment_mode: PaymentMode;
}

export interface PaymentReport {
  id: string;
  due_id: string;
  tenant_id: string;
  property_id: string;
  upi_txn_id: string;
  amount: Paise;
  has_image: boolean;
  status: PaymentReportStatus;
  reported_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  note?: string;
  created_at: string;
}

export interface AadhaarPreview {
  name?: string;
  dob?: string;
  yob?: string;
  gender?: string;
  uid_last4?: string;
  verified?: boolean;
  partial?: boolean;
  needs_confirm?: boolean;
}

export interface Event {
  tenant_id?: string;
  property_id?: string;
  event_type: string;
  due_id?: string;
  occurred_at: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface AuthTokenPayload {
  sub: string;
  user_id?: string;
  role: UserRole;
  exp: number;
  tenant_id?: string;
  property_id?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface TenantMeResponse extends Tenant {
  active_dues: Due[];
}

export interface ImportResult {
  row_count: number;
  matched: number;
  failed: number;
}
