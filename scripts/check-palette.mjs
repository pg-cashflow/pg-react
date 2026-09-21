import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const FORBIDDEN = /\b(slate|amber|zinc|neutral|stone|sky|indigo|cyan)-\d|\btext-primary\b|#[0-9a-fA-F]{3,8}\b/;
const SKIP = new Set(["assets"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(join(ROOT, "routes")).concat(
  walk(join(ROOT, "components")).filter((f) => !f.includes(`${join("components", "ui")}`))
);

let hits = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (
      FORBIDDEN.test(line) &&
      !line.includes("lint-allow-palette") &&
      !/fill=|stroke=|stopColor=/.test(line)
    ) {
      console.error(`${f}:${i + 1}: ${line.trim()}`);
      hits++;
    }
  });
}

if (hits) {
  console.error(`\n${hits} palette drift hit(s). Use semantic tokens (bg-bg, text-ink, border-hairline).`);
  process.exit(1);
}
console.log("lint:palette ok");
