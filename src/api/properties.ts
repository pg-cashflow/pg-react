import { apiFetch, unwrapList } from "./client";
import type { Property, PaymentMode } from "@pg/types";

export interface CustomFloorInput {
  floor_number: number;
  name: string;
  rooms: string[];
  capacity?: number;
}

export interface CreatePropertyInput {
  name: string;
  address?: string;
  owner_name?: string;
  payment_mode?: PaymentMode;
  floors_count?: number;
  total_rooms_count?: number;
  rooms_per_floor?: number;
  room_capacity?: number;
  start_floor?: number;
  custom_floors?: CustomFloorInput[];
}

export const getProperties = async (): Promise<Property[]> => {
  const data = await apiFetch<{ properties: Property[] }>("/owner/properties");
  return unwrapList(data, "properties");
};

export const createProperty = async (
  input: CreatePropertyInput
): Promise<{ property: Property; floors_created: number; rooms_created: number }> => {
  return apiFetch<{ property: Property; floors_created: number; rooms_created: number }>(
    "/owner/properties",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
};

export const switchProperty = async (
  propertyId: string
): Promise<{ ok: boolean; property: Property }> => {
  return apiFetch<{ ok: boolean; property: Property }>(`/owner/properties/${propertyId}/switch`, {
    method: "POST",
    body: "{}",
  });
};

export interface CashfreeReadiness {
  ready: boolean;
  payment_mode: PaymentMode;
  reason: string;
  env: string;
}

export const getCashfreeReadiness = async (): Promise<CashfreeReadiness> => {
  return apiFetch<CashfreeReadiness>("/owner/settings/cashfree-readiness");
};

export const updatePropertyPaymentMode = async (
  propertyId: string,
  paymentMode: PaymentMode
): Promise<{ ok: boolean; property_id: string; payment_mode: PaymentMode }> => {
  return apiFetch<{ ok: boolean; property_id: string; payment_mode: PaymentMode }>(
    `/owner/properties/${propertyId}/payment-mode`,
    {
      method: "PATCH",
      body: JSON.stringify({ payment_mode: paymentMode }),
    }
  );
};
