import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "./client";
import { logoutSession } from "./auth";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("logoutSession", () => {
  it("does not treat a 2xx response with ok=false as completed revocation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, warning: "revocation pending" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(logoutSession()).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
    } satisfies Partial<ApiError>);
  });

  it("resolves only after the server confirms revocation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(logoutSession()).resolves.toEqual({ ok: true });
  });
});
