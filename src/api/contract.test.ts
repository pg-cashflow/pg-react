import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { exchangeFirebaseToken } from "./auth";
import { lookupInvite, activateJoin } from "./join";
import { getTenantDuePay } from "./pay";

const API = "http://localhost:8080";

const server = setupServer(
  http.get(`${API}/join/invite/:code`, ({ params }) => {
    if (params.code !== "DEVINV01") {
      return HttpResponse.json({ error: "invalid invite code" }, { status: 404 });
    }
    return HttpResponse.json({
      property_id: "prop-1",
      property_name: "Dev PG",
      owner_name: "Owner",
    });
  }),
  http.post(`${API}/auth/firebase`, async ({ request }) => {
    const body = (await request.json()) as { id_token?: string; invite_code?: string };
    if (!body.id_token) {
      return HttpResponse.json({ error: "invalid body" }, { status: 400 });
    }
    if (body.invite_code === "DEVINV01") {
      return HttpResponse.json({
        token: "jwt-pending",
        user: { id: "u1", phone: "+919000000000", role: "tenant" },
      });
    }
    return HttpResponse.json({
      token: "jwt-owner",
      user: { id: "u0", phone: "+918008281429", role: "owner", property_id: "prop-1" },
    });
  }),
  http.post(`${API}/owner/join-requests/:id/activate`, async ({ request }) => {
    const body = (await request.json()) as { rent_amount?: number; due_day?: number };
    if (!body.rent_amount || !body.due_day) {
      return HttpResponse.json({ error: "room/rent/due_day required from owner — tenant cannot set rent" }, { status: 400 });
    }
    return HttpResponse.json({
      id: "t1",
      property_id: "prop-1",
      name: "Rahul",
      rent_amount: body.rent_amount,
      due_day: body.due_day,
      notice_period_days: 30,
      credit_balance_paise: 0,
      status: "active",
      contact_mode: "self_service",
      created_at: "2026-08-16T00:00:00Z",
      updated_at: "2026-08-16T00:00:00Z",
    });
  }),
  http.get(`${API}/tenant/dues/:id/pay`, () =>
    HttpResponse.json({
      mode: "manual",
      vpa: "owner@upi",
      upi_link: "upi://pay?pa=owner@upi",
      note: "PG-ABC123",
      due_code: "ABC123",
      amount_paise: 1500000,
      qr_png_url: "/tenant/dues/d1/qr",
      payable: true,
    })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CONTRACT fixtures", () => {
  it("looks up an invite without VPA", async () => {
    const out = await lookupInvite("DEVINV01");
    expect(out.property_name).toBe("Dev PG");
    expect(out).not.toHaveProperty("upi_vpa");
  });

  it("sends invite_code on Firebase exchange", async () => {
    const out = await exchangeFirebaseToken("id-token", "DEVINV01");
    expect(out.user.role).toBe("tenant");
    expect(out.user.tenant_id).toBeUndefined();
  });

  it("activates a join with owner-set rent in paise", async () => {
    const t = await activateJoin("j1", { rent_amount: 1500000, due_day: 5 });
    expect(t.rent_amount).toBe(1500000);
    expect(t.due_day).toBe(5);
  });

  it("returns pay JSON with VPA only on the pay payload", async () => {
    const pay = await getTenantDuePay("d1");
    expect(pay.mode).toBe("manual");
    expect(pay.vpa).toBe("owner@upi");
    expect(pay.note).toBe("PG-ABC123");
    expect(pay.payable).toBe(true);
  });
});
