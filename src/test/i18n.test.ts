import { describe, it, expect, vi } from "vitest";
import { enIN } from "@/i18n/messages/en-IN";

import { teIN } from "@/i18n/messages/te-IN";
import { taIN } from "@/i18n/messages/ta-IN";
import { knIN } from "@/i18n/messages/kn-IN";
import { isSupportedLocale } from "@/i18n";
import { getStoredLocale, setStoredLocale } from "@/auth/storage";
import { formatPaise, formatDate } from "@/lib/utils";

describe("i18n message completeness", () => {

  const baseKeys = Object.keys(enIN).sort();

  it("te-IN has parity with en-IN keys", () => {
    const teKeys = Object.keys(teIN).sort();
    expect(teKeys).toEqual(baseKeys);
  });

  it("ta-IN has parity with en-IN keys", () => {
    const taKeys = Object.keys(taIN).sort();
    expect(taKeys).toEqual(baseKeys);
  });

  it("kn-IN has parity with en-IN keys", () => {
    const knKeys = Object.keys(knIN).sort();
    expect(knKeys).toEqual(baseKeys);
  });

  it("identifies supported locales correctly", () => {
    expect(isSupportedLocale("en-IN")).toBe(true);
    expect(isSupportedLocale("te-IN")).toBe(true);
    expect(isSupportedLocale("ta-IN")).toBe(true);
    expect(isSupportedLocale("kn-IN")).toBe(true);
    expect(isSupportedLocale("fr-FR")).toBe(false);
  });

  it("stores and retrieves locale in localStorage cache", () => {
    expect(getStoredLocale()).toBe("en-IN");
    setStoredLocale("te-IN");
    expect(getStoredLocale()).toBe("te-IN");
  });

  describe("locale-aware number, currency, and date formatting", () => {
    it("formats Indian rupee currency across all 4 locales", () => {
      const amountPaise = 150050; // ₹1,500.50
      for (const loc of ["en-IN", "te-IN", "ta-IN", "kn-IN"] as const) {
        const formatted = formatPaise(amountPaise, loc);
        // All Indian regional locales format currency with the ₹ symbol and 1,500.50 or regional digits
        expect(formatted).toBeTruthy();
        expect(formatted).toContain("₹");
        expect(formatted).toMatch(/1.*500.*50/);
      }
    });

    it("formats dates across regional locales", () => {
      const isoDate = "2026-09-21T00:00:00Z";
      for (const loc of ["en-IN", "te-IN", "ta-IN", "kn-IN"] as const) {
        const formatted = formatDate(isoDate, loc);
        expect(formatted).toBeTruthy();
        // Year 2026 must be present in all date representations
        expect(formatted).toMatch(/2026/);
      }
    });
  });

  describe("LocaleProvider concurrency & abort behavior", () => {
    it("aborts superseded in-flight persist request on rapid setLocale calls", async () => {
      const { createRoot } = await import("react-dom/client");
      const React = await import("react");
      const { LocaleProvider, useLocale } = await import("@/i18n");
      const preferencesApi = await import("@/api/preferences");
      const { queryClient } = await import("@/lib/queryClient");
      const { QUERY_KEYS } = await import("@/lib/queryKeys");

      let contextValue!: ReturnType<typeof useLocale>;
      function Consumer() {
        contextValue = useLocale();
        return null;
      }

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      await React.act(async () => {
        root.render(
          React.createElement(LocaleProvider, null, React.createElement(Consumer))
        );
      });

      const capturedSignals: AbortSignal[] = [];
      const spy = vi.spyOn(preferencesApi, "updateMyPreferences").mockImplementation(
        (data, signal) => {
          if (signal) capturedSignals.push(signal);
          const delay = data.locale === "te-IN" ? 60 : 10;
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              resolve({ locale: data.locale, has_saved_preference: true });
            }, delay);
            signal?.addEventListener("abort", () => {
              clearTimeout(timeout);
              const err = new DOMException("The user aborted a request.", "AbortError");
              reject(err);
            });
          });
        }
      );

      let p1!: Promise<boolean>;
      let p2!: Promise<boolean>;

      await React.act(async () => {
        p1 = contextValue.setLocale("te-IN", true);
        p2 = contextValue.setLocale("ta-IN", true);
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1).toBe(false); // Superseded and aborted
      expect(res2).toBe(true);  // Successfully persisted

      expect(spy).toHaveBeenCalledTimes(2);
      expect(capturedSignals[0].aborted).toBe(true);
      expect(capturedSignals[1].aborted).toBe(false);

      expect(contextValue.locale).toBe("ta-IN");
      expect(getStoredLocale()).toBe("ta-IN");

      const cachedData = queryClient.getQueryData<{ locale: string }>(QUERY_KEYS.preferences);
      expect(cachedData?.locale).toBe("ta-IN");

      await React.act(async () => {
        root.unmount();
        container.remove();
      });
      spy.mockRestore();
    });

    it("does not re-fire attemptSync or cannibalize user clicks when LocaleSync is mounted", async () => {
      const { createRoot } = await import("react-dom/client");
      const React = await import("react");
      const { LocaleProvider, LocaleSync, useLocale } = await import("@/i18n");
      const preferencesApi = await import("@/api/preferences");
      const authModule = await import("@/auth/context");

      let currentUser: any = {
        id: "u-999",
        role: "tenant",
        locale: "en-IN",
        has_saved_preference: true,
      };

      const authSpy = vi.spyOn(authModule, "useAuth").mockImplementation(() => ({
        user: currentUser,
        updateUser: (patch: any) => {
          currentUser = { ...currentUser, ...patch };
        },
        token: "fake-jwt",
        role: "tenant",
        userId: currentUser.id,
        tenantId: null,
        isPendingJoin: false,
        isAuthenticated: true,
        isLoading: false,
        sendPhoneOtp: vi.fn(),
        confirmPhoneOtp: vi.fn(),
        loginWithGoogle: vi.fn(),
        reExchangeFirebase: vi.fn(),
        logout: vi.fn(),
      }));

      let contextValue!: ReturnType<typeof useLocale>;
      function Consumer() {
        contextValue = useLocale();
        return null;
      }

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      // Mount full LocaleProvider -> LocaleSync -> Consumer tree
      await React.act(async () => {
        root.render(
          React.createElement(
            LocaleProvider,
            null,
            React.createElement(LocaleSync),
            React.createElement(Consumer)
          )
        );
      });

      // Initial mount of returning user should reconcile locally without network calls
      const prefSpy = vi.spyOn(preferencesApi, "updateMyPreferences").mockResolvedValue({
        locale: "te-IN",
        has_saved_preference: true,
      });

      // User explicitly clicks Telugu
      let result!: boolean;
      await React.act(async () => {
        result = await contextValue.setLocale("te-IN", true);
      });

      // Assert the click resolved successfully
      expect(result).toBe(true);

      // CRITICAL ASSERTION:
      // updateMyPreferences must be called EXACTLY ONCE.
      // If attemptSync had `locale` in its deps, it would re-fire reactively and issue a 2nd PATCH.
      expect(prefSpy).toHaveBeenCalledTimes(1);
      expect(prefSpy).toHaveBeenCalledWith(
        { locale: "te-IN" },
        expect.objectContaining({ aborted: false })
      );

      // Auth user state updated
      expect(currentUser.locale).toBe("te-IN");

      await React.act(async () => {
        root.unmount();
        container.remove();
      });
      authSpy.mockRestore();
      prefSpy.mockRestore();
    });
  });

  describe("Error Code Registry drift guard", () => {
    it("error-codes.json matches ERROR_CODES and contains valid codes", async () => {
      const { ERROR_CODES } = await import("@pg/types");
      const errorCodes = (await import("@/i18n/error-codes.json")).default as string[];

      // Length must match (no additions/removals without updating both)
      expect(errorCodes).toHaveLength(ERROR_CODES.length);

      const codeRegex = /^[a-z]+(\.[a-zA-Z0-9]+)+$/;
      for (const code of errorCodes) {
        expect(code).toMatch(codeRegex);
      }

      // Every code in the JSON must be in ERROR_CODES
      const registrySet = new Set<string>(ERROR_CODES);
      for (const code of errorCodes) {
        expect(registrySet.has(code)).toBe(true);
      }

      // Every code in ERROR_CODES must be in the JSON
      const jsonSet = new Set(errorCodes);
      for (const code of ERROR_CODES) {
        expect(jsonSet.has(code)).toBe(true);
      }

      // No duplicates
      expect(jsonSet.size).toBe(ERROR_CODES.length);
    });
  });
});



