// chloe-affect.mjs — re-backs my-girl's ChloeAffect (the felt-affect / voice-colouring core) onto the NEW brain
// (D:\Claude\brain), unifying with book-maker's story-brain. The LEGACY ChloeAffect read a turn through a regex
// cue-lexicon → an 8-state vector → valence/arousal → a voice directive. This keeps the SAME interface the app calls
// (window.ChloeAffect: STATES / BASE / toneHint / feltDirective / read / createReader; a reader with read/observe/
// snapshot → {valence, arousal, vector, dominant}), but the felt state now comes from the new brain's real CHEMISTRY
// (an organism's mood readout), driven exactly the way story-brain drives a beat. Bundled to a classic global via
// esbuild; the app's glue calls it unchanged. The 8-state vector is a faithful PROJECTION of (valence×arousal) so
// toneHint + persistence keep working.
import { extractFeatures } from "../brain/src/features.js";
import { clamp } from "../brain/src/math.js";

const STATES = ["warm", "bright", "calm", "sad", "hurt", "angry", "afraid", "longing"];
const BASE = { warm: 0.30, bright: 0.10, calm: 0.34, sad: 0.06, hurt: 0.05, angry: 0.04, afraid: 0.05, longing: 0.06 };

// Project the new brain's (valence, arousal) back onto the legacy 8-state vector + dominant — the quadrant of affect
// space maps to the named states the voice-colouring expects (warm/bright vs sad/hurt vs angry/afraid vs longing).
function toVector(valence, arousal) {
  const v = { warm: 0.30, bright: 0.10, calm: 0.34, sad: 0.06, hurt: 0.05, angry: 0.04, afraid: 0.05, longing: 0.06 };
  if (valence > 0.2) { if (arousal > 0.55) v.bright = clamp(0.45 + 0.5 * valence, 0, 1); else v.warm = clamp(0.45 + 0.5 * valence, 0, 1); }
  else if (valence < -0.2) { if (arousal > 0.6) { v.angry = clamp(0.30 - 0.35 * valence, 0, 1); v.afraid = clamp(0.22 - 0.28 * valence, 0, 1); } else { v.sad = clamp(0.32 - 0.40 * valence, 0, 1); v.hurt = clamp(0.18 - 0.25 * valence, 0, 1); } }
  else if (arousal > 0.6) v.longing = 0.35;
  return v;
}
function dominantOf(vec) { let d = "calm", m = -Infinity; for (const k in vec) if (vec[k] > m) { m = vec[k]; d = k; } return d; }

const TONE = { sad: "a soft, gentle heaviness", hurt: "a guarded, slightly wounded edge", angry: "a cooler, sharper edge held in check", afraid: "an unsettled, careful wariness", longing: "a yearning, drawn-toward warmth", bright: "a light, buoyant brightness" };
function toneHint(snap) { if (!snap || !snap.vector) return null; const v = snap.vector, dom = snap.dominant; if (TONE[dom] && (v[dom] || 0) >= 0.28) return TONE[dom]; if ((v.warm || 0) >= 0.45) return "an unusual tenderness"; return null; }
// Colour the VOICE, never narrate the feeling — the moodClause pattern, kept verbatim from the legacy so the model side is unchanged.
function feltDirective(snap) { const t = toneHint(snap); if (!t) return ""; return "Let the emotional tenor of the moment color your voice right now — " + t + " — but do not name it, announce it, or explain it. It shapes HOW you speak, never becomes WHAT you say."; }

// A reader whose felt state is read from TEXT by the new brain's `extractFeatures` (its sentiment/affect faculty),
// then smoothed the way the legacy reader was — pulled toward the new read (alpha) while relaxing back toward baseline
// (relax), so emotions build and fade over turns (she recovers, never spirals) rather than snapping per line.
const AROUSAL_REST = 0.42;
function createReader(opts) {
  opts = opts || {};
  const alpha = (opts.alpha == null) ? 0.30 : Number(opts.alpha);      // how hard each turn pulls toward the fresh read
  const relax = (opts.revert == null) ? 0.12 : Number(opts.revert);    // how fast it drifts back to baseline
  let val = (opts.initial && opts.initial.valence != null) ? Number(opts.initial.valence) : 0;
  let aro = (opts.initial && opts.initial.arousal != null) ? Number(opts.initial.arousal) : AROUSAL_REST;
  let last = null; last = snapshot();

  function ingest(text) {
    let f = {};
    try { f = extractFeatures(String(text || "")) || {}; } catch (e) {}
    val = val * (1 - relax);                                            // relax valence toward 0 (neutral) …
    aro = aro + (AROUSAL_REST - aro) * relax;                           // … arousal toward its resting level …
    val = val * (1 - alpha) + (f.valence != null ? Number(f.valence) : 0) * alpha;   // … then pull toward the read
    aro = aro * (1 - alpha) + (f.arousal != null ? Number(f.arousal) : AROUSAL_REST) * alpha;
    return snapshot();
  }
  function snapshot() {
    const v = +clamp(val, -1, 1).toFixed(2), a = +clamp(aro, 0, 1).toFixed(2);
    const vector = toVector(v, a), dominant = dominantOf(vector);
    last = { valence: v, arousal: a, vector, dominant, emotion: dominant };
    return last;
  }
  return {
    read: ingest, observe: ingest, snapshot,
    reset() { val = 0; aro = AROUSAL_REST; last = snapshot(); },
    isPinned() { return false; },
    set(s) { if (s && s.valence != null) { val = Number(s.valence); if (s.arousal != null) aro = Number(s.arousal); last = snapshot(); } },
    now: opts.now,
  };
}

const api = { STATES, BASE, toneHint, feltDirective, createReader, read(t) { return createReader({}).read(t); } };
try { if (typeof window !== "undefined") window.ChloeAffect = api; } catch (e) {}
export default api;
export { STATES, BASE, toneHint, feltDirective, createReader };
