import { apiFetch } from "./client";
import type {
  TenantPointsSummary,
  RewardsCatalogItem,
  Redemption,
  Inspection,
  MealRSVP,
  TenantMealRSVPSummary,
  MenuPoll,
  HazardReport,
  Violation,
  HeadcountReport,
  MeterReadingResult,
  VendorInspection,
  PropertyGamificationSettings,
  PointRule,
  Floor,
  Room,
  User,
  Referral,
} from "@pg/types";

// ==========================================
// --- Tenant API Endpoints ---
// ==========================================

export const getTenantPoints = (): Promise<TenantPointsSummary> =>
  apiFetch<TenantPointsSummary>("/tenant/points");

export const getTenantRewards = async (): Promise<RewardsCatalogItem[]> => {
  const data = await apiFetch<{ rewards: RewardsCatalogItem[] }>("/tenant/rewards");
  return data.rewards || [];
};

export const redeemTenantReward = (rewardId: string): Promise<{ redemption: Redemption }> =>
  apiFetch<{ redemption: Redemption }>(`/tenant/rewards/${rewardId}/redeem`, {
    method: "POST",
    body: "{}",
  });

export const getTenantInspections = async (): Promise<Inspection[]> => {
  const data = await apiFetch<{ inspections: Inspection[] }>("/tenant/inspections");
  return data.inspections || [];
};

export const disputeInspectionItem = (
  itemId: string,
  disputeNote: string
): Promise<{ status: string }> =>
  apiFetch<{ status: string }>(`/tenant/inspections/items/${itemId}/dispute`, {
    method: "POST",
    body: JSON.stringify({ dispute_note: disputeNote }),
  });

export const getTenantMealRSVP = (): Promise<TenantMealRSVPSummary> =>
  apiFetch<TenantMealRSVPSummary>("/tenant/meal-rsvp");

export const submitTenantMealRSVP = (body: {
  date: string;
  slot: "breakfast" | "lunch" | "dinner";
  attending: boolean;
}): Promise<{ rsvp: MealRSVP }> =>
  apiFetch<{ rsvp: MealRSVP }>("/tenant/meal-rsvp", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getTenantMenuPoll = (): Promise<{ poll: MenuPoll | null; votes?: Record<string, number> }> =>
  apiFetch<{ poll: MenuPoll | null; votes?: Record<string, number> }>("/tenant/menu-poll");

export const voteMenuPoll = (body: {
  poll_id: string;
  option_id: string;
}): Promise<{ status: string }> =>
  apiFetch<{ status: string }>("/tenant/menu-poll/vote", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const reportTenantHazard = (body: {
  category: string;
  description: string;
  photo?: File | null;
  photo_base64?: string;
}): Promise<{ hazard: HazardReport }> => {
  if (body.photo) {
    const fd = new FormData();
    fd.append("category", body.category);
    fd.append("description", body.description);
    fd.append("photo", body.photo);
    return apiFetch<{ hazard: HazardReport }>("/tenant/hazards", {
      method: "POST",
      body: fd,
    });
  }
  return apiFetch<{ hazard: HazardReport }>("/tenant/hazards", {
    method: "POST",
    body: JSON.stringify({
      category: body.category,
      description: body.description,
      photo_base64: body.photo_base64 || "",
    }),
  });
};

export const getTenantViolations = async (): Promise<Violation[]> => {
  const data = await apiFetch<{ violations: Violation[] }>("/tenant/violations");
  return data.violations || [];
};

export const getTenantLeaderboard = (): Promise<{
  streaks: Array<{ tenant_id: string; on_time_months: number; cached_balance: number }>;
  floor_scores?: Array<{ floor_number: number; name: string; score_percent: number }>;
}> => apiFetch("/tenant/leaderboard");

export const getTenantReferrals = async (): Promise<Referral[]> => {
  const data = await apiFetch<{ referrals: Referral[] }>("/tenant/referrals");
  return data.referrals || [];
};

export const createTenantReferral = (body: { phone: string; name: string }): Promise<{ referral: Referral }> =>
  apiFetch<{ referral: Referral }>("/tenant/referrals", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ==========================================
// --- Manager / Warden API Endpoints ---
// ==========================================

export const getManagerKitchenHeadcount = (
  propertyId: string,
  date?: string
): Promise<{ headcount: HeadcountReport }> => {
  const q = new URLSearchParams({ property_id: propertyId });
  if (date) q.append("date", date);
  return apiFetch<{ headcount: HeadcountReport }>(`/manager/kitchen/headcount?${q.toString()}`);
};

export interface SubmitInspectionPayload {
  property_id: string;
  room_id?: string | null;
  floor_id?: string | null;
  inspection_type: "room" | "floor" | "common_bathroom";
  notes?: string;
  items: Array<{
    item_key: string;
    description: string;
    passed: boolean;
    photo_base64?: string;
    notes?: string;
  }>;
}

export const submitManagerInspection = (body: SubmitInspectionPayload): Promise<{ inspection: Inspection }> =>
  apiFetch<{ inspection: Inspection }>("/manager/inspections", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const listManagerInspections = async (propertyId: string): Promise<Inspection[]> => {
  const data = await apiFetch<{ inspections: Inspection[] }>(
    `/manager/inspections?property_id=${encodeURIComponent(propertyId)}`
  );
  return data.inspections || [];
};

export const resolveInspectionItem = (
  itemId: string,
  status: "upheld" | "overturned"
): Promise<{ status: string; resolution: string }> =>
  apiFetch<{ status: string; resolution: string }>(`/manager/inspections/items/${itemId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });

export const recordManagerMeterReading = (body: {
  property_id: string;
  room_id?: string | null;
  floor_id?: string | null;
  kind: "electricity" | "water";
  reading_value: number;
  meter_replaced?: boolean;
  confirm_anomaly?: boolean;
}): Promise<{ result: MeterReadingResult }> =>
  apiFetch<{ result: MeterReadingResult }>("/manager/meter-readings", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const listManagerHazards = async (
  propertyId: string,
  status?: string
): Promise<HazardReport[]> => {
  const q = new URLSearchParams({ property_id: propertyId });
  if (status) q.append("status", status);
  const data = await apiFetch<{ hazards: HazardReport[] }>(`/manager/hazards?${q.toString()}`);
  return data.hazards || [];
};

export const resolveManagerHazard = (
  hazardId: string,
  status: "resolved" | "rejected" = "resolved"
): Promise<{ status: string }> =>
  apiFetch<{ status: string }>(`/manager/hazards/${hazardId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });

export const logManagerViolation = (body: {
  tenant_id: string;
  rule_code: string;
  severity: "safety" | "lifestyle";
  description: string;
  evidence_base64?: string;
}): Promise<{ violation: Violation }> =>
  apiFetch<{ violation: Violation }>("/manager/violations", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const submitManagerVendorInspection = (body: {
  property_id: string;
  vendor_name: string;
  score_percent: number;
  notes: string;
  penalty_paise: number;
  photo_base64?: string;
}): Promise<{ vendor_inspection: VendorInspection }> =>
  apiFetch<{ vendor_inspection: VendorInspection }>("/manager/vendor-inspections", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ==========================================
// --- Owner Facility & Gamification Settings ---
// ==========================================

export const getOwnerGamificationSettings = (
  propertyId: string
): Promise<{ settings: PropertyGamificationSettings; rules: PointRule[] }> =>
  apiFetch<{ settings: PropertyGamificationSettings; rules: PointRule[] }>(
    `/owner/gamification/settings?property_id=${encodeURIComponent(propertyId)}`
  );

export const updateOwnerGamificationSettings = (
  body: PropertyGamificationSettings
): Promise<{ settings: PropertyGamificationSettings }> =>
  apiFetch<{ settings: PropertyGamificationSettings }>("/owner/gamification/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const listOwnerFloors = async (propertyId: string): Promise<Floor[]> => {
  const data = await apiFetch<{ floors: Floor[] }>(
    `/owner/floors?property_id=${encodeURIComponent(propertyId)}`
  );
  return data.floors || [];
};

export const createOwnerFloor = (body: {
  property_id: string;
  floor_number: number;
  name: string;
}): Promise<{ floor: Floor }> =>
  apiFetch<{ floor: Floor }>("/owner/floors", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const listOwnerRooms = async (propertyId: string): Promise<Room[]> => {
  const data = await apiFetch<{ rooms: Room[] }>(
    `/owner/rooms?property_id=${encodeURIComponent(propertyId)}`
  );
  return data.rooms || [];
};

export const createOwnerRoom = (body: {
  property_id: string;
  floor_id: string;
  room_number: string;
  capacity: number;
  included_units: number;
}): Promise<{ room: Room }> =>
  apiFetch<{ room: Room }>("/owner/rooms", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const createOwnerManager = (body: {
  property_id?: string;
  phone: string;
}): Promise<{ manager: User }> =>
  apiFetch<{ manager: User }>("/owner/managers", {
    method: "POST",
    body: JSON.stringify(body),
  });
