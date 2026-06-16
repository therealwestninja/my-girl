# CHANGELOG — the Brain (as-built)

The `DESIGN-*.md` docs are **design intent**. This file is the **as-built record**: what actually landed, in
what order, and — where the build deliberately departed from a doc — *what* changed and *why*. Where this file and
a design doc disagree, **this file is ground truth** and the divergence is intentional (each was flagged at build
time). Newest first. Scope: the `brain-handoff` sandbox (`nation.js` glue + `brain.js`/`brain.min.js` pure core).

Format: `Added` / `Changed` / `Hardened` / `Fixed`, plus a standing **Deviations from design intent** section that
the eventual app port should translate from (not the stale doc text).

---

## 2026-06-16 — `/nation` addressing & self-report (specialists slice 1)

Design: `DESIGN-specialists-addressing-fringe.md` pins the node taxonomy's third kind — the **specialist** (a
contributor that doesn't feel or remember, never votes, but is addressable and promotable) — the `/nation`
addressing protocol (**overrides the vote, never the floor**), and the **referral fringe** (a plain adjacent-domain
list: what a node recognizes but doesn't own, for honest deferral and mutual nomination). Three decisions pinned:
specialists don't vote; fringe is a flat list (weighted edges parked); the self-report is a pure structured object
plus a first-person line.

### Added (build-order slice 1 — pure, zero behaviour change)
- `selfReport(id, vibe)` — any node speaks for itself: kind/core/purpose/domain/fringe, live `relevance`, whether
  it `wouldSeat`, its `standing` (`core|seated|benched|consulted|idle|off`), `lastIntent`, `spokeLast`, a full-mind
  view (mood/reads/lastSaid) that specialists omit, and a deterministic first-person `says` line.
- `inspect(vibe)` — the debug layer: the whole council ranked by relevance, the seated `room` (== `route`), a vibe
  summary. Computes the room once; never runs a deliberation.
- `address(text, vibe)` — the `/nation` parser: `/nation` → inspect, `/nation <id>` → that node's report, unknown
  id → an error + the known roster (never throws). Exposed on the army alongside `selfReport`/`inspect`.
- Last-turn state stashed additively in `deliberateIntents` (`state.lastRoom/lastIntents/lastWinner`) — new keys,
  decision path untouched.
- `harness-solo-nation-address.js` (21 pins): **purity** (a run drenched in inspect/address decides identically),
  honest standing, `says` reflects standing+relevance, inspect ranking, fringe surfacing, contributor omits the
  mind-view, `/nation` parsing, unknown-id.

### Honest finding
At small N, `route` **fail-opens to seat everyone**, so "seated" is *membership, not relevance*. The first `says`
draft conflated the two ("this reads like my moment (0)"); fixed so a seated-but-low-relevance node says it will
defer. The distinction is now explicit in both the report and the tests.

---

## 2026-06-16 — Vibe contract **v2** + first novel faculty `scene`

### Added
- **Vibe contract bumped to `v: 2`** — first growth of the frozen contract. New dimension **`narrative` ∈ [0,1]**:
  how much the turn reads as a roleplay/scene beat. Computed in `appraise()` from emote spans — strip `**bold**`,
  then count `*…*` spans, `clamp01(sat(emotes))`. `0` on ordinary chat (parity), saturates at 2+ emotes.
  - The bump is principled, not gratuitous: adding a key alone is allowed without a version bump
    (DESIGN-appraisal-chamber §3), but we also **widened the `tone` enum** (below), which is a contract change, so
    the version moves to 2 and the schema harness is updated in lock-step — exactly the discipline §3 prescribes.
  - Port note: the `/\*[^*]+\*/g` emote regex is **DSL-safe** (asterisks aren't brace/bracket constructs), so it
    survives the translation to the app's `nation.js` unchanged.
- **`tone` label `'scene'`** — derived, lowest non-neutral priority (`narrative ≥ 0.5 → 'scene'`, just above
  `neutral`). It can never mask a protective/affective label: crisis/hostile/tender/tense/warm/playful all win
  first, so a hurting user mid-scene still reads `tender`/`crisis`, not `scene`.
- **`scene` faculty** (opt-in, in `EXTRAS` — keeps the canonical *seven nations* identity intact). A **roleplay
  deliberator**: proposes `inhabit` (stay in-character, advance the beat). `relevance` is centered at `0.5` on a
  neutral vibe (parity), **rises with `narrative`**, and **yields to distress/tension** (drops below 0.5 when the
  user reads hurt or hostile) so the protective core takes the floor mid-scene. `TEMPER.scene` is enlivened by
  warmth/humor, damped by distress. Added to the dampen-only `modulate` table (backs off on
  vulnerability/tension), so it self-quiets before the veto even needs to fire — defense in depth.
- `harness-solo-scene.js` — pins: v2 schema (`narrative` present & in range, `v === 2`), narrative parity on plain
  chat, `**bold**` does **not** count as an emote, narrative rises on an emote turn, `scene` seated on a roleplay
  turn but benched on plain chat, **`scene` yields on a hurting roleplay turn** (relevance < 0.5, protective wins /
  guard holds, tone reads tender not scene), seven-identity preserved (NATIONS-only roster unaffected),
  determinism, modulate dampen.

### Changed
- `harness-solo-appraise.js` schema pin updated for v2: `KEYS` gains `narrative`; `v.v === 2`; `TONES` gains
  `scene`; `narrative` range-checked. (The sanctioned schema-harness update that accompanies a contract version
  bump.)

---

## 2026-06-16 — Adversarial hardening (untrusted-faculty surface)

A pressure-test of the full pipeline found three real vulnerabilities in the surface a *fleet* exposes — a
misbehaving or remote faculty. The design docs assume well-behaved faculties; this hardening is **above** the spec.

### Hardened
- **`relevanceOf` is now the single sanitized path.** A faculty whose `relevance` **threw** crashed the entire turn
  synchronously; one whose `relevance` returned out-of-range (e.g. `100`) broke the `[0.5×, 1.5×]` weight band; NaN
  /Infinity leaked into sorting and tallies. `relevanceOf` now: `try/catch → 0.5`, coerce `Number`, non-finite →
  `0.5`, clamp `[0,1]`. `selectContributors` routed through it too. Clamping in-range values is identity, so
  well-behaved faculties are unaffected (parity preserved).
- **Contributor `consult` gets a frozen `ctx` view** (`Object.freeze(Object.assign({}, ctx))`) — a contributor can
  read the turn but can no longer mutate it (e.g. inject an adversarial frame). The real `ctx` the deliberators
  vote over is untouched.
- `harness-solo-stress.js` — 17 invariant-under-attack pins codify the whole battery (never silent, core
  non-maskable, room odd & bounded, vibe frozen & in range, weight band intact, contributors can't crash/hang/sway/
  mutate, determinism with a bad faculty present). Confirmed already-robust (no fix needed): empty/contributor-only
  rosters → `no-minds`; `seatBudget:0` → core only; all-disabled → core seated & speaks; cue flood → vibe in range.

---

## 2026-06-15/16 — Scale-first cognitive pipeline (built on the appraisal + routing designs)

Hot path is now **appraise → route → consult contributors → strategize (relevance-weighted) → resolve.**

### Added
- **Appraisal Chamber** (`DESIGN-appraisal-chamber.md`): `appraise()` builds one frozen `vibe`
  (`safety/tension/vulnerability/warmth/sentiment/engagement/openness/tone/v`); pure helpers `sat/pos/neg/lift/
  toneOf/modulate`; `intend(ctx, vibe)` self-modulates before the veto; `decision.vibe` attached.
  `societySentiment`/`meanEngagement` scoped to **deliberators only** so contributors never sway the feeling read.
- **Routing Layer v1** (`DESIGN-routing-layer.md`): faculty metadata (`kind/core/domain/relevance`, relevance
  centered at 0.5); `weightOf(id, vibe)` (band `[0.5×,1.5×]`, exact base on neutral, outside `resolve`);
  `route(vibe, ctx)` (core always seated, top-K by relevance, bounded by `seatBudget` cap 9, fail-open, pure, odd/
  tie-safe, never empty); wired as `var live = route(...)`.
- **Contributor tier** (dormant): `kind:'contributor'`, `selectContributors`, `consultContributors` —
  each consulted behind `withTimeout` + a **mandatory null default**, material folds into `ctx`, contributors
  **never vote**. No contributor registered yet; tier exists and is tested before the first remote faculty.
- **`boundaries` faculty** (first opt-in `EXTRAS` deliberator): proposes `hold`, routes in on tension / negative
  sentiment, benched when calm. First proof that relevance-seating does real work (swaps with `play`).
- Harnesses: `harness-solo-appraise.js`, `-route.js`, `-contrib.js`, `-bound.js`.

### Verified (conformance audit, 2026-06-16)
Code **meets both designs at minimum**; the only gaps are doc *text* lagging the as-built code (see Deviations).
Parity proven numerically: every relevance returns exactly `0.5` on neutral → `weightOf@neutral === base`; `route`
at N=7 seats all seven (identity).

---

## 2026-06-15 — Bug fixes (verified against source, each test-pinned)

### Fixed
- **T1** `resolve` (brain.js): `vetoQuorum` now `(opts.vetoQuorum != null) ? … : 1` — `0` no longer coerced to `1`.
- **T2** `resolve`: proposals de-duplicated by author before tally (a faculty can't double-count itself).
- **T3** `gauge.open` (nation.js): a question still reads through a trailing `*action*`.
- **T4** `gauge.play`: strip `**bold**` before detecting a single `*action*` emote.
- **T5** `createCouncil` (brain.js): `reach` short-circuits on a mind already stalled this turn (`deadSet`), cutting
  repeat timeouts.

> These live in the **handoff** (`brain.js` T1/T2/T5, `nation.js` T3/T4). The shipping app `chloe-solo` does **not**
> yet have them — they port over with the pipeline.

---

## Deviations from design intent (standing — translate the *port* from these, not the doc text)

| # | Doc | Doc says | As-built | Why |
|---|-----|----------|----------|-----|
| 1 | appraisal §4 | `appraise(ctx)` reads `ctx.turn.text` | `appraise()` reads `state.lastUserText` | `ctx` is `{}` at the call site; `perceive` stashes the text first |
| 2 | appraisal §5 | dampen play/voice **and lift** heart/conscience | **dampen-only** (`lift` helper kept, reserved) | lifting flipped the supportive winner / broke the "conscience holds the floor" pin |
| 3 | appraisal §6 | `m.veto(p, vibe)` | `m.veto(p)` | doc called it optional/behavior-preserving; the vibe encodes the same guard trigger |
| 4 | appraisal §8 | a `route`-stub forward-guard test | none | superseded — `route` is real, with its own harness |
| 5 | routing §6 | `route(minds, vibe, ctx)` | `route(vibe, ctx)` (closure `minds`) | functionally identical; `odden`/`coreOrOn` were pseudocode, implemented inline |

Refinement beyond the docs (conformant): sentiment/engagement scoped to **deliberators**, so contributors can't
move the feeling read (routing §8: "the vibe stays authoritative").

Out of these docs' scope: `deliberate(candidates, ctx)` — the candidate-reply-**ranking** path (distinct from
`deliberateIntents`) — still uses base `weightOf(id)` with no vibe. A future consistency item, not a divergence.

---

## Roster (current)

- **Core deliberators** (non-maskable, always seated): `heart`, `instinct`, `conscience`.
- **Strategist deliberators** (routed/weighted): `reason`, `memory`, `voice`, `play`.
- **`EXTRAS`** (opt-in): `boundaries` (proposes `hold`), `scene` (proposes `inhabit`).
- **Contributors**: tier built, none registered yet.
- Exports: `{ NATIONS, EXTRAS, createArmy, gauge, modulate, toneOf }`. Vibe contract: **v2**.
