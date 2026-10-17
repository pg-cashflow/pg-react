import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { PwaInstallPrompt } from "@/components/common/PwaInstallPrompt";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

describe("PwaInstallPrompt component", () => {
  it("does not render when app is already in standalone mode", () => {
    // Mock matchMedia for standalone
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    act(() => {
      root?.render(<PwaInstallPrompt />);
    });

    const banner = container?.querySelector("[data-testid='pwa-install-banner']");
    expect(banner).toBeNull();
  });

  it("renders install banner when beforeinstallprompt is captured", () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    act(() => {
      root?.render(<PwaInstallPrompt />);
    });

    // Before event, nothing renders on non-iOS
    expect(container?.querySelector("[data-testid='pwa-install-banner']")).toBeNull();

    // Fire beforeinstallprompt event
    act(() => {
      const event = new Event("beforeinstallprompt") as any;
      event.prompt = vi.fn().mockResolvedValue(undefined);
      event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
      window.dispatchEvent(event);
    });

    const banner = container?.querySelector("[data-testid='pwa-install-banner']");
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain("Install PG Cashflow");
  });

  it("triggers prompt() when clicking install button", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const mockPrompt = vi.fn().mockResolvedValue(undefined);

    act(() => {
      root?.render(<PwaInstallPrompt />);
    });

    act(() => {
      const event = new Event("beforeinstallprompt") as any;
      event.prompt = mockPrompt;
      event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
      window.dispatchEvent(event);
    });

    const button = container?.querySelector("button") as HTMLButtonElement;
    expect(button).toBeTruthy();

    await act(async () => {
      button.click();
    });

    expect(mockPrompt).toHaveBeenCalled();
  });

  it("shows iOS instruction sheet on iOS Safari when install is clicked", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock iOS user agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });

    act(() => {
      root?.render(<PwaInstallPrompt />);
    });

    const banner = container?.querySelector("[data-testid='pwa-install-banner']");
    expect(banner).toBeTruthy();

    const installBtn = container?.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      installBtn.click();
    });

    const sheet = container?.querySelector("[data-testid='ios-install-sheet']");
    expect(sheet).toBeTruthy();
    expect(sheet?.textContent).toContain("Add to Home Screen");
    expect(sheet?.textContent).toContain("Tap the Share button");
  });
});
