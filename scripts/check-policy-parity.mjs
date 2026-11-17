#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const policyJsonPath = path.resolve(__dirname, "../src/config/privacy-policy.json");
const reactRoutePath = path.resolve(__dirname, "../src/routes/privacy.tsx");
const prerenderScriptPath = path.resolve(__dirname, "./prerender-landing.mjs");

function fail(msg) {
  console.error(`[FAIL] Policy parity: ${msg}`);
  process.exit(1);
}

// 1. Verify canonical policy JSON exists
if (!fs.existsSync(policyJsonPath)) {
  fail("src/config/privacy-policy.json does not exist");
}

let policy;
try {
  policy = JSON.parse(fs.readFileSync(policyJsonPath, "utf-8"));
} catch (err) {
  fail(`Failed to parse privacy-policy.json: ${err.message}`);
}

// 2. Verify structure
if (!policy.title || !policy.policyVersion || !Array.isArray(policy.sections)) {
  fail("privacy-policy.json missing required top-level fields (title, policyVersion, sections)");
}

if (policy.sections.length !== 7) {
  fail(`Expected 7 privacy policy sections, found ${policy.sections.length}`);
}

// 3. Verify React route imports canonical JSON
const reactContent = fs.readFileSync(reactRoutePath, "utf-8");
if (!reactContent.includes("@/config/privacy-policy.json") && !reactContent.includes("privacy-policy.json")) {
  fail("src/routes/privacy.tsx does not import privacy-policy.json");
}

// 4. Verify prerender script imports canonical JSON
const prerenderContent = fs.readFileSync(prerenderScriptPath, "utf-8");
if (!prerenderContent.includes("privacy-policy.json")) {
  fail("scripts/prerender-landing.mjs does not read privacy-policy.json");
}

// 5. Verify no retired OTP claims
const rawJson = fs.readFileSync(policyJsonPath, "utf-8");
if (/aadhaar\s+otp\s+fast-path/i.test(rawJson) || /direct\s+aadhaar\s+otp/i.test(rawJson)) {
  fail("privacy-policy.json contains retired Aadhaar OTP claims");
}

console.log(`[OK] Policy parity passed: ${policy.sections.length} shared sections, version ${policy.policyVersion}`);
