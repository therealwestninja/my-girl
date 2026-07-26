// build-affect.mjs — rebuild my-girl's ChloeAffect bundle from the canonical brain (D:\Claude\brain, now a sibling).
// Run: node build-affect.mjs   → lib/chloe-affect.bundle.js (global RookChloeAffect; sets window.ChloeAffect).
// After building, paste the bundle over the "MIGRATED: ChloeAffect now runs on the new brain" block in
// solo-app-html.txt (the app inlines it as a classic global, not a <script src>).
import { execFileSync } from "node:child_process";

execFileSync("npx", [
  "--no-install", "esbuild", "chloe-affect.mjs",
  "--bundle", "--format=iife", "--global-name=RookChloeAffect",
  "--outfile=lib/chloe-affect.bundle.js", "--platform=browser", "--target=es2020", "--legal-comments=none",
], { stdio: "inherit", shell: true });
console.log("built lib/chloe-affect.bundle.js (RookChloeAffect → window.ChloeAffect)");
