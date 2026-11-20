import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_PATTERNS = [
  /innovate tech park/i,
  /koramangala/i,
  /\+91\s*\(080\)\s*4567-8900/,
  /example\.com/i,
  /pgcashflow\.in/i,
  /placeholder/i,
  /\bTODO\b/i,
  /\bTBD\b/i,
];

export function findPlaceholders(company) {
  const matches = [];
  const fieldsToCheck = [
    "legalName",
    "address",
    "supportEmail",
    "helpdeskPhone",
    "grievanceEmail",
    "privacyEmail",
  ];
  for (const field of fieldsToCheck) {
    const val = company[field];
    if (typeof val === "string") {
      for (const pat of PLACEHOLDER_PATTERNS) {
        if (pat.test(val)) {
          matches.push({ field, value: val, pattern: pat.toString() });
          break;
        }
      }
    }
  }
  return matches;
}

export function validateCompanyConfig(company, env = process.env) {
  const allowUnverified = (env.ALLOW_UNVERIFIED_COMPANY || "").toString().trim().toLowerCase();
  if (allowUnverified === "1" || allowUnverified === "true") {
    return { ok: true, warned: true, reason: "ALLOW_UNVERIFIED_COMPANY override" };
  }

  if (!company.verified) {
    return {
      ok: false,
      reason: 'Company details in src/config/company.json are not verified (verified: false).',
    };
  }

  const placeholders = findPlaceholders(company);
  if (placeholders.length > 0) {
    const list = placeholders.map((p) => `${p.field} ("${p.value}")`).join(", ");
    return {
      ok: false,
      reason: `Company details are marked verified: true, but contain placeholder values: ${list}.`,
    };
  }

  const requiredFields = ["legalName", "address", "supportEmail", "helpdeskPhone", "grievanceEmail"];
  for (const field of requiredFields) {
    if (!company[field] || typeof company[field] !== "string" || company[field].trim() === "") {
      return {
        ok: false,
        reason: `Required company field '${field}' is missing or empty.`,
      };
    }
  }

  return { ok: true, legalName: company.legalName };
}

// When executed directly as CLI script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const companyConfigPath = path.resolve(__dirname, "../src/config/company.json");

  if (!fs.existsSync(companyConfigPath)) {
    console.error("[ERROR] src/config/company.json not found.");
    process.exit(1);
  }

  const raw = fs.readFileSync(companyConfigPath, "utf-8");
  let company;
  try {
    company = JSON.parse(raw);
  } catch (err) {
    console.error("[ERROR] Failed to parse src/config/company.json:", err.message);
    process.exit(1);
  }

  const result = validateCompanyConfig(company);
  if (result.warned) {
    console.warn(`[WARN] Building with unverified company details (${result.reason}).`);
    process.exit(0);
  }
  if (!result.ok) {
    console.error(`\n[BLOCKED] ${result.reason}`);
    console.error('Please insert real legal entity details (legalName, address, grievanceEmail, phone) and set "verified": true.');
    console.error("To bypass this check for testing, set ALLOW_UNVERIFIED_COMPANY=1 in your environment.\n");
    process.exit(1);
  }

  console.log("[OK] Company details verified:", result.legalName);
  process.exit(0);
}
