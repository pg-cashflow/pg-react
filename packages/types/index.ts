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

export type SupportedLocale = "en-IN" | "te-IN" | "ta-IN" | "kn-IN";
export type SupportedTheme = "system" | "light" | "dark";

export const ERROR_CODES = [
  "auth.missingToken",
  "auth.invalidToken",
  "auth.accessRevoked",
  "auth.profileIncomplete",
  "auth.forbidden",
  "auth.alreadyActivated",
  "auth.invalidOtp",
  "auth.otpExpired",
  "auth.otpLocked",
  "auth.rateLimited",
  "auth.noAccount",
  "auth.invalidInvite",
  "auth.firebaseNotConfigured",
  "auth.emailNotVerified",
  "auth.invalidFirebaseToken",
  "auth.unauthorized",
  "auth.noPropertyScope",
  "auth.noDeliveryChannel",
  "auth.endpointDisabled",
  "join.invalidInvite",
  "join.noPendingRequest",
  "join.notFound",
  "join.alreadyOnboarded",
  "join.alreadyActive",
  "join.nameRequired",
  "join.consentRequired",
  "join.photoRequired",
  "join.profileIncomplete",
  "join.requestNotPending",
  "join.notAwaitingAssignment",
  "slot.room_full",
  "onboarding.room_master_missing",
  "onboarding.settingsInvalid",
  "slot.inviteNotOpen",
  "waitlist.disabled",
  "waitlist.roomOpen",
  "waitlist.duplicate",
  "slot.boundPhoneMismatch",
  "payment.duplicateTxn",
  "payment.cashPartialNotAllowed",
  "payment.dueNotOpen",
  "payment.noDepositDue",
  "payment.emptyTxnId",
  "payment.ambiguousMatch",
  "payment.noMatch",
  "payment.invalidAmount",
  "finance.duplicateRequest",
  "finance.idempotencyRequired",
  "finance.invalidAmount",
  "finance.invalidKind",
  "finance.overpay",
  "finance.expenseNotPayable",
  "finance.policyExceeded",
  "finance.approvalRequired",
  "finance.periodNotCloseable",
  "finance.periodNotReopenable",
  "finance.periodClosed",
  "finance.notFound",
  "finance.forbidden",
  "finance.disabled",
  "finance.expenseNotVoidable",
  "finance.expenseStateChanged",
  "finance.reasonRequired",
  "finance.dateOutOfRange",
  "finance.invalidSettings",
  "request.invalidBody",
  "request.invalidId",
  "request.dueDayInvalid",
  "request.imageTooLarge",
  "request.imageReadFailed",
  "preferences.localeRequired",
  "preferences.invalidLocale",
  "preferences.invalidTheme",
  "preferences.noFields",
  "push.endpointInvalid",
  "push.endpointConflict",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];


export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  native_name: string;
}

export interface LocalesResponse {
  locales: LocaleMetadata[];
  default_locale: SupportedLocale;
}

export interface PreferencesResponse {
  locale: SupportedLocale;
  has_saved_preference: boolean;
  theme: SupportedTheme | null;
  has_saved_theme: boolean;
}

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  tenant_id?: string;
  property_id?: string;
  locale?: string;
  has_saved_preference?: boolean;
  theme?: SupportedTheme | null;
  has_saved_theme?: boolean;
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

export interface DiscrepancyItem {
  category: string;
  amount_paise: Paise;
  note?: string;
  severity: "critical" | "warning" | "info";
}

export interface DailySettlementBalance {
  id: string;
  property_id: string;
  balance_date: string;
  gateway_gross_paise: Paise;
  gateway_net_settled_paise: Paise;
  gateway_fees_paise: Paise;
  gateway_tax_paise: Paise;
  gateway_adjustment_paise: Paise;
  gateway_in_transit_paise: Paise;
  bank_credits_paise: Paise;
  bank_debits_paise: Paise;
  ledger_bank_dr_paise: Paise;
  ledger_bank_cr_paise: Paise;
  unapplied_quarantine_paise: Paise;
  discrepancy_paise: Paise;
  is_balanced: boolean;
  discrepancies: DiscrepancyItem[];
  balanced_at?: string;
  created_at: string;
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
  /** Set when property is Cashfree but backend fell back to manual. Values: "missing_phone" | "gateway_down" */
  fallback_reason?: "missing_phone" | "gateway_down";
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

export type SlotInviteStatus = "open" | "consumed" | "revoked" | "expired";

export interface SlotInvite {
  id: string;
  property_id: string;
  floor_id: string;
  room_id: string;
  code: string;
  rent_paise: Paise;
  deposit_paise: Paise;
  due_day: number;
  status: SlotInviteStatus;
  terms_frozen_at: string;
  profile_schema_version?: number;
  allow_over_capacity: boolean;
  expires_at: string;
  created_at: string;
}

export interface RoomOccupancy {
  id: string;
  room_number: string;
  capacity: number;
  occupied_beds: number;
  vacant_beds: number;
  is_vacant: boolean;
  tenant_names?: string[];
}

export interface FloorOccupancy {
  floor_id: string;
  floor_number: number;
  floor_name: string;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  capacity_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  occupancy_rate_pct: number;
  rooms: RoomOccupancy[];
}

export interface PropertyOccupancyResponse {
  property_id: string;
  capacity_beds: number;
  occupied_beds: number;
  vacant_beds: number;
  beds_at_risk: number;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  occupancy_rate_pct: number;
  floors: FloorOccupancy[];
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

export type KYCStatus =
  | "pending"
  | "pending_manual_review"
  | "verified"
  | "failed"
  | "rejected"
  | "expired"
  | "revoked";

export type KYCMethod = "digilocker" | "aadhaar_otp" | "ocr" | "qr";

export interface KYCVerification {
  id: string;
  status: KYCStatus;
  method: KYCMethod;
  masked_uid?: string;
  verified_at?: string;
  expires_at?: string;
  failure_reason?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerKYCVerificationView extends KYCVerification {
  duplicate_detected?: boolean;
  is_dedupable?: boolean;
  trust_tier?: string;
  qr_status?: string;
  photo_stored?: boolean;
  name_mismatch?: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  document_url?: string;
  document_name?: string;
  tenant_name?: string;
  room_number?: string;
  tenant_id?: string;
}

export interface KYCStatusResponse {
  verification: KYCVerification | null;
  consent_active: boolean;
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

// --- M7 Money Out / Payout Models ---
export type PayeeType = "staff" | "vendor" | "tenant_deposit" | "guardian_deposit";

export interface PayoutPayee {
  id: string;
  property_id: string;
  payee_type: PayeeType;
  name: string;
  phone?: string | null;
  account_number_last4?: string | null;
  ifsc?: string | null;
  bank_name?: string | null;
  upi_vpa?: string | null;
  key_version: number;
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type PayoutBatchStatus =
  | "draft"
  | "approved"
  | "processing"
  | "dispatch_unknown"
  | "completed"
  | "partially_failed"
  | "failed"
  | "cancelled";

export interface PayoutBatch {
  id: string;
  property_id: string;
  batch_number: string;
  format_type: string;
  status: PayoutBatchStatus;
  total_amount_paise: number;
  item_count: number;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  file_checksum?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type PayoutItemStatus =
  | "pending"
  | "processing"
  | "cashfree_approval_pending"
  | "succeeded"
  | "failed"
  | "retriable_failed"
  | "rejected"
  | "reversed"
  | "cancelled";

export interface PayoutItem {
  id: string;
  batch_id?: string | null;
  payee_id: string;
  departure_id?: string | null;
  reference_number: string;
  amount_paise: number;
  purpose: string;
  period_label: string;
  status: PayoutItemStatus;
  utr?: string | null;
  settled_at?: string | null;
  failure_reason?: string | null;
  cf_transfer_id?: string | null;
  retry_of?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovePayoutBatchInput {
  expected_item_count: number;
  expected_total_paise: number;
  otp?: string;
  firebase_id_token?: string;
  reauth_confirmation?: string;
}

export interface RequestPayoutBatchOTPResponse {
  message: string;
  channel: string;
  destination: string;
  phone: string;
}

