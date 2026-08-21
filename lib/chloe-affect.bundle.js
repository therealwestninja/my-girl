var RookChloeAffect = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // chloe-affect.mjs
  var chloe_affect_exports = {};
  __export(chloe_affect_exports, {
    BASE: () => BASE,
    STATES: () => STATES,
    createReader: () => createReader,
    default: () => chloe_affect_default,
    feltDirective: () => feltDirective,
    toneHint: () => toneHint
  });

  // D:/Claude/brain/src/text.js
  var tokenize = (s) => String(s).toLowerCase().match(/[a-z']+/g) || [];
  var QUESTION_OPENERS = ["who", "what", "when", "where", "why", "how", "is", "are", "do", "does", "can", "could", "would", "will"];

  // D:/Claude/brain/src/math.js
  var clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

  // D:/Claude/brain/src/features.js
  var POSITIVE = /* @__PURE__ */ new Set([
    "thanks",
    "thank",
    "love",
    "great",
    "good",
    "yes",
    "awesome",
    "nice",
    "happy",
    "cool",
    "please",
    "appreciate",
    "perfect",
    "excellent",
    "brilliant",
    "amazing",
    "wonderful",
    "helpful",
    "clear",
    "fixed",
    "works",
    "working",
    "solved",
    "right",
    "correct",
    "beautiful",
    "fantastic",
    "glad",
    "enjoy",
    "like",
    "best",
    "better",
    // warmth + esteem + relief (companion register) — so affection and reassurance register, not just task praise
    "proud",
    "grateful",
    "adore",
    "trust",
    "safe",
    "comfort",
    "comforting",
    "reassuring",
    "kind",
    "sweet",
    "gentle",
    "care",
    "caring",
    "understanding",
    "patient",
    "thoughtful",
    "impressed",
    "delighted",
    "relieved",
    "hopeful",
    "excited",
    "fun",
    "funny",
    "smart",
    "clever",
    "wise"
  ]);
  var NEGATIVE = /* @__PURE__ */ new Set([
    "no",
    "stop",
    "hate",
    "bad",
    "angry",
    "terrible",
    "awful",
    "wrong",
    "annoying",
    "stupid",
    "idiot",
    "broken",
    "bug",
    "buggy",
    "error",
    "fail",
    "failed",
    "crash",
    "crashed",
    "slow",
    "confusing",
    "useless",
    "dislike",
    "frustrated",
    "frustrating",
    "disappointing",
    "disappointed",
    "worse",
    "worst",
    "hurts",
    "painful",
    "sucks",
    "garbage",
    "nonsense",
    // dismissiveness + hurt + coldness currently read as neutral — the biggest expressiveness gap
    "whatever",
    "harsh",
    "rude",
    "mean",
    "unfair",
    "ignore",
    "ignored",
    "ignoring",
    "meh",
    "ugh",
    "pointless",
    "worthless",
    "sloppy",
    "unacceptable",
    "ridiculous",
    "pathetic",
    "disgusting",
    "upset",
    "lonely",
    "sad",
    "hopeless",
    "worried",
    "scared",
    "afraid",
    "anxious",
    "nervous",
    "uncomfortable",
    "exhausted",
    "quit",
    "unhappy",
    "miserable",
    "letdown"
  ]);
  var REWARD_CUES = /* @__PURE__ */ new Set(["thanks", "thank", "love", "great", "awesome", "yes", "appreciate", "perfect", "nice", "excellent", "brilliant", "amazing", "wonderful", "helpful", "works", "solved", "fixed", "glad", "proud", "grateful", "adore", "delighted", "relieved", "trust"]);
  var STRONG_REWARD = /* @__PURE__ */ new Set(["love", "adore", "grateful", "appreciate", "amazing", "wonderful", "brilliant"]);
  var THREAT_CUES = /* @__PURE__ */ new Set(["stop", "no", "hate", "angry", "stupid", "idiot", "now", "hurry", "emergency", "help", "danger", "careful", "warning", "urgent", "mad", "furious", "wrong", "scared", "afraid", "panic", "crisis", "attack", "fight", "threat", "quit", "leave", "unacceptable"]);
  var DISGUST_CUES = /* @__PURE__ */ new Set(["gross", "disgusting", "disgust", "disgusted", "vile", "revolting", "revulsion", "nasty", "creepy", "filthy", "repulsive", "repulsed", "sickening", "yuck", "ew", "eww", "rotten", "foul", "putrid", "obscene", "depraved", "gruesome", "slimy", "vomit", "puke", "contaminated", "grotesque"]);
  var DESIRE_CUES = /* @__PURE__ */ new Set(["want", "wants", "wanting", "need", "needs", "crave", "craving", "desire", "desires", "yearn", "yearning", "ache", "aching", "long", "longing", "yours", "mine", "closer", "close", "touch", "kiss", "hold", "embrace", "hunger", "hungry", "tempt", "tempting", "tempted", "irresistible", "attracted", "attraction", "wish", "devour", "pull", "magnetic"]);
  var CHALLENGE_CUES = /* @__PURE__ */ new Set(["dare", "dares", "daring", "defy", "defiant", "defiance", "prove", "challenge", "challenged", "challenging", "bet", "provoke", "provoking", "provocative", "try", "impress", "chicken", "coward", "gutless", "spineless", "weak", "makeme", "outmatch", "beat", "match"]);
  var PLAYFUL_BID_CUES = /* @__PURE__ */ new Set(["wink", "tease", "teasing", "teased", "flirt", "flirty", "flirting", "playful", "banter", "cheeky", "sassy", "smirk", "smirking", "giggle", "giggling", "hehe", "haha", "lol", "teehee", "kidding", "joking", "joke", "silly", "gotcha", "tsk", "naughty", "mischief", "mischievous"]);
  var NEGATORS = /* @__PURE__ */ new Set([
    "not",
    "no",
    "never",
    "isn't",
    "wasn't",
    "don't",
    "doesn't",
    "didn't",
    "won't",
    "can't",
    "cannot",
    "aren't",
    "ain't",
    "hardly",
    "barely",
    "without",
    // apostrophe-less variants (casual typing) — tokenize keeps apostrophes, so these would otherwise miss
    "isnt",
    "wasnt",
    "dont",
    "doesnt",
    "didnt",
    "wont",
    "cant",
    "arent",
    "aint",
    "couldnt",
    "shouldnt",
    "wouldnt",
    "havent",
    "hasnt"
  ]);
  function countCues(tokens, cues) {
    let plain = 0, negated = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (!cues.has(tokens[i])) continue;
      if (i > 0 && NEGATORS.has(tokens[i - 1]) || i > 1 && NEGATORS.has(tokens[i - 2])) negated++;
      else plain++;
    }
    return { plain, negated };
  }
  function extractFeatures(message, context = {}) {
    const recent = context.recent || [];
    const raw = String(message);
    const lower = raw.toLowerCase();
    const tokens = tokenize(lower);
    const ntok = Math.max(1, tokens.length);
    const set = new Set(tokens);
    const lex = context.lexicon || null;
    const aug = (base, extra) => extra && extra.length ? /* @__PURE__ */ new Set([...base, ...extra]) : base;
    const POS = aug(POSITIVE, lex && lex.positive), NEG = aug(NEGATIVE, lex && lex.negative);
    const REW = aug(REWARD_CUES, lex && lex.reward), THR = aug(THREAT_CUES, lex && lex.threat), DIS = aug(DISGUST_CUES, lex && lex.disgust);
    const DES = aug(DESIRE_CUES, lex && lex.desire), CHA = aug(CHALLENGE_CUES, lex && lex.challenge), PLB = aug(PLAYFUL_BID_CUES, lex && lex.playfulBid);
    const p = countCues(tokens, POS), n = countCues(tokens, NEG);
    const posScore = p.plain + n.negated;
    const negScore = n.plain + p.negated;
    const valence = clamp((posScore - negScore) / Math.sqrt(ntok), -1, 1);
    const caps = (raw.match(/[A-Z]/g) || []).length / Math.max(1, raw.length);
    const bangs = (raw.match(/!/g) || []).length;
    const arousal = clamp(0.3 + caps + 0.15 * bangs + 0.2 * Math.min(1, ntok / 40), 0, 1);
    const isQuestion = lower.trim().endsWith("?") || QUESTION_OPENERS.includes(tokens[0]) ? 1 : 0;
    const rw = countCues(tokens, REW), th = countCues(tokens, THR);
    const strong = countCues(tokens, aug(STRONG_REWARD, lex && lex.rewardStrong));
    const reward = clamp((rw.plain + strong.plain - rw.negated - strong.negated) / 2, 0, 1);
    const threat = clamp((th.plain - th.negated) / 2, 0, 1);
    const displeasure = clamp(Math.max(0, -valence) - threat, 0, 1);
    const dg = countCues(tokens, DIS);
    const disgust = clamp((dg.plain - dg.negated) / 2, 0, 1);
    const ds = countCues(tokens, DES), ch = countCues(tokens, CHA), pb = countCues(tokens, PLB);
    const desire = clamp((ds.plain - ds.negated) / 2, 0, 1);
    const challenge = clamp((ch.plain - ch.negated) / 2, 0, 1);
    const playfulBid = clamp((pb.plain - pb.negated) / 2, 0, 1);
    let maxSim = 0;
    for (const m of recent) {
      const setB = new Set(tokenize(m));
      const inter = [...set].filter((x) => setB.has(x)).length;
      const uni = (/* @__PURE__ */ new Set([...set, ...setB])).size || 1;
      maxSim = Math.max(maxSim, inter / uni);
    }
    const novelty = clamp(1 - maxSim, 0, 1);
    return { valence, arousal, novelty, isQuestion, reward, threat, displeasure, disgust, desire, challenge, playfulBid };
  }

  // chloe-affect.mjs
  var STATES = ["warm", "bright", "calm", "sad", "hurt", "angry", "afraid", "longing"];
  var BASE = { warm: 0.3, bright: 0.1, calm: 0.34, sad: 0.06, hurt: 0.05, angry: 0.04, afraid: 0.05, longing: 0.06 };
  function toVector(valence, arousal) {
    const v = { warm: 0.3, bright: 0.1, calm: 0.34, sad: 0.06, hurt: 0.05, angry: 0.04, afraid: 0.05, longing: 0.06 };
    if (valence > 0.2) {
      if (arousal > 0.55) v.bright = clamp(0.45 + 0.5 * valence, 0, 1);
      else v.warm = clamp(0.45 + 0.5 * valence, 0, 1);
    } else if (valence < -0.2) {
      if (arousal > 0.6) {
        v.angry = clamp(0.3 - 0.35 * valence, 0, 1);
        v.afraid = clamp(0.22 - 0.28 * valence, 0, 1);
      } else {
        v.sad = clamp(0.32 - 0.4 * valence, 0, 1);
        v.hurt = clamp(0.18 - 0.25 * valence, 0, 1);
      }
    } else if (arousal > 0.6) v.longing = 0.35;
    return v;
  }
  function dominantOf(vec) {
    let d = "calm", m = -Infinity;
    for (const k in vec) if (vec[k] > m) {
      m = vec[k];
      d = k;
    }
    return d;
  }
  var TONE = { sad: "a soft, gentle heaviness", hurt: "a guarded, slightly wounded edge", angry: "a cooler, sharper edge held in check", afraid: "an unsettled, careful wariness", longing: "a yearning, drawn-toward warmth", bright: "a light, buoyant brightness" };
  function toneHint(snap) {
    if (!snap || !snap.vector) return null;
    const v = snap.vector, dom = snap.dominant;
    if (TONE[dom] && (v[dom] || 0) >= 0.28) return TONE[dom];
    if ((v.warm || 0) >= 0.45) return "an unusual tenderness";
    return null;
  }
  function feltDirective(snap) {
    const t = toneHint(snap);
    if (!t) return "";
    return "Let the emotional tenor of the moment color your voice right now \u2014 " + t + " \u2014 but do not name it, announce it, or explain it. It shapes HOW you speak, never becomes WHAT you say.";
  }
  var AROUSAL_REST = 0.42;
  function createReader(opts) {
    opts = opts || {};
    const alpha = opts.alpha == null ? 0.3 : Number(opts.alpha);
    const relax = opts.revert == null ? 0.12 : Number(opts.revert);
    let val = opts.initial && opts.initial.valence != null ? Number(opts.initial.valence) : 0;
    let aro = opts.initial && opts.initial.arousal != null ? Number(opts.initial.arousal) : AROUSAL_REST;
    let last = null;
    last = snapshot();
    function ingest(text) {
      let f = {};
      try {
        f = extractFeatures(String(text || "")) || {};
      } catch (e) {
      }
      val = val * (1 - relax);
      aro = aro + (AROUSAL_REST - aro) * relax;
      val = val * (1 - alpha) + (f.valence != null ? Number(f.valence) : 0) * alpha;
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
      read: ingest,
      observe: ingest,
      snapshot,
      reset() {
        val = 0;
        aro = AROUSAL_REST;
        last = snapshot();
      },
      isPinned() {
        return false;
      },
      set(s) {
        if (s && s.valence != null) {
          val = Number(s.valence);
          if (s.arousal != null) aro = Number(s.arousal);
          last = snapshot();
        }
      },
      now: opts.now
    };
  }
  var api = { STATES, BASE, toneHint, feltDirective, createReader, read(t) {
    return createReader({}).read(t);
  } };
  try {
    if (typeof window !== "undefined") window.ChloeAffect = api;
  } catch (e) {
  }
  var chloe_affect_default = api;
  return __toCommonJS(chloe_affect_exports);
})();
