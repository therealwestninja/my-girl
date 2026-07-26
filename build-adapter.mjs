// build-adapter.mjs — rebuild the deliberation adapter from the canonical brain (sibling ../brain).
// Run: node build-adapter.mjs   → lib/chloe-adapter.bundle.js (global RookChloeBrain; sets window.ChloeBrain).
// Mirrors build-affect.mjs. Paste the bundle over the brain.min.js block in solo-app-html.txt, or let
// tools/check-inline.mjs tell you it drifted.
import { execFileSync } from "node:child_process";
execFileSync("npx", [
  "--no-install", "esbuild", "chloe-adapter.mjs",
  "--bundle", "--format=iife", "--global-name=RookChloeBrain",
  "--outfile=lib/chloe-adapter.bundle.js", "--platform=browser", "--target=es2020", "--legal-comments=none",
], { stdio: "inherit", shell: true });
console.log("built lib/chloe-adapter.bundle.js (RookChloeBrain → window.ChloeBrain)");
