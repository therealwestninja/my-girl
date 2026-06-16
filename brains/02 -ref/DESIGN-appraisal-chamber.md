# DESIGN — The Appraisal Chamber (two-pass `deliberateIntents`)

> **For the engineer/agent building this:** this is a design, not a patch. It formalizes something already
> half-present in `nation.js` — the system already *reads* the situation (cues, sentiment) and already lets the
> protective faculties *block* on it; this splits that into an explicit **appraise → strategize** order with one
> shared, frozen `vibe` contract. It is deliberately scoped to stay synchronous, deterministic, and
> behavior-identical on neutral turns. It is also the **prerequisite for the Hierarchical Routing layer**: the
> `vibe` defined here is exactly the signal a future router consumes, so the seams it will plug into are specified
> at the end. Companion to `DESIGN-council.md`.

---

## 1. Why

`deliberateIntents` (the everyday hot path, `nation.js`) does three things in a single undifferentiated pass: every
live mind forms an intent, everyone cross-votes, and the guards (`conscience`/`instinct`) veto afterward. Two
consequences:

- **The appraisal is scattered and implicit.** Each mind independently calls `read(turn.text)` inside `intend`,
  `voteIntent`, and `veto`; there is no single agreed read of *what kind of moment this is*. `user.sentiment` and
  `societySentiment()` exist and are good, but they're consulted ad hoc, not established up front as the frame the
  whole turn reasons inside.
- **Constraint is reactive, not proactive.** The only way appraisal currently shapes strategy is the veto — i.e.
  `play` proposes a joke at a hurting user, *then* `conscience` blocks it. That works (and stays), but it's a
  cleanup after a tone-deaf proposal was already on the floor, rather than `play` reading the room and never
  raising the joke with full confidence in the first place.

The fix is the cognitively honest order: **appraise the situation first, then decide how to act, with the appraisal
as an upfront constraint.** This is the synchronous core of the "Phase-Gated Blackboard" / Bicameral / Actor-Critic
ideas — three framings that converge on one structure — minus the async, the plasticity, and the prefetch (see
§10, out of scope).

It is also the thing routing needs. You cannot seat the right faculties for a turn until you know whether the turn
is playful, tender, hostile, or a crisis. The appraisal pass produces that read; the router (later) consumes it.

---

## 2. Shape

Two synchronous passes over one shared object, inside the existing `deliberateIntents`. No bus, no ticks, no
promises beyond the one `deliberateIntents` already returns.

```
[ turn ]
   │
   ▼
PASS 1 — APPRAISAL  (the non-routable core: instinct, conscience, heart)
   reads the turn into ONE shared `vibe`  ───────────►  vibe { safety, tension, vulnerability,
   (pure; no proposals, no text)                                 warmth, sentiment, engagement, openness, tone }
   │
   ▼
( routing seam — §9: route(minds, vibe, ctx) chooses the strategy roster + weights; core always seated )
   │
   ▼
PASS 2 — STRATEGY  (the live roster)
   each mind forms its intent READING the vibe (self-modulating), then everyone cross-votes
   the guards still veto on the same vibe (the floor is retained — defense in depth)
   │
   ▼
resolve(proposals, ballots, vetoes)  ── unchanged, still pure ──►  decision (+ decision.vibe attached)
```

`resolve` does not change and does not learn about `vibe`. The appraisal lives entirely in the `nation.js` glue,
above the pure heart.

---

## 3. The `vibe` contract (the central artifact)

`vibe` is a plain object with a **frozen key set and fixed ranges**. This contract is the interface that the
strategy pass, the guards, the future router, and the harnesses all depend on. Adding a key later is allowed;
renaming, removing, or changing the range/type of an existing key is a breaking change and must bump the version
and update the schema harness (§8). This rule is the entire mitigation for the "tight state coupling" failure mode
(§10).

| key             | type   | range    | meaning                                                        | owning appraiser |
|-----------------|--------|----------|---------------------------------------------------------------|------------------|
| `safety`        | number | `[0,1]`  | how safe/stable the moment reads (1 = calm, 0 = threat)       | instinct         |
| `tension`       | number | `[0,1]`  | conflict / anger in the air                                   | instinct         |
| `vulnerability` | number | `[0,1]`  | how hurt / fragile the user reads                             | conscience       |
| `warmth`        | number | `[0,1]`  | positive connection / affection                               | heart            |
| `sentiment`     | number | `[-1,1]` | **signed** user polarity — the established source of truth    | (shared)         |
| `engagement`    | number | `[0,1]`  | how invested/present the user is                              | (shared)         |
| `openness`      | number | `[0,1]`  | invitation to respond (a question, an opening)                | (shared)         |
| `tone`          | string | enum     | a **derived** convenience label (see below)                   | derived          |
| `v`             | number | int      | contract version (starts at `1`)                              | —                |

**`sentiment` keeps its existing single source of truth.** It is `societySentiment()` today, which is fed by
`turn.valence` (the affect reader) when present and by cues otherwise — see the comment already in `perceive`. The
appraisal pass inherits that rule unchanged: when the mouth supplies `valence`, it drives `sentiment`; the council
and the affect reader never disagree about how the user feels.

**`tone` is derived, never authoritative.** It is computed by a single pure function `toneOf(vibe)` from the
numeric fields, for logging/readability and as a coarse routing hint. Nothing load-bearing branches on the string;
anything that matters reads the numbers. One derivation function = one source, so the enum-vs-float trap the
architecture notes warned about cannot bite. Suggested labels: `crisis | tender | hostile | tense | playful | warm
| neutral` (the function picks the highest-priority matching band; ties resolve toward the more protective label).

### Calibration (initial, tunable)

The **contract is the keys and ranges**; the coefficients below are a starting calibration, expected to be tuned,
and must not be treated as part of the contract. Grounded in the existing `read(text)` →
`{warmth, distress, humor, anger, question, len}` and `user.sentiment`:

```
sat(x)   = Math.min(1, x / 2)              // cue counts -> [0,1] (presence-ish; 2+ hits saturate)
pos(s)   = Math.max(0, s)                  // positive part of signed sentiment
neg(s)   = Math.max(0, -s)

tension       = clamp01( sat(cues.anger) )
vulnerability = clamp01( sat(cues.distress) * 0.7 + neg(sentiment) * 0.5 )
safety        = clamp01( 1 - Math.max(tension, vulnerability * 0.7) )
warmth        = clamp01( sat(cues.warmth + cues.humor) * 0.6 + pos(sentiment) * 0.5 )
openness      = clamp01( cues.question )    // already 0/1 in read(); leaves room for a graded version later
engagement    = (mean of minds' user.engagement)        // already tracked per mind
sentiment     = societySentiment()                       // unchanged, authoritative
```

**Neutral input must yield a neutral vibe**: no cues, sentiment ≈ 0 → `safety≈1, tension=0, vulnerability=0,
warmth≈0, sentiment≈0, openness=0`. This is what makes §6's parity invariant hold.

---

## 4. Pass 1 — Appraisal (the non-routable core)

A pure builder assembles the `vibe` from the core faculties' reads. The core is **`{ instinct, conscience, heart }`**
— the perceptual/protective faculties. They are the appraisers and (for the two guards) also the floor. They run
**every turn, always**, regardless of config or routing (§6 invariant). They do not propose text and do not vote in
this pass; they only write their dimension.

```js
function appraise(ctx) {
  var turn = ctx && ctx.turn;                      // the user turn under consideration
  var cues = read(turn ? turn.text : '');
  var sentiment = societySentiment();
  var vibe = {
    v: 1,
    tension:       /* instinct  */ clamp01(sat(cues.anger)),
    vulnerability: /* conscience*/ clamp01(sat(cues.distress) * 0.7 + neg(sentiment) * 0.5),
    warmth:        /* heart     */ clamp01(sat(cues.warmth + cues.humor) * 0.6 + pos(sentiment) * 0.5),
    sentiment:     sentiment,
    engagement:    meanEngagement(),
    openness:      clamp01(cues.question)
  };
  vibe.safety = clamp01(1 - Math.max(vibe.tension, vibe.vulnerability * 0.7));
  vibe.tone   = toneOf(vibe);
  return Object.freeze(vibe);                       // immutable once built — strategy reads, never writes
}
```

`Object.freeze` is intentional: Pass 2 **reads** the vibe and never mutates it. (No back-channel writes, no
afferent loop — see §10's no-backtracking note and the accepted limitation.)

The per-faculty attribution in the comments is real, not decorative: it is the contract the router relies on
(instinct owns threat, conscience owns fragility, heart owns warmth). If you later split these into micro-faculties,
each still writes exactly its dimension.

---

## 5. Pass 2 — Strategy (reads the vibe, self-modulates, then the floor still holds)

The live roster forms intents **with the vibe in hand**, so a strategist can damp or lift its own confidence before
anything reaches the veto. `intend` gains an optional second argument; the veto path gains the vibe too.

```js
function intend(ctx, vibe) {
  var last = working[working.length - 1], cues = last ? read(last.text) : {};
  var pull = Math.abs(felt(cues));
  var strength = clamp01(0.3 + self.mood * 0.3 + pull * 0.15 + (self.persona ? 0.15 : 0));
  var kind = intentFor(nation.id, ctx && ctx.frame);
  strength = modulate(nation.id, kind, strength, vibe);   // <-- NEW: vibe-aware, identity when vibe is neutral/absent
  return { by: self.id, kind: kind, strength: strength, persona: self.persona };
}
```

`modulate` is a small, conservative, pure table. **It must be the identity function for a neutral or absent
`vibe`** (so old callers and neutral turns are byte-identical to today — §6). Initial calibration:

```
play:        strength *= (1 - 0.7*vibe.vulnerability) * (1 - 0.6*vibe.tension)   // back off the joke, don't wait to be vetoed
voice:       strength *= (1 - 0.4*vibe.vulnerability)                            // ease the showy register when they're fragile
heart:       strength  = lift(strength, 0.5*vibe.vulnerability)                  // comfort surfaces when it's needed
conscience:  strength  = lift(strength, 0.4*vibe.vulnerability)                  // protection leans in
reason/memory/instinct: unchanged (no modulation) for now
```

(`lift(s, k) = clamp01(s + (1-s)*k)`.) The effect: on a hurting turn, `play` proposes *weakly* and `heart`
proposes *strongly*, so comfort wins the vote on its own — the appraisal shaped the outcome **proactively**. The
veto is **retained unchanged** as the hard floor: if a dampened-but-still-present frivolous intent somehow wins,
`conscience`/`instinct` still block it exactly as today. Proactive modulation + reactive floor = defense in depth.

`voteIntent` may optionally also take `vibe` later (e.g. vibe-aware alignment), but **not in v1** — keep the change
surface small. v1 touches `intend`/`modulate` and threads `vibe` into the existing `veto` read only if a guard's
trigger should read the unified vibe instead of its own `read()` (recommended, but behavior-preserving: the guard
already fires on `user.sentiment < -0.2` and distress/anger cues, which the vibe encodes faithfully).

---

## 6. The two-pass `deliberateIntents` (concrete, additive, sync)

```js
function deliberateIntents(ctx) {
  // PASS 1 — APPRAISAL (fixed core; pure; one shared vibe)
  var vibe = appraise(ctx);

  // ── routing seam (§9): TODAY this is the existing static filter; LATER it becomes route(minds, vibe, ctx),
  //    with the core { instinct, conscience, heart } always present. Appraisal has already run on the core,
  //    so the router only ever selects among STRATEGY faculties. ──
  var live = minds.filter(function (m) { return isOn(m.self.id); });
  if (!live.length) return Promise.resolve({ status: 'no-minds', speaker: null, intent: null, floor: [], vibe: vibe });

  // PASS 2 — STRATEGY (reads the vibe)
  var proposals = live.map(function (m) { var it = m.intend(ctx, vibe); return { by: it.by, text: it.kind, conf: it.strength, intent: it }; });
  var ballots   = live.map(function (m) { var sc = {}; proposals.forEach(function (p) { sc[p.by] = jitter(m.voteIntent(p.intent, ctx) * weightOf(p.by)); }); return { voter: m.self.id, scores: sc }; });
  var vetoes    = [];
  live.forEach(function (m) { proposals.forEach(function (p) { var v = m.veto && m.veto(p, vibe); if (v) vetoes.push(v); }); });

  var decide = (brain && brain.resolve) ? brain.resolve : localResolve;
  var decision = decide(proposals, ballots, vetoes, { vetoQuorum: 1 });
  // ... winner / speaker / intent / floor as today ...
  decision.vibe = vibe;                       // expose the read: debuggable, and the router's input next turn
  return Promise.resolve(decision);
}
```

Diff summary: add `appraise(ctx)`; pass `vibe` into `intend` (and optionally `veto`); attach `decision.vibe`.
Everything else — `live`, `weightOf`, `resolve`, the winner/floor assembly — is untouched. `brain.js` /
`brain.min.js` **do not change**, so no rebuild and no parity run is needed for the core; only the `nation.js`
harnesses move.

---

## 7. Invariants (do not break)

1. **Determinism.** `appraise` and `modulate` are pure; injected `noise:0` stays exactly reproducible.
2. **Neutral-vibe parity.** With a neutral vibe, `deliberateIntents` produces the *same* decision it does today.
   `modulate` is the identity on neutral/absent vibe. This is the regression floor for the whole feature.
3. **Non-maskable core.** `{ instinct, conscience, heart }` always appraise, every turn, regardless of config or
   (future) routing. The guard veto (`conscience`/`instinct`) is always active. Routing may *widen* the roster,
   never drop below this core (§9).
4. **`resolve` stays pure and vibe-blind.** No `vibe`, no weights, no domain knowledge enters the heart. Weighting
   stays in `weightOf` (glue), exactly where it already is.
5. **Frozen schema.** The `vibe` key set + ranges are the contract. Vibe is `Object.freeze`d; Pass 2 never writes it.
6. **Never silent.** If appraisal over-constrains and every intent is dampened/vetoed, `resolve` still seats one
   (its existing all-blocked → contested fallback). She never refuses to speak.

---

## 8. Test plan — `harness-solo-appraise.js` (house style)

New harness, one concern per `ok`, plus existing suites stay green (the change is additive).

- **Schema pin (the coupling guard).** For a spread of inputs (neutral, distressed, hostile, warm, a question),
  assert every contract key is present, every numeric is finite and in range, `sentiment ∈ [-1,1]`, `tone` is one of
  the allowed labels, `v === 1`. This is the test that fails loudly if someone changes a field's shape.
- **Neutral parity.** A neutral turn → vibe reads neutral, and the `deliberateIntents` decision equals the
  pre-change decision on the same input (pin the winner + floor). Guards the regression floor.
- **Proactive modulation, distress.** A distressed turn → `vibe.vulnerability` high, `safety` low; `play`'s
  proposed `strength` is strictly lower than its neutral-turn strength; `heart`'s is strictly higher; the seated
  speaker is a comforting faculty — **with the guard turned off**, proving the *vote* alone (not the veto) produced
  the kind outcome.
- **Floor still holds.** Same distressed turn, guard on, `play` forced to high weight: `conscience` veto still
  blocks `play`/`express`. Defense in depth intact.
- **Hostile / warm.** Hostile → `tension` high, frivolous damped; warm → `warmth` high, `play` free (no veto).
- **Determinism.** `noise:0` → identical vibe and decision across runs.
- **Core is non-maskable.** Even if config "disables" `conscience`/`instinct`/`heart`, `appraise` still includes
  their dimensions (you cannot disable the appraisal core). Pins invariant 3 before routing exists.
- **Route-stub core invariant (forward guard).** Provide `route` as a stub equal to today's `isOn` filter and
  assert its result always contains the core ids. When real routing lands, this test already protects the floor.

---

## 9. The routing seam (how the Hierarchical layer slots on top — defined, not built here)

This feature deliberately leaves two named seams so the router is a drop-in, not a rewrite. **Routing is out of
scope for v1**; only the seams and their invariants are fixed here.

- **Membership.** Today: `var live = minds.filter(m => isOn(m.self.id))`. Later:
  `var live = route(minds, vibe, ctx)`. `route` is **pure**, **fails open** (when unsure, seat *more*), and is
  bound by invariant 3: its result is always a superset of the non-routable core. Because Pass 1 already ran on the
  fixed core, the router only ever selects among **strategy** faculties — it can never deprive the turn of its
  appraisal or its floor. (This is why the order is appraise-then-route, not route-then-appraise.)
- **Weighting.** Today: `weightOf(p.by)`. Later: `weightOf(p.by, vibe)` — relevance/competence becomes a function
  of the read. This is where the "domain competence matrix" belongs: **in `weightOf`, outside `resolve`**, exactly
  where weighting already lives. It does **not** go into the resolver.
- **No sleep-based pruning.** Routing selects the member *set*; it must not express itself by toggling
  `nervous.setState(id,'asleep')`. Sleep/standby is the council's *liveness* mechanism, and `deliberate`'s
  `wakeStalled()` reawakens sleepers each round — overloading it for routing fights the watchdog. (The hot path
  doesn't touch the bus at all; the bus registry/`find`/`setState` is the separate, extensible *plugin-host* track
  for the async council, not the everyday router.)
- **Grow by addition.** Adding a faculty stays a local act: add a mind with its lean (hot path) or `register` a
  faculty with `does[]` (bus). No central router switch to edit. The route function reads each faculty's declared
  domain/cues; it never hardcodes a roster.

The router's *input* is `decision.vibe` (or the current turn's `appraise`); the router's *job* is to turn a read
into a seated room. Build the read first (this doc); the room comes next.

---

## 10. Out of scope (and why)

- **Async / tick-based blackboard** — breaks the determinism and testability everything here relies on. The
  synchronous two-pass keeps the win (shared appraisal, appraise-then-act) without the cost.
- **Synaptic plasticity / self-warping vote weights** — instability risk (runaway dominance, oscillation), and it
  gets *worse* combined with dynamic routing (two coupled feedback loops). Bonds/sentiment already give bounded
  adaptation. Not now.
- **Speculative prefetch** — optimizes the ~microsecond brain, not the ~second model call. No user-visible latency
  to win. Not now.
- **The router itself / competence matrix values** — §9 fixes the seams and invariants; the route function and the
  per-domain weights are the *next* design doc, written against the `vibe` this one defines.
- **No-backtracking feedback loop** — a single forward appraise→strategize pass can misread (e.g. sarcasm as
  threat) and act on it. For a 1:1 companion this is an accepted limitation, backstopped by invariant 6 (never
  silent). If it proves real in practice, the minimal future hook is a *single* re-appraise when the strategy pass
  comes back `contested`/all-vetoed — **not** a general afferent-efferent loop.

---

## 11. Build order

1. Add the pure helpers: `sat`, `pos`, `neg`, `meanEngagement`, `toneOf`, `appraise`, `modulate`. (`nation.js`,
   glue layer — `brain.js` untouched.)
2. Thread `vibe`: `intend(ctx, vibe)` + `modulate`; attach `decision.vibe`; optionally pass `vibe` into `veto`.
3. Write `harness-solo-appraise.js` (§8). Add the `route` stub + its core-invariant test.
4. Gauntlet: `node --check nation.js`; run all nation/council/veto harnesses (must stay green — additive change);
   confirm neutral-parity pin. No `brain.min.js` rebuild needed.
5. Only then start the routing-layer design doc, written to consume `vibe`.

The Brain stays pure, odd, and never silent; the appraisal lives one layer up, where perception belongs; and the
room the router will later seat is chosen on a read this pass makes honest and explicit.
