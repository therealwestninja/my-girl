// check-inline.mjs - does the GENERATOR still carry the same code as the source files?
//
// Run: node tools/check-inline.mjs
//
// solo-app-html.txt is a single self-contained page: every module is INLINED into it rather than loaded, because a
// Perchance generator has no file server to fetch from. That makes the repo files and the generator two copies of the
// same code, with nothing structurally keeping them in step - the same drift hazard that had already bitten the Rook
// trees (a fix landing on one side and never reaching the other, both looking fine in isolation).
//
// ONE DIFFERENCE IS EXPECTED AND CORRECT: the generator is ASCII-only. Em-dashes, curly quotes and friends are folded
// to plain ASCII on the way in, so comparing bytes would report every prose line as drift and the check would be
// abandoned within a week. This compares SEMANTICALLY - after folding both sides to ASCII - so what remains is real.
//
// Exit code is 1 on real drift, so this can gate a build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const GEN = path.join(ROOT, "solo-app-html.txt");

// Fold to the same ASCII the generator uses, so only MEANING is compared. Also collapses whitespace: the inliner is
// free to re-indent, and indentation is not logic.
const fold = (s) => String(s)
  .replace(/\\u[0-9a-fA-F]{4}/g, "-")     // an escaped em-dash in source
  .replace(/[‐-―]/g, "-")       // dashes
  .replace(/[‘’]/g, "'")        // curly single quotes
  .replace(/[“”]/g, '"')        // curly double quotes
  .replace(/[…]/g, "...")
  .replace(/[^\x20-\x7e]/g, "?")          // anything else non-ASCII
  .replace(/\\-/g, "-")                   // the inliner emits an escaped hyphen for a folded dash
  .replace(/\s+/g, " ")
  .trim();

// Each entry: the source file, and a distinctive line that marks where its inlined copy begins.
const MODULES = [
  { file: "nation.js", marker: "chloe-nation - the Seven Nations" },
  { file: "vitals.js", marker: "chloe-vitals - can this mind tell when it is quietly dying?" },
  // the deliberation adapter (built from ../brain by build-adapter.mjs); a rebuild that is not re-inlined shows here.
  { file: "lib/chloe-adapter.bundle.js", marker: "var RookChloeBrain" },
];

if (!fs.existsSync(GEN)) { console.error("missing " + GEN); process.exit(1); }
const gen = fs.readFileSync(GEN, "utf8").split(/\r?\n/);

let drifted = 0, missing = 0, checked = 0;
for (const m of MODULES) {
  const p = path.join(ROOT, m.file);
  if (!fs.existsSync(p)) { console.log("  ??  " + m.file.padEnd(22) + "source file not found"); missing++; continue; }
  // Drop trailing blank lines: a file that ends with a newline would otherwise compare its phantom last line against
  // whatever the generator has next, and report drift that is purely an artefact of the comparison.
  const src = fs.readFileSync(p, "utf8").split(/\r?\n/);
  while (src.length && src[src.length - 1].trim() === "") src.pop();
  const at = gen.findIndex((l) => l.includes(m.marker));
  if (at < 0) { console.log("  !!  " + m.file.padEnd(22) + "NOT INLINED in the generator"); missing++; continue; }

  const diffs = [];
  for (let i = 0; i < src.length; i++) {
    const a = fold(src[i] || ""), b = fold(gen[at + i] || "");
    if (a !== b) diffs.push({ line: i + 1, a: (src[i] || "").trim().slice(0, 88), b: (gen[at + i] || "").trim().slice(0, 88) });
  }
  checked++;
  if (!diffs.length) { console.log("  ok  " + m.file.padEnd(22) + src.length + " lines, in sync (inlined at " + (at + 1) + ")"); continue; }
  drifted++;
  console.log("  DRIFT " + m.file.padEnd(20) + diffs.length + " line(s) differ (inlined at " + (at + 1) + ")");
  for (const d of diffs.slice(0, 5)) console.log("     L" + d.line + "\n       file: " + d.a + "\n       gen : " + d.b);
  if (diffs.length > 5) console.log("     ... and " + (diffs.length - 5) + " more");
}

console.log("\n" + checked + " module(s) in sync, " + drifted + " drifted, " + missing + " missing");
if (drifted || missing) {
  console.log("Re-inline the source into solo-app-html.txt (ASCII-folded), or fix the source if the generator is right.");
  process.exit(1);
}
