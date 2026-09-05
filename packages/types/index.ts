/** All monetary values are paise (integer). Never divide unless displaying. */
export type Paise = number;

export type DueStatus = "pending" | "partial" | "paid" | "waived";
export type DueKind = "rent" | "deposit" | "electricity" | "water";
export type MatchedBy = "due_code" | "amount_date_window" | "manual" | "cash" | "cashfree";
export type UserRole = "owner" | "tenant" | "manager";
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

// --- Facility Models ---
export interface Floor {
  id: string;
  property_id: string;
  floor_number: number;
  name: string;
  created_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  floor_id: string;
  room_number: string;
  capacity: number;
  included_units: number;
  created_at: string;
}

// --- Gamification & Settings ---
export interface PropertyGamificationSettings {
  property_id: string;
  point_value_paise: number;
  monthly_budget_paise: number;
  earn_cap_per_tenant: number;
  rsvp_sub_cap: number;
  expiry_days: number;
  floor_bonus_threshold: number;
  electricity_tariff_paise: number;
  created_at?: string;
  updated_at?: string;
}

export interface PointRule {
  id: string;
  property_id: string;
  code: string;
  name: string;
  description: string;
  points: number;
  monthly_cap: number;
  is_rsvp: boolean;
  active: boolean;
  created_at: string;
}

export interface PointsLedgerEntry {
  id: number;
  tenant_id: string;
  property_id: string;
  rule_code: string;
  delta: number;
  ref_type?: string;
  ref_id?: string;
  expires_at?: string | null;
  created_by?: string;
  created_at: string;
}

export interface TenantStreak {
  tenant_id: string;
  property_id: string;
  on_time_months: number;
  cached_balance: number;
  last_on_time_due_id?: string;
  freezes_available: number;
  last_freeze_used_at?: string;
  updated_at: string;
}

export interface TenantPointsSummary {
  balance: number;
  expiring_soon: number;
  earliest_expiry?: string | null;
  on_time_months: number;
  freezes_left: number;
  ledger: PointsLedgerEntry[];
}

export interface RewardsCatalogItem {
  id: string;
  property_id: string;
  code: string;
  title: string;
  description: string;
  category: "cash_credit" | "food_coupon" | "perk";
  points_cost: number;
  min_tenure_months: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  eligible?: boolean;
  reason?: string;
}

export interface Redemption {
  id: string;
  tenant_id: string;
  property_id: string;
  reward_id: string;
  points_spent: number;
  status: "completed" | "cancelled";
  applied_due_id?: string;
  coupon_code?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Daily Operations & Kitchen ---
export interface MealRSVP {
  id?: string;
  tenant_id?: string;
  property_id?: string;
  meal_date: string;
  meal_slot: "breakfast" | "lunch" | "dinner";
  attending: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TenantMealRSVPSummary {
  date: string;
  breakfast?: MealRSVP | null;
  lunch?: MealRSVP | null;
  dinner?: MealRSVP | null;
}

export interface HeadcountReport {
  meal_date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

export interface MenuPoll {
  id: string;
  property_id: string;
  month_year: string;
  title: string;
  options: Array<{ id: string; title: string; description?: string }>;
  closed_at?: string | null;
  created_at: string;
}

export interface MenuVote {
  id: string;
  poll_id: string;
  tenant_id: string;
  option_id: string;
  created_at: string;
}

// --- Inspections & Audits ---
export interface InspectionItem {
  id: string;
  inspection_id: string;
  item_key: string;
  description: string;
  passed: boolean;
  has_photo: boolean;
  notes: string;
  disputed_at?: string | null;
  dispute_note?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_status: "none" | "disputed" | "upheld" | "overturned";
}

export interface Inspection {
  id: string;
  property_id: string;
  room_id?: string | null;
  floor_id?: string | null;
  inspector_user_id: string;
  inspection_type: "room" | "floor" | "common_bathroom";
  score_percent: number;
  passed: boolean;
  notes: string;
  inspected_at: string;
  created_at: string;
  items?: InspectionItem[];
}

export interface VendorInspection {
  id: string;
  property_id: string;
  inspector_user_id: string;
  vendor_name: string;
  inspection_type: string;
  score_percent: number;
  notes: string;
  has_photo: boolean;
  penalty_paise: number;
  inspected_at: string;
  created_at: string;
}

// --- Maintenance, Violations & Metering ---
export interface HazardReport {
  id: string;
  property_id: string;
  category: string;
  description: string;
  has_photo: boolean;
  status: "open" | "in_progress" | "resolved" | "rejected";
  resolved_at?: string | null;
  resolved_by?: string | null;
  points_awarded: boolean;
  created_at: string;
}

export interface Violation {
  id: string;
  tenant_id: string;
  property_id: string;
  rule_code: string;
  severity: "safety" | "lifestyle";
  step: 1 | 2 | 3;
  description: string;
  has_evidence: boolean;
  acknowledged_at?: string | null;
  created_by: string;
  created_at: string;
}

export interface MeterReading {
  id: string;
  property_id: string;
  room_id?: string | null;
  floor_id?: string | null;
  kind: "electricity" | "water";
  reading_value: number;
  reading_at: string;
  source: string;
  recorded_by: string;
  created_at: string;
}

export interface MeterReadingResult {
  reading: MeterReading;
  delta_units: number;
  billable_paise: number;
  excess_units: number;
  anomaly?: boolean;
}

export interface Referral {
  id: string;
  property_id: string;
  referrer_tenant_id: string;
  referred_tenant_id?: string | null;
  phone: string;
  name: string;
  status: "pending" | "moved_in" | "rewarded";
  points_awarded: number;
  created_at: string;
  rewarded_at?: string | null;
}
