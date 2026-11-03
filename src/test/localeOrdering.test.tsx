import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect } from "vitest";
import { LocaleProvider, useLocale } from "../i18n/provider";

describe("language selection ordering", () => {
  it("keeps the last selection when an earlier dictionary is still loading", async () => {
    let locale!: ReturnType<typeof useLocale>;
    function Consumer() { locale = useLocale(); return null; }
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<LocaleProvider><Consumer /></LocaleProvider>));
    await act(async () => {
      const slow = locale.setLocale("te-IN", false);
      const newest = locale.setLocale("en-IN", false);
      await Promise.all([slow, newest]);
    });
    expect(locale.locale).toBe("en-IN");
    expect(document.documentElement.lang).toBe("en-IN");
    act(() => root.unmount());
  });
});
