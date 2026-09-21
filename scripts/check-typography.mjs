import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const FORBIDDEN = /\btext-(xl|2xl|3xl|4xl|5xl)\b/;
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
    if (FORBIDDEN.test(line) && !line.includes("lint-allow-type")) {
      console.error(`${f}:${i + 1}: ${line.trim()}`);
      hits++;
    }
  });
}

if (hits) {
  console.error(
    `\n${hits} type-scale hit(s). Use .t-h1 / .t-display / .t-display-num (not text-xl / text-2xl).`
  );
  process.exit(1);
}
console.log("lint:type ok");
