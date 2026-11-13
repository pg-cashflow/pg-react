import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

if (process.env.ALLOW_UNVERIFIED_COMPANY === "1") {
  console.warn("[WARN] Building with unverified company details (ALLOW_UNVERIFIED_COMPANY=1 override).");
  process.exit(0);
}

if (!company.verified) {
  console.error("\n[BLOCKED] Company details in src/config/company.json are not verified.");
  console.error("Please insert legal entity details (legalName, address, grievanceEmail, phone) and set \"verified\": true.");
  console.error("To bypass this check for testing, set ALLOW_UNVERIFIED_COMPANY=1 in your environment.\n");
  process.exit(1);
}

console.log("[OK] Company details verified:", company.legalName);
process.exit(0);
