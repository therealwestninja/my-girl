/* chloe-adapter — re-backs the deliberation substrate on D:/Claude/brain.
 *
 * Build: node build-adapter.mjs   (esbuild -> lib/chloe-adapter.bundle.js, a UMD registering window.ChloeBrain)
 *
 * WHAT THIS REPLACES. `brain.min.js` was a compiled copy of the old Chloe/Rook deliberation core. The contract the app
 * calls is small and documented in BRAIN-ENDPOINTS.md §1: resolve / createNervous / createCouncil / member /
 * withTimeout. Only ONE of those is actually a brain — `resolve`, the vote tally that decides who speaks. The rest is
 * pure orchestration (a pub/sub registry, a promise timeout, a propose->vote->veto loop) and has no neural content at
 * all, so it is reimplemented here plainly rather than pretended to be migrated.
 *
 * THE ACTUAL MIGRATION is `resolve`: it now delegates to the new brain's `council.js`, which already implements the
 * same algorithm (dedupe proposers, strike vetoed, sum ballots, rank by score/confidence/order, report
 * consensus/dissent). The shapes line up almost exactly — the only rename is `winner` -> `winnerId`, which the legacy
 * app reads.
 *
 * WHAT THE NEW BRAIN ADDS: `moodTilt(tags, chem)` weights a proposal by the mind's current chemistry, so a decision
 * can be tilted by how she actually feels rather than by static config weights alone. It is OPT-IN here (only applied
 * when a caller supplies tags AND a chem source) because turning it on unconditionally would change every existing
 * decision, and the migration has to be provable against the existing harness first.
 */

// Same convention as chloe-affect.mjs: the canonical brain (D:\Claude\brain) resolves as a SIBLING of this repo.
import { resolve as brainResolve, moodTilt } from "../brain/src/council.js";
import { makeNeuromodulation } from "../brain/src/neuromodulation.js";

/* ---- chemistry: the army's mood + feedback, on the new brain ----------------------------------------------------
 * `createArmy` never learns about this. It injects a brain and calls `resolve`, so the chemistry lives HERE and the
 * Seven Nations get mood-weighted decisions and reward learning without nation.js changing at all.
 *
 * Two couplings:
 *   mood     — each proposal is tilted by `moodTilt(tags, chem)`. A proposal carries no tags, so the PROPOSER'S ID is
 *              used as its tag: 'heart', 'reason', 'play' are exactly the channels a mood should favour or damp.
 *   feedback — a thumbs-up/down bursts the reward chemistry, so approval durably shifts which minds win later,
 *              rather than only nudging the in-memory bonds nation.js already keeps.
 *
 * OFF BY DEFAULT. Turning tilt on changes which mind speaks — that is the entire point, and also why it cannot be the
 * default until it has been chosen deliberately. `harness-adapter.js` proves parity with it off; `harness-mood.js`
 * proves it actually bites when on.
 */
/* The Seven Nations expressed in the brain's OWN tag vocabulary (council.js TAG_CHANNEL). Without this the tilt is a
 * silent no-op: a proposal tagged 'heart' or 'reason' means nothing to the brain, every proposal gets the same neutral
 * weight, and the decision never moves — measured, and exactly what harness-mood.js caught. Only 'play' overlapped by
 * accident.
 *
 * The mapping is a judgement, so it is written down rather than buried:
 *   heart      -> approach    warmth reaches toward someone; dopamine's go-signal
 *   play       -> play        already the brain's own word
 *   instinct   -> seek        the fast, wanting, unreflective pull
 *   reason     -> deliberate  the slow, weighing channel
 *   memory     -> reflect     looking back is reflection
 *   voice      -> attend      taking the floor is an act of attention
 *   conscience -> protect     the brake: caution on someone's behalf
 * Extras fall back to their own id, which simply means "no tilt" — deliberately inert rather than guessed at.
 */
const NATION_TAGS = {
  heart: "approach", play: "play", instinct: "seek", reason: "deliberate",
  memory: "reflect", voice: "attend", conscience: "protect",
};
const chem = makeNeuromodulation({});
let moodEnabled = false;
export function enableMood(on) { moodEnabled = on !== false; return moodEnabled; }
export function chemistry() { return chem; }
// A reaction is reward: 'up'/'keep' is a positive burst, 'down' a negative one. Names match the brain's channels.
export function feedback(sig) {
  sig = sig || {};
  const k = sig.kind;
  const amount = (k === "up" || k === "keep") ? 0.3 : (k === "down" ? -0.4 : 0);
  if (!amount) return null;
  try {
    // CHANNEL NAMES MUST MATCH THE BRAIN'S. `burst` silently no-ops on an unknown name (`if (!chem[name]) return`), so
    // a plausible-but-wrong name like "cortisol" or "oxytocin" fails completely quietly — measured, and the reason
    // harness-mood.js asserts that a reaction MOVES a level rather than merely that it was called.
    chem.burst("dopamine", amount);                        // reward / wanting
    chem.burst("serotonin", amount * 0.5);                 // settledness follows approval, more slowly
    if (amount < 0) chem.burst("norepinephrine", -amount * 0.6);   // disapproval is arousing: the closest channel to a stressor
    // `burst` only accumulates `phasic`; `tick` is what applies it to the level. Without this a reaction would not
    // register until the NEXT decision happened to tick, which reads as "feedback does nothing".
    chem.tick();
  } catch { /* chemistry must never break a reaction */ }
  return { applied: amount, levels: snapshotChem() };
}
export const CHANNELS = ["dopamine", "norepinephrine", "serotonin", "acetylcholine"];
export function snapshotChem() {
  const out = {};
  for (const n of CHANNELS) {
    try { const v = chem.level(n); if (typeof v === "number") out[n] = +v.toFixed(3); } catch {}
  }
  return out;
}

/* ---- resolve: the one true brain call --------------------------------------------------------------------------
 * Legacy shape in, legacy shape out; the new brain does the thinking in between. `opts.chem` (a neuromodulation
 * level() source) turns on mood-tilted weighting; without it, behaviour is exactly the old tally.
 */
export function resolve(props, ballots, vetoes, opts) {
  opts = opts || {};
  let proposals = props || [];

  // Mood tilt scales each proposal's confidence — what the new brain's own gate does. A proposal from the Seven
  // Nations carries no tags, so the proposer's id stands in: 'heart'/'reason'/'play' are precisely the channels a mood
  // should favour or damp. `conf` defaults to 1 here because the legacy proposals have none, and multiplying 0 by any
  // tilt is still 0 — the tilt would silently do nothing.
  // moodTilt reads chem[NAME] — a plain LEVELS MAP, not the neuromodulation instance (which exposes .level(name)).
  // Passing the instance made every tilt exactly 1.0 while the levels swung from 0.2 to -1.6: a silent no-op that
  // looked wired from every angle except the outcome. harness-mood.js is what caught it.
  const useChem = opts.chem || (moodEnabled ? snapshotChem() : null);
  if (useChem) {
    proposals = proposals.map((p) => {
      if (!p) return p;
      const tags = p.tags || (p.by != null ? [NATION_TAGS[String(p.by)] || String(p.by)] : []);
      if (!tags.length) return p;
      let w = 1;
      try { w = moodTilt(tags, useChem); } catch { w = 1; }
      const base = Number(p.conf);
      return Object.assign({}, p, { conf: (isFinite(base) && base !== 0 ? base : 1) * (Number(w) || 1) });
    });
  }
  try { chem.tick(); } catch {}   // let the chemistry relax toward its setpoints once per decision

  const r = brainResolve(proposals, ballots || [], vetoes || [], {
    allowSelfVote: !!opts.allowSelfVote,
    vetoQuorum: opts.vetoQuorum == null ? 1 : opts.vetoQuorum,
    consensusMargin: opts.consensusMargin == null ? 0 : opts.consensusMargin,
  });

  // `winner` -> `winnerId` is the whole shape difference. Everything else already matches by name.
  return {
    winnerId: r.winner, text: r.text, action: r.action, status: r.status,
    tally: r.tally, margin: r.margin, consensus: r.consensus,
    dissent: r.dissent, vetoed: r.vetoed, vetoReasons: r.vetoReasons,
  };
}

/* ---- pure orchestration (no brain in here; reimplemented, not migrated) ---------------------------------------- */

// A promise with a deadline. `sched` is injectable so a test can drive time without waiting on it.
export function withTimeout(p, ms, fallback, sched) {
  const setT = (sched && sched.setTimeout) || setTimeout;
  const clrT = (sched && sched.clearTimeout) || clearTimeout;
  if (!ms || ms <= 0) return Promise.resolve(p);
  return new Promise((res) => {
    let done = false;
    const t = setT(() => { if (!done) { done = true; res(fallback); } }, ms);
    Promise.resolve(p).then((v) => { if (!done) { done = true; clrT(t); res(v); } },
                            () => { if (!done) { done = true; clrT(t); res(fallback); } });
  });
}

// A council member: an id, a human-readable role, and hooks (propose / vote / veto). Data, not behaviour.
export function member(id, role, hooks) {
  hooks = hooks || {};
  return { id: id, role: role || "", propose: hooks.propose, vote: hooks.vote, veto: hooks.veto, state: "idle" };
}

// The nervous system: a tiny pub/sub + registry the app uses to address members. Deliberately unclever — it is
// message plumbing, and the only reason it lives in the "brain" module at all is that the old build put it there.
export function createNervous(log) {
  const nodes = new Map(), subs = new Map();
  const say = (...a) => { try { if (typeof log === "function") log(...a); } catch {} };
  const api = {
    register(id, node) { nodes.set(id, Object.assign({ id, state: "idle" }, node || {})); say("register", id); return api; },
    setState(id, s) { const n = nodes.get(id); if (n) n.state = s; return api; },
    wake(id) { return api.setState(id, "awake"); },
    sleep(id) { return api.setState(id, "asleep"); },
    standby(id) { return api.setState(id, "idle"); },
    send(id, msg) { const n = nodes.get(id); if (n && typeof n.receive === "function") { try { return n.receive(msg); } catch (e) { say("send-error", id, e); } } return null; },
    ask(id, msg) { return Promise.resolve(api.send(id, msg)); },
    publish(topic, msg) { const ls = subs.get(topic) || []; for (const fn of ls) { try { fn(msg); } catch (e) { say("publish-error", topic, e); } } return ls.length; },
    subscribe(topic, fn) { const ls = subs.get(topic) || []; ls.push(fn); subs.set(topic, ls); return () => { const cur = subs.get(topic) || []; const i = cur.indexOf(fn); if (i >= 0) cur.splice(i, 1); }; },
    health() { return { nodes: nodes.size, topics: subs.size, states: Object.fromEntries([...nodes].map(([k, v]) => [k, v.state])) }; },
    list() { return [...nodes.keys()]; },
    describe(id) { const n = nodes.get(id); return n ? { id: n.id, role: n.role || "", state: n.state } : null; },
    find(pred) { return [...nodes.values()].filter(pred || (() => true)); },
  };
  return api;
}

// Orchestrates one deliberation: every member proposes, everyone scores everyone, vetoes are collected, and the tally
// is handed to the (new-brain) resolve above. Members that hang are dropped by `withTimeout` rather than stalling the
// turn — a silent member must not be able to hold the conversation open.
export function createCouncil(o) {
  o = o || {};
  const members = o.members || [];
  const nervous = o.nervous || createNervous(o.log);
  const timeoutMs = o.timeoutMs == null ? 8000 : o.timeoutMs;
  const sched = o.sched;
  const opts = o.opts || {};
  const api = {
    members, nervous, size: members.length,
    resolve: (p, b, v, x) => resolve(p, b, v, x || opts),
    wakeStalled() { for (const m of members) if (m.state === "stalled") m.state = "idle"; return api; },
    async deliberate(ctx, seed) {
      ctx = ctx || {};
      // 1. propose (a seeded candidate list short-circuits the propose round: the app pre-generates candidates)
      let proposals;
      if (Array.isArray(seed) && seed.length) {
        proposals = seed.map((s, i) => (typeof s === "string" ? { by: members[i] ? members[i].id : "cand" + i, text: s } : s));
      } else {
        proposals = (await Promise.all(members.map((m) => (typeof m.propose === "function"
          ? withTimeout(Promise.resolve().then(() => m.propose(ctx)), timeoutMs, null, sched) : Promise.resolve(null)))))
          .map((p, i) => (p == null ? null : (typeof p === "string" ? { by: members[i].id, text: p } : Object.assign({ by: members[i].id }, p))))
          .filter(Boolean);
      }
      if (!proposals.length) return { winnerId: null, text: null, status: "no-proposals", tally: {}, margin: 0, consensus: false, dissent: [], vetoed: [] };

      // 2. vote — each member scores every proposal
      const ballots = (await Promise.all(members.map(async (m) => {
        if (typeof m.vote !== "function") return null;
        const scores = {};
        for (const p of proposals) {
          const s = await withTimeout(Promise.resolve().then(() => m.vote(p, ctx)), timeoutMs, 0, sched);
          scores[p.by] = Number(s) || 0;
        }
        return { voter: m.id, scores };
      }))).filter(Boolean);

      // 3. veto
      const vetoes = [];
      for (const m of members) {
        if (typeof m.veto !== "function") continue;
        for (const p of proposals) {
          const v = await withTimeout(Promise.resolve().then(() => m.veto(p, ctx)), timeoutMs, null, sched);
          if (v) vetoes.push({ by: m.id, against: p.by, reason: typeof v === "string" ? v : (v.reason || "") });
        }
      }
      return resolve(proposals, ballots, vetoes, opts);
    },
  };
  return api;
}

const api = { resolve, createNervous, createCouncil, member, withTimeout, enableMood, feedback, chemistry, snapshotChem };

// Register the way the app expects. The legacy build set BOTH globals (`ChloeCouncil` was an alias), and the app reads
// `window.ChloeBrain`; missing either would leave the council guard printing "(council unavailable)" with nothing
// explaining why.
if (typeof window !== "undefined") { window.ChloeBrain = api; window.ChloeCouncil = api; }

export default api;
