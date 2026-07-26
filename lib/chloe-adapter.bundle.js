var RookChloeBrain = (() => {
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

  // chloe-adapter.mjs
  var chloe_adapter_exports = {};
  __export(chloe_adapter_exports, {
    CHANNELS: () => CHANNELS,
    chemistry: () => chemistry,
    createCouncil: () => createCouncil,
    createNervous: () => createNervous,
    default: () => chloe_adapter_default,
    enableMood: () => enableMood,
    feedback: () => feedback,
    member: () => member,
    resolve: () => resolve2,
    snapshotChem: () => snapshotChem,
    withTimeout: () => withTimeout
  });

  // D:/Claude/brain/src/math.js
  var clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  var decayTowardSetpoint = (level, setpoint, k) => level - k * (level - setpoint);

  // D:/Claude/brain/src/neuromodulation.js
  var DEFAULTS = {
    dopamine: { setpoint: 0.2, k: 0.18, reactivity: 1 },
    norepinephrine: { setpoint: 0.3, k: 0.05, reactivity: 1 },
    serotonin: { setpoint: 0.5, k: 0.02, reactivity: 1 },
    acetylcholine: { setpoint: 0.3, k: 0.05, reactivity: 1 }
  };
  var DEFAULT_SETPOINTS = {
    dopamine: DEFAULTS.dopamine.setpoint,
    norepinephrine: DEFAULTS.norepinephrine.setpoint,
    serotonin: DEFAULTS.serotonin.setpoint,
    acetylcholine: DEFAULTS.acetylcholine.setpoint
  };
  var VALENCE_CENTER = DEFAULT_SETPOINTS.dopamine + DEFAULT_SETPOINTS.serotonin - 0.5 * DEFAULT_SETPOINTS.norepinephrine;
  var SEEK_RISE = 0.6;
  var SEEK_DECAY = 0.25;
  function makeNeuromodulation({ setpoints = {}, reactivity = {} } = {}) {
    const chem2 = {};
    let seek = 0;
    for (const name of Object.keys(DEFAULTS)) {
      const d = DEFAULTS[name];
      chem2[name] = {
        setpoint: setpoints[name] ?? d.setpoint,
        k: d.k,
        reactivity: reactivity[name] ?? d.reactivity,
        level: setpoints[name] ?? d.setpoint,
        // start at rest
        phasic: 0
      };
    }
    return {
      setpoint(name) {
        return chem2[name].setpoint;
      },
      level(name) {
        return chem2[name].level;
      },
      // Inject a phasic event (e.g. reward -> dopamine, threat -> norepinephrine). Red-team V5: a poisoned NaN/Infinity
      // magnitude is dropped rather than allowed to propagate into the field (which would pin valence at NaN forever).
      burst(name, magnitude) {
        if (!chem2[name]) return;
        const d = magnitude * chem2[name].reactivity;
        if (Number.isFinite(d)) chem2[name].phasic += d;
      },
      // Advance the field one tick: apply phasic input, then homeostatic decay. Red-team V5 hardening: after the update a
      // non-finite level is reset to its setpoint (a fault, not a crash) and every level is clamped to a generous finite
      // range — normal operation stays well inside it, so behaviour is unchanged, but a runaway can't reach Infinity/NaN.
      tick() {
        for (const name of Object.keys(chem2)) {
          const c = chem2[name];
          if (name === "dopamine") {
            const approach = Math.max(0, c.phasic);
            seek += SEEK_RISE * approach - SEEK_DECAY * seek;
            if (!Number.isFinite(seek)) seek = 0;
            else seek = Math.max(0, Math.min(8, seek));
          }
          c.level += c.phasic;
          c.phasic = 0;
          c.level = decayTowardSetpoint(c.level, c.setpoint, c.k);
          if (!Number.isFinite(c.level)) c.level = c.setpoint;
          else c.level = Math.max(-16, Math.min(16, c.level));
        }
      },
      // Live trait update (personality edits): change setpoint/reactivity, keep current level.
      setTrait({ setpoints: setpoints2 = {}, reactivity: reactivity2 = {} } = {}) {
        for (const name in setpoints2) if (chem2[name]) chem2[name].setpoint = setpoints2[name];
        for (const name in reactivity2) if (chem2[name]) chem2[name].reactivity = reactivity2[name];
      },
      // Plasticity gate (three-factor): how far dopamine is above its setpoint, >= 0.
      plasticityGate() {
        const c = chem2.dopamine;
        return Math.max(0, c.level - c.setpoint);
      },
      // Human-facing gauge derived from the chemistry, BOUNDED to a usable range. The raw chem levels are
      // unbounded (bursts outpace the weak homeostatic decay -> dopamine climbs toward ~4 under sustained
      // reward), so the raw sums saturate; tanh squashes them to valence in (-1,1) and arousal in (0,1) --
      // near-linear near rest, saturating at the extremes -- so mood is an ACTUAL usable control signal
      // (before this, valence sat pinned at ~2-4 and describeMood's v>0.3 test read "positive" every turn).
      // Only the readout is bounded; level()/plasticityGate()/gain read raw levels, so learning is untouched.
      readout() {
        const d = chem2.dopamine, sp = d.setpoint, DA_SAT = 0.6;
        const daFelt = d.level <= sp ? d.level : sp + Math.tanh((d.level - sp) / DA_SAT) * DA_SAT;
        const vRaw = daFelt + chem2.serotonin.level - 0.5 * chem2.norepinephrine.level - VALENCE_CENTER;
        const aRaw = chem2.norepinephrine.level + 0.5 * chem2.acetylcholine.level;
        return { valence: Math.tanh(vRaw), arousal: Math.tanh(aRaw), seeking: Math.tanh(seek) };
      },
      snapshot() {
        return { ...JSON.parse(JSON.stringify(chem2)), __seek: seek };
      },
      restore(state) {
        const s = JSON.parse(JSON.stringify(state));
        seek = Number.isFinite(s.__seek) ? s.__seek : 0;
        delete s.__seek;
        Object.assign(chem2, s);
      }
    };
  }

  // D:/Claude/brain/src/council.js
  var TAG_CHANNEL = {
    approach: "dopamine",
    reward: "dopamine",
    seek: "dopamine",
    play: "dopamine",
    curious: "dopamine",
    caution: "norepinephrine",
    threat: "norepinephrine",
    avoid: "norepinephrine",
    protect: "norepinephrine",
    safety: "norepinephrine",
    deliberate: "serotonin",
    patient: "serotonin",
    reflect: "serotonin",
    plan: "serotonin",
    steady: "serotonin",
    focus: "acetylcholine",
    attend: "acetylcholine",
    salient: "acetylcholine"
  };
  var NOGO_CHANNEL = { withhold: "dopamine", nogo: "dopamine", brake: "dopamine" };
  var REST = DEFAULT_SETPOINTS;
  function moodTilt(tags = [], chem2 = null, { gain = 1.1, channelForTag = TAG_CHANNEL, nogoForTag = NOGO_CHANNEL, rest = REST } = {}) {
    if (!chem2 || !tags || !tags.length) return 1;
    let m = 1;
    for (const tag of tags) {
      const exc = channelForTag[tag];
      if (exc && chem2[exc] != null) {
        m *= clamp(1 + gain * (chem2[exc] - (rest[exc] ?? 0.3)), 0.1, 3);
        continue;
      }
      const inh = nogoForTag[tag];
      if (inh && chem2[inh] != null) {
        m *= clamp(1 - gain * (chem2[inh] - (rest[inh] ?? 0.3)), 0.1, 3);
      }
    }
    return m;
  }
  function resolve(proposals = [], ballots = [], vetoes = [], config = {}) {
    const { allowSelfVote = false, vetoQuorum = 1, consensusMargin = 0 } = config;
    const seen = /* @__PURE__ */ new Set();
    const props = proposals.filter((p) => p && p.by != null && !seen.has(p.by) && seen.add(p.by));
    const vetoCount = {}, vetoWhy = {};
    for (const v of vetoes) if (v && v.against != null) {
      vetoCount[v.against] = (vetoCount[v.against] || 0) + 1;
      (vetoWhy[v.against] = vetoWhy[v.against] || []).push({ by: v.by, reason: v.reason || "" });
    }
    const struck = (id) => (vetoCount[id] || 0) >= vetoQuorum;
    let live = props.filter((p) => !struck(p.by));
    let allVetoed = false;
    if (!live.length && props.length) {
      live = props.slice();
      allVetoed = true;
    }
    const tally = {};
    live.forEach((p) => tally[p.by] = 0);
    const topOf = {};
    for (const b of ballots || []) {
      if (!b || !b.scores) continue;
      let best = null, bestS = -Infinity;
      for (const p of live) {
        if (!allowSelfVote && b.voter === p.by) continue;
        const s = Number(b.scores[p.by]);
        if (!isFinite(s)) continue;
        tally[p.by] += s;
        if (s > bestS) {
          bestS = s;
          best = p.by;
        }
      }
      if (best != null) topOf[b.voter] = best;
    }
    const order = new Map(live.map((p, i) => [p.by, i]));
    const conf = Object.fromEntries(live.map((p) => [p.by, Number(p.conf) || 0]));
    const ranked = live.slice().sort((a, b) => tally[b.by] - tally[a.by] || conf[b.by] - conf[a.by] || order.get(a.by) - order.get(b.by));
    const win = ranked[0] || null, second = ranked[1] || null;
    const margin = win ? tally[win.by] - (second ? tally[second.by] : 0) : 0;
    const voters = Object.keys(topOf).filter((v) => allowSelfVote || !win || v !== win.by);
    const consensus = !!win && voters.length > 0 && voters.every((v) => topOf[v] === win.by);
    const dissent = win ? voters.filter((v) => topOf[v] !== win.by) : [];
    const status = !win ? "no-proposals" : allVetoed ? "contested" : consensus ? "agreed" : margin <= consensusMargin ? "tie-resolved" : "carried";
    return {
      winner: win ? win.by : null,
      action: win ? win.action ?? null : null,
      text: win ? win.text ?? null : null,
      status,
      tally,
      margin: +margin.toFixed(4),
      consensus,
      dissent,
      vetoed: Object.keys(vetoCount).filter(struck),
      vetoReasons: vetoWhy
    };
  }

  // chloe-adapter.mjs
  var NATION_TAGS = {
    heart: "approach",
    play: "play",
    instinct: "seek",
    reason: "deliberate",
    memory: "reflect",
    voice: "attend",
    conscience: "protect"
  };
  var chem = makeNeuromodulation({});
  var moodEnabled = false;
  function enableMood(on) {
    moodEnabled = on !== false;
    return moodEnabled;
  }
  function chemistry() {
    return chem;
  }
  function feedback(sig) {
    sig = sig || {};
    const k = sig.kind;
    const amount = k === "up" || k === "keep" ? 0.3 : k === "down" ? -0.4 : 0;
    if (!amount) return null;
    try {
      chem.burst("dopamine", amount);
      chem.burst("serotonin", amount * 0.5);
      if (amount < 0) chem.burst("norepinephrine", -amount * 0.6);
      chem.tick();
    } catch {
    }
    return { applied: amount, levels: snapshotChem() };
  }
  var CHANNELS = ["dopamine", "norepinephrine", "serotonin", "acetylcholine"];
  function snapshotChem() {
    const out = {};
    for (const n of CHANNELS) {
      try {
        const v = chem.level(n);
        if (typeof v === "number") out[n] = +v.toFixed(3);
      } catch {
      }
    }
    return out;
  }
  function resolve2(props, ballots, vetoes, opts) {
    opts = opts || {};
    let proposals = props || [];
    const useChem = opts.chem || (moodEnabled ? snapshotChem() : null);
    if (useChem) {
      proposals = proposals.map((p) => {
        if (!p) return p;
        const tags = p.tags || (p.by != null ? [NATION_TAGS[String(p.by)] || String(p.by)] : []);
        if (!tags.length) return p;
        let w = 1;
        try {
          w = moodTilt(tags, useChem);
        } catch {
          w = 1;
        }
        const base = Number(p.conf);
        return Object.assign({}, p, { conf: (isFinite(base) && base !== 0 ? base : 1) * (Number(w) || 1) });
      });
    }
    try {
      chem.tick();
    } catch {
    }
    const r = resolve(proposals, ballots || [], vetoes || [], {
      allowSelfVote: !!opts.allowSelfVote,
      vetoQuorum: opts.vetoQuorum == null ? 1 : opts.vetoQuorum,
      consensusMargin: opts.consensusMargin == null ? 0 : opts.consensusMargin
    });
    return {
      winnerId: r.winner,
      text: r.text,
      action: r.action,
      status: r.status,
      tally: r.tally,
      margin: r.margin,
      consensus: r.consensus,
      dissent: r.dissent,
      vetoed: r.vetoed,
      vetoReasons: r.vetoReasons
    };
  }
  function withTimeout(p, ms, fallback, sched) {
    const setT = sched && sched.setTimeout || setTimeout;
    const clrT = sched && sched.clearTimeout || clearTimeout;
    if (!ms || ms <= 0) return Promise.resolve(p);
    return new Promise((res) => {
      let done = false;
      const t = setT(() => {
        if (!done) {
          done = true;
          res(fallback);
        }
      }, ms);
      Promise.resolve(p).then(
        (v) => {
          if (!done) {
            done = true;
            clrT(t);
            res(v);
          }
        },
        () => {
          if (!done) {
            done = true;
            clrT(t);
            res(fallback);
          }
        }
      );
    });
  }
  function member(id, role, hooks) {
    hooks = hooks || {};
    return { id, role: role || "", propose: hooks.propose, vote: hooks.vote, veto: hooks.veto, state: "idle" };
  }
  function createNervous(log) {
    const nodes = /* @__PURE__ */ new Map(), subs = /* @__PURE__ */ new Map();
    const say = (...a) => {
      try {
        if (typeof log === "function") log(...a);
      } catch {
      }
    };
    const api2 = {
      register(id, node) {
        nodes.set(id, Object.assign({ id, state: "idle" }, node || {}));
        say("register", id);
        return api2;
      },
      setState(id, s) {
        const n = nodes.get(id);
        if (n) n.state = s;
        return api2;
      },
      wake(id) {
        return api2.setState(id, "awake");
      },
      sleep(id) {
        return api2.setState(id, "asleep");
      },
      standby(id) {
        return api2.setState(id, "idle");
      },
      send(id, msg) {
        const n = nodes.get(id);
        if (n && typeof n.receive === "function") {
          try {
            return n.receive(msg);
          } catch (e) {
            say("send-error", id, e);
          }
        }
        return null;
      },
      ask(id, msg) {
        return Promise.resolve(api2.send(id, msg));
      },
      publish(topic, msg) {
        const ls = subs.get(topic) || [];
        for (const fn of ls) {
          try {
            fn(msg);
          } catch (e) {
            say("publish-error", topic, e);
          }
        }
        return ls.length;
      },
      subscribe(topic, fn) {
        const ls = subs.get(topic) || [];
        ls.push(fn);
        subs.set(topic, ls);
        return () => {
          const cur = subs.get(topic) || [];
          const i = cur.indexOf(fn);
          if (i >= 0) cur.splice(i, 1);
        };
      },
      health() {
        return { nodes: nodes.size, topics: subs.size, states: Object.fromEntries([...nodes].map(([k, v]) => [k, v.state])) };
      },
      list() {
        return [...nodes.keys()];
      },
      describe(id) {
        const n = nodes.get(id);
        return n ? { id: n.id, role: n.role || "", state: n.state } : null;
      },
      find(pred) {
        return [...nodes.values()].filter(pred || (() => true));
      }
    };
    return api2;
  }
  function createCouncil(o) {
    o = o || {};
    const members = o.members || [];
    const nervous = o.nervous || createNervous(o.log);
    const timeoutMs = o.timeoutMs == null ? 8e3 : o.timeoutMs;
    const sched = o.sched;
    const opts = o.opts || {};
    const api2 = {
      members,
      nervous,
      size: members.length,
      resolve: (p, b, v, x) => resolve2(p, b, v, x || opts),
      wakeStalled() {
        for (const m of members) if (m.state === "stalled") m.state = "idle";
        return api2;
      },
      async deliberate(ctx, seed) {
        ctx = ctx || {};
        let proposals;
        if (Array.isArray(seed) && seed.length) {
          proposals = seed.map((s, i) => typeof s === "string" ? { by: members[i] ? members[i].id : "cand" + i, text: s } : s);
        } else {
          proposals = (await Promise.all(members.map((m) => typeof m.propose === "function" ? withTimeout(Promise.resolve().then(() => m.propose(ctx)), timeoutMs, null, sched) : Promise.resolve(null)))).map((p, i) => p == null ? null : typeof p === "string" ? { by: members[i].id, text: p } : Object.assign({ by: members[i].id }, p)).filter(Boolean);
        }
        if (!proposals.length) return { winnerId: null, text: null, status: "no-proposals", tally: {}, margin: 0, consensus: false, dissent: [], vetoed: [] };
        const ballots = (await Promise.all(members.map(async (m) => {
          if (typeof m.vote !== "function") return null;
          const scores = {};
          for (const p of proposals) {
            const s = await withTimeout(Promise.resolve().then(() => m.vote(p, ctx)), timeoutMs, 0, sched);
            scores[p.by] = Number(s) || 0;
          }
          return { voter: m.id, scores };
        }))).filter(Boolean);
        const vetoes = [];
        for (const m of members) {
          if (typeof m.veto !== "function") continue;
          for (const p of proposals) {
            const v = await withTimeout(Promise.resolve().then(() => m.veto(p, ctx)), timeoutMs, null, sched);
            if (v) vetoes.push({ by: m.id, against: p.by, reason: typeof v === "string" ? v : v.reason || "" });
          }
        }
        return resolve2(proposals, ballots, vetoes, opts);
      }
    };
    return api2;
  }
  var api = { resolve: resolve2, createNervous, createCouncil, member, withTimeout, enableMood, feedback, chemistry, snapshotChem };
  if (typeof window !== "undefined") {
    window.ChloeBrain = api;
    window.ChloeCouncil = api;
  }
  var chloe_adapter_default = api;
  return __toCommonJS(chloe_adapter_exports);
})();
