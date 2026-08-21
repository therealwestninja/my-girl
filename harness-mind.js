// harness-mind.js — proves the WIDENED brain adapter (lib/chloe-mind.bundle.js) runs browser-bundled and that all
// four faculties produce sane output through the ChloeMind.observe() façade. Node-only; loads the IIFE bundle in a VM
// context with a fake `window` (exactly what Perchance provides), then exercises real turns.
// Run: node harness-mind.js
const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync(__dirname + "/lib/chloe-mind.bundle.js", "utf8");
const ctx = { window: {}, globalThis: {}, console, Date };
vm.createContext(ctx);
vm.runInContext(code, ctx);
const ChloeMind = ctx.window.ChloeMind;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error("FAIL:", m); } };

ok(ChloeMind && typeof ChloeMind.observe === "function", "bundle exposes window.ChloeMind.observe");

// ── warm the ToM model over a few engaged, friendly turns ───────────────────────────────────────────────────────
let last;
for (let i = 0; i < 5; i++) {
  last = ChloeMind.observe({
    message: "hey, i've been really looking forward to talking with you today, how are you",
    intent: "chitchat",
    features: { valence: 0.5, arousal: 0.5, reward: 0.6, threat: 0 },
    now: 1000 + i * 1000,
  });
}
ok(last.tom && typeof last.tom.stance === "number", "ToM produces a live read of the user");
ok(last.tom.stance > 0, "ToM: warm engaged turns push the user's stance positive");
ok(typeof last.tom.block === "string" && last.tom.block.length > 0, "ToM: after enough evidence, an attunement block is offered");

// ── a venting sequence → need settles to comfort + a caring council proposal ────────────────────────────────────
// ToM's `need` is a SMOOTHED dominant read (a relationship's need shouldn't flip on one line), so distress builds over
// a couple of turns — exactly how real venting reads. We take the read after the person has said a few low things.
let sad;
for (let i = 0; i < 3; i++) {
  sad = ChloeMind.observe({
    message: "honestly i feel terrible today, everything is falling apart",
    intent: "chitchat",
    features: { valence: -0.6, arousal: 0.4, reward: 0.1, threat: 0.3 },
    now: 20000 + i * 1000,
  });
}
ok(sad.tom && (sad.tom.need === "comfort" || sad.tom.need === "venting"), "ToM: acute distress reads as a need for comfort/venting");
ok(sad.tom.propose && sad.tom.propose.action === "RESPOND", "ToM: distress advocates a caring RESPOND candidate for the council");

// ── metacognition: an ungrounded knowledge question → hedge ─────────────────────────────────────────────────────
const q = ChloeMind.observe({
  message: "what's the capital of some country i just made up",
  intent: "question",
  features: { valence: 0, arousal: 0.3 },
  signals: { factHit: false, relevance: 0, confidence: 0.05, surprise: 0.2 },
  now: 30000,
});
ok(q.meta && q.meta.hedge === true, "metacognition: an ungrounded knowledge question flags hedge (own the uncertainty)");
ok(q.meta && typeof q.meta.certainty === "number", "metacognition: emits a calibrated certainty");

// ── epistemicAffect: a felt gap she's drawn to → curious; a contradiction → confused ────────────────────────────
const curious = ChloeMind.observe({ message: "tell me how black holes evaporate", intent: "question", signals: { gap: 1, confidence: 0.6 }, now: 40000 });
ok(curious.epistemic && curious.epistemic.emotion === "curious", "epistemicAffect: a gap she has footing on feels CURIOUS");
const confused = ChloeMind.observe({ message: "but you said the opposite a second ago", intent: "chitchat", signals: { contradiction: 0.8 }, now: 41000 });
ok(confused.epistemic && confused.epistemic.emotion === "confused", "epistemicAffect: a contradiction feels CONFUSED");

// ── innerVoice: a standing goal + long silence surfaces the third voice ─────────────────────────────────────────
const inner = ChloeMind.observe({
  message: "mm",
  intent: "ack",
  features: { valence: 0.2, arousal: 0.5 },
  material: { ponder: { text: "the trip we were planning", priority: 0.8 } },
  now: 45000 + 40 * 60e3,   // well past the inner-voice cooldown, with a long quiet stretch
});
ok(inner.inner && inner.inner.type === "ponder", "innerVoice: a standing goal after a quiet stretch surfaces as an aside");
ok(inner.inner && /trip we were planning/.test(inner.inner.text), "innerVoice: the surfaced aside carries the seed, framed naturally");

// ── serialize round-trips the stateful faculties ────────────────────────────────────────────────────────────────
const snap = ChloeMind.serialize();
ok(snap && snap.tom && snap.inner, "serialize captures ToM + innerVoice state for persistence");

// ── junk-safety: a totally empty turn never throws and yields a well-formed shape ───────────────────────────────
let threw = false, empty;
try { empty = ChloeMind.observe({}); ChloeMind.observe(); ChloeMind.observe(null); } catch (e) { threw = true; }
ok(!threw, "observe never throws on empty/null turns");
ok(empty && "tom" in empty && "meta" in empty && "epistemic" in empty && "inner" in empty, "observe always returns the full {tom,meta,epistemic,inner} shape");

console.log(`\nchloe-mind: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
