import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = join(process.cwd(), "src");
const MESSAGES_DIR = join(ROOT, "i18n", "messages");
const LOCALES = ["en-IN", "te-IN", "ta-IN", "kn-IN"];

let hits = 0;

// 1. Check Key Parity across all 4 locales
function extractKeys(filePath) {
  if (!existsSync(filePath)) {
    console.error(`[ERROR] Message file not found: ${filePath}`);
    process.exit(1);
  }
  const content = readFileSync(filePath, "utf8");
  const keys = new Set();
  const regex = /"([a-zA-Z0-9_.-]+)":/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

const baseKeys = extractKeys(join(MESSAGES_DIR, "en-IN.ts"));
console.log(`[i18n] Base locale en-IN has ${baseKeys.size} keys.`);

for (const loc of LOCALES.slice(1)) {
  const locKeys = extractKeys(join(MESSAGES_DIR, `${loc}.ts`));
  const missing = [];
  const extra = [];

  for (const k of baseKeys) {
    if (!locKeys.has(k)) missing.push(k);
  }
  for (const k of locKeys) {
    if (!baseKeys.has(k)) extra.push(k);
  }

  if (missing.length > 0 || extra.length > 0) {
    console.error(`[i18n DRIFT] ${loc} key mismatch:`);
    if (missing.length > 0) {
      console.error(`  Missing ${missing.length} keys: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
    }
    if (extra.length > 0) {
      console.error(`  Extra ${extra.length} keys: ${extra.slice(0, 10).join(", ")}${extra.length > 10 ? "..." : ""}`);
    }
    hits++;
  } else {
    console.log(`[i18n] ${loc} has 100% key parity with en-IN (${locKeys.size} keys).`);
  }
}

// 2. Check for Hardcoded JSX Text Strings in Routes and Components
const SKIP_FILES = new Set(["landing.tsx"]);
const SKIP_DIRS = new Set(["ui", "assets"]);

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, acc);
    } else if (/\.(tsx|jsx)$/.test(name) && !name.includes(".test.") && !name.includes(".spec.")) {
      if (!SKIP_FILES.has(name)) {
        acc.push(p);
      }
    }
  }
  return acc;
}

const files = walk(join(ROOT, "routes")).concat(walk(join(ROOT, "components")));

// Regex for JSX literal text between tags: >Text<
const JSX_TEXT_REGEX = />([^<>{}\r\n]+)</g;

for (const f of files) {
  const content = readFileSync(f, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, i) => {
    if (line.includes("lint-allow-i18n") || line.includes("//") || line.trim().startsWith("/*")) {
      return;
    }

    let match;
    while ((match = JSX_TEXT_REGEX.exec(line)) !== null) {
      const text = match[1].trim();
      // Filter out pure whitespace, numbers, symbols, and currency signs
      if (/^[0-9\s₹$%#&+\-*/=.,:;!?()[\]|•↵✓×—–_\\]+$/.test(text)) {
        continue;
      }
      // Check if text has at least one Latin word of 2+ chars
      if (/[A-Za-z]{2,}/.test(text)) {
        // Exclude common HTML entity / code strings
        if (/^(div|span|button|svg|path|class|className|id|src|href)$/i.test(text)) continue;
        console.warn(`[i18n LITERAL] ${f}:${i + 1} -> "${text}"`);
      }
    }
  });
}

if (hits > 0) {
  console.error(`\n[FAIL] i18n check found ${hits} key mismatch error(s).`);
  process.exit(1);
} else {
  console.log("\n[OK] i18n parity check passed.");
}
