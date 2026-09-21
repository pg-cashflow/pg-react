import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(p);
  }
  return acc;
}

const MAP = [
  [/hover:bg-slate-800\/30/g, "hover:bg-accent-tint"],
  [/hover:bg-slate-800/g, "hover:bg-accent-tint"],
  [/bg-slate-950/g, "bg-bg"],
  [/bg-slate-900\/80/g, "bg-surface/80"],
  [/bg-slate-900/g, "bg-surface"],
  [/bg-slate-800\/50/g, "bg-bg"],
  [/bg-slate-800\/60/g, "bg-bg"],
  [/bg-slate-800/g, "bg-surface"],
  [/bg-slate-700/g, "bg-surface"],
  [/border-slate-800\/80/g, "border-hairline"],
  [/border-slate-800/g, "border-hairline"],
  [/border-slate-700/g, "border-hairline"],
  [/divide-slate-800\/80/g, "divide-hairline"],
  [/divide-slate-800\/60/g, "divide-hairline"],
  [/divide-slate-800/g, "divide-hairline"],
  [/hover:text-slate-200/g, "hover:text-ink"],
  [/text-slate-100/g, "text-ink"],
  [/text-slate-200/g, "text-ink"],
  [/text-slate-300/g, "text-ink"],
  [/text-slate-400/g, "text-ink-muted"],
  [/text-slate-500/g, "text-ink-muted"],
  [/placeholder-slate-500/g, "placeholder:text-ink-muted"],
  [/placeholder:text-slate-500/g, "placeholder:text-ink-muted"],
  [/bg-amber-500\/10/g, "bg-accent-tint"],
  [/text-amber-400/g, "text-accent"],
  [/text-amber-500/g, "text-accent"],
  [/bg-amber-500/g, "bg-accent"],
  [/border-amber-500/g, "border-accent"],
  [/text-primary/g, "text-accent"],
  [/bg-primary\/10/g, "bg-accent-tint"],
  [/bg-primary/g, "bg-accent"],
  [/ring-primary\/50/g, "ring-accent/50"],
  [/ring-primary/g, "ring-accent"],
  [/border-primary/g, "border-accent"],
  [/bg-rose-500\/10/g, "bg-danger-tint"],
  [/border-rose-500\/20/g, "border-danger/20"],
  [/text-rose-400/g, "text-danger"],
  [/text-rose-500/g, "text-danger"],
  [/bg-emerald-500\/10/g, "bg-success-tint"],
  [/text-emerald-400/g, "text-success"],
  [/text-emerald-500/g, "text-success"],
  [/hover:bg-primary\/90/g, "hover:bg-accent/90"],
  [/shadow-primary\/20/g, "shadow-accent/20"],
  [/border-slate-700\/60/g, "border-hairline"],
  [/border-slate-600/g, "border-hairline"],
  [/bg-rose-500\/20/g, "bg-danger-tint"],
  [/text-rose-300/g, "text-danger"],
  [/border-emerald-500\/20/g, "border-success/20"],
  [/text-emerald-400/g, "text-success"],
  [/border-amber-400/g, "border-accent"],
  [/from-slate-\d+/g, "from-bg"],
  [/to-slate-\d+/g, "to-surface"],
  [/via-slate-\d+/g, "via-surface"],
  [/text-slate-950/g, "text-white"],
  [/text-amber-300/g, "text-accent"],
  [/text-amber-200/g, "text-accent"],
  [/ring-amber-500\/50/g, "ring-accent/50"],
  [/hover:bg-amber-400/g, "hover:bg-accent"],
  [/shadow-amber-500\/20/g, "shadow-accent/20"],
  [/hover:bg-slate-600/g, "hover:bg-accent-tint"],
  [/bg-emerald-500/g, "bg-success"],
  [/bg-rose-500/g, "bg-danger"],
  [/fill-amber-500/g, "fill-accent"],
  [/bg-amber-400\/10/g, "bg-accent-tint"],
  [/from-indigo-950\/60/g, "from-accent-tint"],
  [/border-indigo-500\/20/g, "border-accent/20"],
  [/border-indigo-500\/30/g, "border-accent/30"],
  [/bg-indigo-500\/10/g, "bg-accent-tint"],
  [/text-indigo-300/g, "text-accent"],
  [/text-indigo-400/g, "text-accent"],
];

let changed = 0;
for (const f of walk(ROOT)) {
  let s = readFileSync(f, "utf8");
  const orig = s;
  for (const [re, to] of MAP) s = s.replace(re, to);
  if (s !== orig) {
    writeFileSync(f, s);
    changed++;
  }
}
console.log(`restyled ${changed} files`);
