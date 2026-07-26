// fix-escapes.mjs - collapse DOUBLE-escaped unicode that reaches the user as literal text.
//
// Run: node tools/fix-escapes.mjs [--check]
//
// In a JS string, '’' is a right single quote. '\\u2019' is a BACKSLASH followed by the letters u2019, which is
// what the reader actually sees: "don’t wait to be led". It is invisible in review because both forms look almost
// identical in source, and it survives every syntax check - the string is perfectly valid, it just says the wrong thing.
//
// --check exits 1 if any remain, so this can gate a build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["nation.js", "solo-app-html.txt", "presets.js", "vitals.js", "chloe-adapter.mjs"];
const DOUBLE = /\\\\u([0-9a-fA-F]{4})/g;      // a literal backslash, then \uXXXX
const checkOnly = process.argv.includes("--check");

let total = 0;
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, "utf8");
  const hits = (src.match(DOUBLE) || []).length;
  if (!hits) { console.log("  ok  " + f.padEnd(22) + "clean"); continue; }
  total += hits;
  if (checkOnly) { console.log("  !!  " + f.padEnd(22) + hits + " double-escape(s) reach the user as literal text"); continue; }
  fs.writeFileSync(p, src.replace(DOUBLE, "\\u$1"));
  console.log("  fixed " + f.padEnd(20) + hits + " double-escape(s)");
}
console.log(total ? "\n" + total + " occurrence(s)" + (checkOnly ? " still present" : " fixed") : "\nnothing to fix");
if (checkOnly && total) process.exit(1);
