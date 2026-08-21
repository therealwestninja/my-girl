// build-mind.mjs — rebuild the WIDENED brain adapter (theoryOfMind + innerVoice + metacognition + epistemicAffect)
// from the canonical brain (sibling ../brain). Run: node build-mind.mjs → lib/chloe-mind.bundle.js
// (global RookChloeMind; sets window.ChloeMind). Mirrors build-adapter.mjs / build-affect.mjs.
import { execFileSync } from "node:child_process";
execFileSync("npx", [
  "--no-install", "esbuild", "chloe-mind.mjs",
  "--bundle", "--format=iife", "--global-name=RookChloeMind",
  "--outfile=lib/chloe-mind.bundle.js", "--platform=browser", "--target=es2020", "--legal-comments=none",
], { stdio: "inherit", shell: true });
console.log("built lib/chloe-mind.bundle.js (RookChloeMind → window.ChloeMind)");
