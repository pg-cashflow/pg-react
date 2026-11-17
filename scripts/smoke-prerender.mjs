#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const policyJsonPath = path.resolve(__dirname, "../src/config/privacy-policy.json");

const privacyPath = path.join(distDir, "privacy.html");
const indexPath = path.join(distDir, "index.html");

if (!fs.existsSync(policyJsonPath)) {
  console.error("[FAIL] src/config/privacy-policy.json does not exist");
  process.exit(1);
}

if (!fs.existsSync(privacyPath)) {
  console.error("[FAIL] dist/privacy.html does not exist");
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error("[FAIL] dist/index.html does not exist");
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(policyJsonPath, "utf8"));
const privacy = fs.readFileSync(privacyPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

// 1. Verify all sections from canonical JSON are in the prerendered HTML
for (const section of policy.sections) {
  if (!privacy.includes(section.heading)) {
    console.error(`[FAIL] Missing heading in dist/privacy.html: "${section.heading}"`);
    process.exit(1);
  }
}

// 2. Ensure retired Aadhaar OTP claims are not present
if (/aadhaar\s+otp\s+fast-path/i.test(privacy) || /direct\s+aadhaar\s+otp/i.test(privacy)) {
  console.error("[FAIL] Retired Aadhaar OTP claims found in dist/privacy.html");
  process.exit(1);
}

// 3. Ensure SPA entry point is intact and clean
if (!index.includes('id="root"')) {
  console.error("[FAIL] dist/index.html is missing root mount point");
  process.exit(1);
}

if (index.includes(policy.sections[0].heading)) {
  console.error("[FAIL] dist/index.html was polluted with static policy content");
  process.exit(1);
}

console.log(`[OK] Prerender smoke test passed: all ${policy.sections.length} sections verified, retired claims absent, SPA entry clean.`);
