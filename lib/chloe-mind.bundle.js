var RookChloeMind = (() => {
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

  // chloe-mind.mjs
  var chloe_mind_exports = {};
  __export(chloe_mind_exports, {
    default: () => chloe_mind_default,
    makeChloeMind: () => makeChloeMind
  });

  // D:/Claude/brain/src/math.js
  var clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  var clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  var num = (x, d = 0) => typeof x === "number" && isFinite(x) ? x : d;
  var ema = (old, target, alpha) => old * (1 - alpha) + target * alpha;

  // D:/Claude/brain/src/theoryOfMind.js
  function inferNeed(intent, valence, stance) {
    if (stance < -0.35) return "conflict";
    if (valence < -0.25) return ["question", "task", "code", "ground"].includes(intent) ? "help" : "comfort";
    if (["question", "task", "code", "ground"].includes(intent)) return "information";
    if (["greet", "ack", "chitchat"].includes(intent)) return "company";
    if (valence > 0.35) return "connection";
    return "presence";
  }
  var NEED_PHRASE = {
    comfort: "comfort and reassurance",
    venting: "to be heard",
    help: "help working through a problem",
    information: "a clear, direct answer",
    company: "light, easy company",
    connection: "to share something good with you",
    conflict: "they seem frustrated with you \u2014 tread carefully and don't get defensive",
    presence: "mostly just your presence"
  };
  var stanceWord = (s) => s > 0.35 ? "warm" : s > 0.12 ? "at ease" : s < -0.35 ? "cold" : s < -0.12 ? "guarded" : "neutral";
  var affectWord = (v, a) => `${v > 0.3 ? "upbeat" : v < -0.3 ? "low" : "even"}${a > 0.6 ? ", keyed-up" : a < 0.3 ? ", subdued" : ""}`;
  function makeTheoryOfMind({ alpha = 0.3, stanceAlpha = 0.25, floor = 3, blockFloor = 0.34, proposeFloor = 0.45, driftBeta = 0.3, driftThreshold = 0.45 } = {}) {
    let valence = 0, arousal = 0.4, stance = 0, engagement = 0.5, acuteV = 0;
    let driftEwma = 0, resyncs = 0;
    const needScores = /* @__PURE__ */ new Map();
    let need = "presence";
    let n = 0;
    let expV = 0, expS = 0, certainty = 0;
    const argmaxNeed = () => {
      let best = "presence", m = -Infinity;
      for (const [k, v] of needScores) if (v > m) {
        m = v;
        best = k;
      }
      return best;
    };
    function read({ features = {}, intent = "", message = "" } = {}) {
      const v = Number(features.valence) || 0;
      const social = clamp((Number(features.reward) || 0) - (Number(features.threat) || 0), -1, 1);
      const words = String(message).trim().split(/\s+/).filter(Boolean).length;
      const turnEng = clamp01(words / 25 + (intent === "question" ? 0.15 : 0));
      const surprise = n === 0 ? 0 : clamp01((Math.abs(v - expV) + Math.abs(social - expS)) / 2);
      valence = ema(valence, v, alpha);
      arousal = ema(arousal, Number(features.arousal) || 0, alpha);
      stance = ema(stance, social, stanceAlpha);
      engagement = ema(engagement, turnEng, alpha);
      acuteV = v;
      const turnNeed = inferNeed(intent, Math.min(valence, acuteV), stance);
      for (const k of needScores.keys()) needScores.set(k, needScores.get(k) * 0.7);
      needScores.set(turnNeed, (needScores.get(turnNeed) || 0) + 1);
      need = argmaxNeed();
      expV += 0.3 * (v - expV);
      expS += 0.3 * (social - expS);
      n += 1;
      certainty = clamp01(n / (n + floor) * (1 - 0.5 * surprise));
      driftEwma = ema(driftEwma, surprise, driftBeta);
      let resynced = false;
      if (driftEwma > driftThreshold && n > floor) {
        expV = v;
        expS = social;
        certainty = clamp01(certainty * 0.4);
        driftEwma = 0;
        resyncs += 1;
        resynced = true;
      }
      return { ...snapshot(), surprise: +surprise.toFixed(2), drift: +driftEwma.toFixed(2), resynced };
    }
    function snapshot() {
      return { valence: +valence.toFixed(2), arousal: +arousal.toFixed(2), stance: +stance.toFixed(2), engagement: +engagement.toFixed(2), need, certainty: +certainty.toFixed(2) };
    }
    return {
      read,
      snapshot,
      getNeed: () => need,
      getStance: () => +stance.toFixed(2),
      // Attunement block for the mouth — a read of the person so the reply meets their state. Silent until the model has
      // enough evidence to be worth trusting (early turns don't inject a low-confidence guess). Framed as inference the
      // model should ATTUNE to, never narrate back at the user.
      block() {
        if (certainty < blockFloor) return "";
        return `Read of the person you're talking with (your inference \u2014 may be wrong): they seem ${affectWord(Math.min(valence, acuteV), arousal)} and ${stanceWord(stance)} toward you, and appear to want ${NEED_PHRASE[need] || "your presence"}. Let this shape HOW you meet them \u2014 attune to it, don't state it back to them.`;
      },
      // Council candidate: when the user reads as needing support (and the model is confident enough), advocate a caring
      // RESPOND — tagged approach+protect so it draws on both engagement and protective chemistry. Returns null otherwise,
      // so a fresh or neutral read adds NO proposal and the council is unchanged (default suite stays green).
      propose() {
        if (certainty < proposeFloor) return null;
        const distress = Math.min(valence, acuteV);
        const care = (need === "comfort" || need === "venting") && distress < -0.15;
        if (!care) return null;
        const conf = clamp(0.4 + 0.3 * certainty + 0.3 * Math.min(1, -distress), 0, 0.75);
        return { by: "tom", action: "RESPOND", conf: +conf.toFixed(3), tags: ["approach", "protect"] };
      },
      serialize() {
        return { valence, arousal, stance, engagement, acuteV, need, n, expV, expS, certainty, driftEwma, resyncs, needScores: Array.from(needScores.entries()) };
      },
      restore(s) {
        if (!s) return;
        valence = s.valence || 0;
        arousal = s.arousal ?? 0.4;
        stance = s.stance || 0;
        engagement = s.engagement ?? 0.5;
        acuteV = s.acuteV || 0;
        need = s.need || "presence";
        n = s.n || 0;
        expV = s.expV || 0;
        expS = s.expS || 0;
        certainty = s.certainty || 0;
        driftEwma = s.driftEwma || 0;
        resyncs = s.resyncs || 0;
        needScores.clear();
        if (Array.isArray(s.needScores)) for (const [k, v] of s.needScores) needScores.set(k, v);
      }
    };
  }

  // D:/Claude/brain/src/text.js
  var norm = (t) => String(t || "").trim().toLowerCase().replace(/\s+/g, " ");

  // D:/Claude/brain/src/innerVoice.js
  var FRAMES = {
    remind: { open: "That reminds me", weight: 1 },
    // a tangential memory that floated up
    ponder: { open: "I was thinking about", weight: 0.92 },
    // a standing goal resurfacing (volition)
    echo: { open: "Like the time", weight: 0.85 },
    // an episodic callback tied to the topic
    dream: { open: "I had a dream about", weight: 0.8 },
    // a consolidation/distiller product
    scenario: { open: "I ran the scenario", weight: 0.92 },
    // an imagination counterfactual
    wonder: { open: "I keep wondering", weight: 0.9 }
    // a grounded open question from respoolSelf — noticed, not yet understood
  };
  function makeInnerVoice({ threshold = 0.52, cooldownMs = 9e4, gain = 1, recentDamp = 0.45, recentN = 4, frames = FRAMES } = {}) {
    let lastAt = null;
    let recent = [];
    function consider(material = {}) {
      const { mood = null, silenceMs = 0, now = null } = material;
      const arousal = mood && typeof mood.arousal === "number" ? mood.arousal : 0.4;
      const c = [];
      if (material.remind && material.remind.text) c.push({ type: "remind", seed: material.remind.text, pull: (0.45 + 0.55 * num(material.remind.sim, 0.6)) * (0.85 + 0.3 * arousal) });
      if (material.ponder && material.ponder.text) c.push({ type: "ponder", seed: material.ponder.text, pull: 0.55 + 0.3 * num(material.ponder.priority, 0.5) + 0.25 * Math.min(1, silenceMs / (30 * 6e4)) });
      if (material.echo && material.echo.text) c.push({ type: "echo", seed: material.echo.text, pull: 0.4 + 0.55 * num(material.echo.sim, 0.6) });
      if (material.dream && material.dream.text) c.push({ type: "dream", seed: material.dream.text, pull: 0.72 * num(material.dream.freshness, 1) });
      if (material.wonder && material.wonder.text) c.push({ type: "wonder", seed: material.wonder.text, pull: 0.5 + 0.4 * num(material.wonder.freshness, 1) });
      if (material.scenario && material.scenario.text) c.push({ type: "scenario", seed: material.scenario.text, pull: 0.6 + 0.3 * arousal, extra: material.scenario });
      if (!c.length) return { surface: false };
      for (const x of c) {
        const said = recent.includes(norm(x.seed));
        x.pull = +(x.pull * frames[x.type].weight * gain * (said ? recentDamp : 1)).toFixed(3);
      }
      c.sort((a, b) => b.pull - a.pull || a.type.localeCompare(b.type));
      const top = c[0];
      const sinceLast = now != null && lastAt != null ? now - lastAt : Infinity;
      const surface = top.pull >= threshold && sinceLast >= cooldownMs;
      return { surface, type: top.type, seed: top.seed, frame: frames[top.type].open, pull: top.pull, extra: top.extra || null, considered: c.map((x) => ({ type: x.type, pull: x.pull })) };
    }
    function noteSurfaced(now, seed = null) {
      if (now != null) lastAt = now;
      if (seed) {
        recent.push(norm(seed));
        if (recent.length > recentN) recent.shift();
      }
    }
    const ACT = { REFLEX_REPLY: "just answer", RESPOND: "respond", ESCALATE: "dig into it", HOLD: "hold back", QUIET: "stay quiet", WAIT: "wait", ACT: "go for it", REACH_OUT: "reach out" };
    function render(dec) {
      if (!dec || !dec.surface) return "";
      if (dec.type === "scenario" && dec.extra && dec.extra.action) {
        const a = ACT[dec.extra.action] || String(dec.extra.action).toLowerCase().replace(/_/g, " ");
        return `${dec.frame} where ${dec.seed} \u2014 I think I'd ${a}.`;
      }
      return `${dec.frame} ${dec.seed}.`;
    }
    return { consider, noteSurfaced, render, lastAt: () => lastAt, snapshot: () => ({ lastAt, recent: recent.slice() }), restore: (s) => {
      if (s) {
        lastAt = s.lastAt ?? null;
        recent = Array.isArray(s.recent) ? s.recent.slice() : [];
      }
    } };
  }

  // D:/Claude/brain/src/metacognition.js
  function makeMetacognition({ groundThreshold = 0.2, certaintyFloor = 0.35, confuseSurprise = 0.6, confuseConfidence = 0.1, ema: ema2 = 0.2 } = {}) {
    let avgCertainty = null, confusion = 0, turns = 0;
    function assess({ intent = "respond", factHit = false, relevance = 0, confidence = 0, surprise = 0 } = {}) {
      const isKnowledgeQ = intent === "question";
      const basis = factHit ? "fact" : relevance >= groundThreshold ? "memory" : isKnowledgeQ ? "none" : "social";
      const known = basis !== "none";
      const groundScore = basis === "fact" ? 1 : basis === "memory" ? clamp(0.5 + relevance) : basis === "social" ? 0.7 : 0.12;
      const decisiveness = clamp(confidence * 2.5);
      const certainty = clamp(0.5 * groundScore + 0.3 * decisiveness + 0.2 * (1 - clamp(surprise)));
      const confused = surprise >= confuseSurprise && confidence < confuseConfidence;
      const hedge = isKnowledgeQ && basis === "none" && certainty < certaintyFloor;
      return { certainty: +certainty.toFixed(2), known, confused, basis, hedge };
    }
    function observe(a) {
      turns += 1;
      avgCertainty = avgCertainty == null ? a.certainty : avgCertainty + (a.certainty - avgCertainty) * ema2;
      confusion += ((a.confused ? 1 : 0) - confusion) * ema2;
      return state();
    }
    function state() {
      return { avgCertainty: avgCertainty == null ? null : +avgCertainty.toFixed(2), confusionRate: +confusion.toFixed(2), turns };
    }
    return { assess, observe, state };
  }

  // D:/Claude/brain/src/epistemicAffect.js
  var clamp012 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
  var EPISTEMIC = {
    curious: { valence: 0.45, arousal: 0.55, chem: { dopamine: 0.55, acetylcholine: 0.25 }, drives: true, say: "I want to dig into that" },
    uncertain: { valence: -0.15, arousal: 0.35, chem: { norepinephrine: 0.2 }, drives: true, say: "I'm not sure \u2014 I'd rather check than guess" },
    doubtful: { valence: -0.2, arousal: 0.3, chem: { norepinephrine: 0.18 }, drives: true, say: "I might have that wrong" },
    confused: { valence: -0.4, arousal: 0.62, chem: { norepinephrine: 0.5, dopamine: -0.2 }, drives: true, say: "something doesn't add up here" },
    troubled: { valence: -0.3, arousal: 0.35, chem: { norepinephrine: 0.3, serotonin: -0.1 }, drives: true, say: "this is nagging at me \u2014 a piece that doesn't fit yet" },
    // a held, unresolved contradiction
    aha: { valence: 0.7, arousal: 0.5, chem: { dopamine: 0.9, serotonin: 0.2 }, drives: false, say: "oh \u2014 that clicks now" },
    // RESOLUTION — the reward
    assured: { valence: 0.3, arousal: 0.2, chem: { serotonin: 0.22 }, drives: false, say: "I've got solid ground here" }
  };
  function makeEpistemicAffect({ now = () => Date.now() } = {}) {
    const openGaps = /* @__PURE__ */ new Map();
    function appraise(chems, state = {}) {
      const conf = clamp012(state.confidence != null ? state.confidence : 0.5);
      const gap = clamp012(typeof state.gap === "boolean" ? state.gap ? 1 : 0 : state.gap);
      const contradiction = clamp012(state.contradiction);
      const surprise = clamp012(state.surprise);
      let emo;
      if (state.resolved) emo = "aha";
      else if (contradiction >= 0.5) emo = "confused";
      else if (contradiction > 0) emo = "troubled";
      else if (surprise >= 0.5) emo = "confused";
      else if (gap >= 0.5 && conf >= 0.5) emo = "curious";
      else if (gap >= 0.5) emo = "uncertain";
      else if (conf < 0.35) emo = "doubtful";
      else emo = "assured";
      const E = EPISTEMIC[emo];
      if (chems && typeof chems.burst === "function") for (const [c, m] of Object.entries(E.chem)) chems.burst(c, m);
      return { emotion: emo, drives: E.drives, say: E.say, affect: { valence: E.valence, arousal: E.arousal } };
    }
    function voice(emotion, { topic = "", canLookup = false } = {}) {
      const t = topic ? ` about ${topic}` : "";
      if ((emotion === "uncertain" || emotion === "doubtful") && canLookup) return `I don't know${t} \u2014 but I can look that up.`;
      if (emotion === "curious") return `I want to dig into${t || " that"}.`;
      if (emotion === "confused") return `Something doesn't add up${t} \u2014 let me work it out.`;
      if (emotion === "troubled") return `${topic ? topic[0].toUpperCase() + topic.slice(1) : "Something"} is nagging at me \u2014 it doesn't fit yet.`;
      if (emotion === "aha") return `Oh \u2014 ${topic || "that"} clicks now.`;
      if (emotion === "assured") return `I'm on solid ground${t}.`;
      return EPISTEMIC[emotion] ? EPISTEMIC[emotion].say : "";
    }
    function noteGap(id, topic = "", at = 0) {
      if (id) openGaps.set(id, { topic, at: at | 0 });
      return openGaps.size;
    }
    function closeGap(id, chems) {
      const g = openGaps.get(id);
      if (!g) return null;
      openGaps.delete(id);
      return { ...appraise(chems, { resolved: true }), topic: g.topic };
    }
    return { appraise, voice, noteGap, closeGap, openGaps: () => [...openGaps.values()], EPISTEMIC };
  }

  // chloe-mind.mjs
  function makeChloeMind(opts = {}) {
    const tom = makeTheoryOfMind(opts.tom || {});
    const inner = makeInnerVoice(opts.inner || {});
    const meta = makeMetacognition(opts.meta || {});
    const epi = makeEpistemicAffect(opts.epistemic || {});
    function observe(turn = {}) {
      const { message = "", intent = "respond", features = {}, mood = null, chems = null, signals = {}, material = {}, now = Date.now() } = turn || {};
      let tom_ = null, block = "", propose = null;
      try {
        tom_ = tom.read({ features, intent, message });
        block = tom.block();
        propose = tom.propose();
      } catch (e) {
      }
      let meta_ = null;
      try {
        const a = meta.assess({ intent, factHit: signals.factHit, relevance: signals.relevance, confidence: signals.confidence, surprise: signals.surprise });
        meta_ = Object.assign({}, a, meta.observe(a));
      } catch (e) {
      }
      let epi_ = null;
      try {
        epi_ = epi.appraise(chems, { confidence: signals.confidence, gap: signals.gap, contradiction: signals.contradiction, surprise: signals.surprise, resolved: signals.resolved });
      } catch (e) {
      }
      let inner_ = null;
      try {
        const mat = Object.assign({}, material, { mood: mood || (tom_ ? { arousal: tom_.arousal } : null), now });
        const dec = inner.consider(mat);
        if (dec && dec.surface) {
          const text = inner.render(dec);
          inner.noteSurfaced(now, dec.seed);
          inner_ = { type: dec.type, text, frame: dec.frame, seed: dec.seed, pull: dec.pull };
        }
      } catch (e) {
      }
      return { tom: tom_ ? Object.assign({}, tom_, { block, propose }) : null, meta: meta_, epistemic: epi_, inner: inner_ };
    }
    return {
      observe,
      tom,
      inner,
      meta,
      epistemic: epi,
      // raw faculties for advanced callers
      serialize: () => {
        try {
          return { tom: tom.serialize(), inner: inner.snapshot() };
        } catch (e) {
          return null;
        }
      },
      restore: (s) => {
        if (!s) return;
        try {
          tom.restore(s.tom);
        } catch (e) {
        }
        try {
          inner.restore(s.inner);
        } catch (e) {
        }
      }
    };
  }
  var mind = makeChloeMind();
  var api = {
    observe: (turn) => {
      try {
        return mind.observe(turn);
      } catch (e) {
        return { tom: null, meta: null, epistemic: null, inner: null };
      }
    },
    tomBlock: () => {
      try {
        return mind.tom.block();
      } catch (e) {
        return "";
      }
    },
    tomPropose: () => {
      try {
        return mind.tom.propose();
      } catch (e) {
        return null;
      }
    },
    serialize: () => mind.serialize(),
    restore: (s) => mind.restore(s),
    make: makeChloeMind,
    _mind: mind
  };
  if (typeof window !== "undefined") {
    window.ChloeMind = api;
  }
  var chloe_mind_default = api;
  return __toCommonJS(chloe_mind_exports);
})();
