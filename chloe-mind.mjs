/* chloe-mind.mjs — WIDENS the Chloe/MemHero adapter beyond council deliberation.
 *
 * The existing adapters wire only `resolve` (who-speaks) + affect features. This composes four more brain faculties —
 * all dependency-light (math.js / text.js only, no Node) so they bundle clean for Perchance — into ONE per-turn read:
 *   • theoryOfMind    — a live, inferred model of the USER (how they feel, their stance toward her, what they need)
 *   • innerVoice      — the third voice: an occasional, gated inner-monologue ASIDE (the overflow of a thinking mind)
 *   • metacognition   — her epistemic self-model (grounded? certain? confused? should she hedge?)
 *   • epistemicAffect — feelings-about-knowing (curious / uncertain / confused / aha) that make honest inquiry feel
 *
 * Build: node build-mind.mjs  → lib/chloe-mind.bundle.js (global RookChloeMind; sets window.ChloeMind).
 * EVERYTHING is optional + degrades: a turn carrying only `message` still yields a ToM read; absent innerVoice
 * `material` simply keeps the third voice quiet (it's gated to be occasional anyway). Never throws into the app.
 */
import { makeTheoryOfMind } from "../brain/src/theoryOfMind.js";
import { makeInnerVoice } from "../brain/src/innerVoice.js";
import { makeMetacognition } from "../brain/src/metacognition.js";
import { makeEpistemicAffect } from "../brain/src/epistemicAffect.js";

export function makeChloeMind(opts = {}) {
  const tom = makeTheoryOfMind(opts.tom || {});
  const inner = makeInnerVoice(opts.inner || {});
  const meta = makeMetacognition(opts.meta || {});
  const epi = makeEpistemicAffect(opts.epistemic || {});

  // observe(turn) — call once per USER turn. All fields optional. turn:
  //   message   — the user's text (ToM reads word-count/engagement + drives the inner-voice clock)
  //   intent    — coarse intent string ('question'|'task'|'greet'|… ) if the app classified it, else 'respond'
  //   features  — { valence, arousal, reward, threat } from RookChloeAffect.extractFeatures (ToM's main input)
  //   mood      — { arousal } her own mood (inner-voice salience); falls back to the ToM arousal read
  //   chems     — a neuromodulation instance to burst (optional); epistemicAffect colours her real chemistry if given
  //   signals   — { factHit, relevance, confidence, surprise, gap, contradiction, resolved } from the turn, if known
  //   material  — inner-voice seeds { remind, echo, ponder, dream, wonder, scenario } surfaced by the app, if any
  //   now       — ms clock (defaults Date.now)
  // → { tom, meta, epistemic, inner } — a compact, app-usable read (see each faculty for shapes).
  function observe(turn = {}) {
    const { message = "", intent = "respond", features = {}, mood = null, chems = null, signals = {}, material = {}, now = Date.now() } = turn || {};

    let tom_ = null, block = "", propose = null;
    try { tom_ = tom.read({ features, intent, message }); block = tom.block(); propose = tom.propose(); } catch (e) { /* keep the read null */ }

    let meta_ = null;
    try {
      const a = meta.assess({ intent, factHit: signals.factHit, relevance: signals.relevance, confidence: signals.confidence, surprise: signals.surprise });
      meta_ = Object.assign({}, a, meta.observe(a));
    } catch (e) { /* skip */ }

    let epi_ = null;
    try { epi_ = epi.appraise(chems, { confidence: signals.confidence, gap: signals.gap, contradiction: signals.contradiction, surprise: signals.surprise, resolved: signals.resolved }); } catch (e) { /* skip */ }

    let inner_ = null;
    try {
      const mat = Object.assign({}, material, { mood: mood || (tom_ ? { arousal: tom_.arousal } : null), now });
      const dec = inner.consider(mat);
      if (dec && dec.surface) { const text = inner.render(dec); inner.noteSurfaced(now, dec.seed); inner_ = { type: dec.type, text, frame: dec.frame, seed: dec.seed, pull: dec.pull }; }
    } catch (e) { /* stay quiet */ }

    return { tom: tom_ ? Object.assign({}, tom_, { block, propose }) : null, meta: meta_, epistemic: epi_, inner: inner_ };
  }

  return {
    observe,
    tom, inner, meta, epistemic: epi,                 // raw faculties for advanced callers
    serialize: () => { try { return { tom: tom.serialize(), inner: inner.snapshot() }; } catch (e) { return null; } },
    restore: (s) => { if (!s) return; try { tom.restore(s.tom); } catch (e) {} try { inner.restore(s.inner); } catch (e) {} },
  };
}

// Singleton api (mirrors chloe-adapter.mjs): one persistent mind — ToM + innerVoice carry state across turns. `make`
// is exposed so a multi-character caller (e.g. memory-hero) can spin a per-character mind instead of the shared one.
const mind = makeChloeMind();
const api = {
  observe: (turn) => { try { return mind.observe(turn); } catch (e) { return { tom: null, meta: null, epistemic: null, inner: null }; } },
  tomBlock: () => { try { return mind.tom.block(); } catch (e) { return ""; } },
  tomPropose: () => { try { return mind.tom.propose(); } catch (e) { return null; } },
  serialize: () => mind.serialize(),
  restore: (s) => mind.restore(s),
  make: makeChloeMind,
  _mind: mind,
};

if (typeof window !== "undefined") { window.ChloeMind = api; }

export default api;
