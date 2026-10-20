import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LocaleProvider } from "@/i18n/provider";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en-IN";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

describe("document language follows the active locale", () => {
  it("sets <html lang> from a stored supported locale", () => {
    localStorage.setItem("pg_locale", "te-IN");
    act(() => {
      root?.render(
        <LocaleProvider>
          <div />
        </LocaleProvider>
      );
    });
    expect(document.documentElement.lang).toBe("te-IN");
  });

  it("uses the default language for an unsupported stored locale", () => {
    localStorage.setItem("pg_locale", "xx-ZZ");
    act(() => {
      root?.render(
        <LocaleProvider>
          <div />
        </LocaleProvider>
      );
    });
    expect(document.documentElement.lang).toBe("en-IN");
  });
});
