import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { ServiceWorkerUpdatePrompt } from "@/components/common/ServiceWorkerUpdatePrompt";
import { LocaleProvider } from "@/i18n";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (container) {
    document.body.removeChild(container);
    container = null;
  }
  root = null;
  vi.restoreAllMocks();
});

describe("ServiceWorkerUpdatePrompt component", () => {
  it("does not render when no service worker is waiting", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          waiting: null,
          addEventListener: vi.fn(),
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(
        <LocaleProvider>
          <ServiceWorkerUpdatePrompt />
        </LocaleProvider>
      );
    });

    const prompt = container?.querySelector("[data-testid='sw-update-prompt']");
    expect(prompt).toBeNull();
  });

  it("renders when a waiting service worker exists and posts SKIP_WAITING on update", async () => {
    const postMessageMock = vi.fn();
    const mockWaitingWorker = {
      postMessage: postMessageMock,
    };

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: {},
        getRegistration: vi.fn().mockResolvedValue({
          waiting: mockWaitingWorker,
          addEventListener: vi.fn(),
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(
        <LocaleProvider>
          <ServiceWorkerUpdatePrompt />
        </LocaleProvider>
      );
    });

    const prompt = container?.querySelector("[data-testid='sw-update-prompt']");
    expect(prompt).toBeTruthy();
    expect(prompt?.textContent).toContain("A new version of PG Cashflow is available.");

    const updateBtn = prompt?.querySelectorAll("button")[1];
    expect(updateBtn?.textContent).toBe("Update Now");

    await act(async () => {
      updateBtn?.click();
    });

    expect(postMessageMock).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("dismisses prompt when clicking Later", async () => {
    const mockWaitingWorker = {
      postMessage: vi.fn(),
    };

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: {},
        getRegistration: vi.fn().mockResolvedValue({
          waiting: mockWaitingWorker,
          addEventListener: vi.fn(),
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(
        <LocaleProvider>
          <ServiceWorkerUpdatePrompt />
        </LocaleProvider>
      );
    });

    const prompt = container?.querySelector("[data-testid='sw-update-prompt']");
    expect(prompt).toBeTruthy();

    const laterBtn = prompt?.querySelectorAll("button")[0];
    expect(laterBtn?.textContent).toBe("Later");

    await act(async () => {
      laterBtn?.click();
    });

    const dismissedPrompt = container?.querySelector("[data-testid='sw-update-prompt']");
    expect(dismissedPrompt).toBeNull();
  });
});

