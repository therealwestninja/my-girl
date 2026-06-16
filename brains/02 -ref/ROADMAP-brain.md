# ROADMAP — the Brain

Where the cognitive pipeline stands and what's next. Companion to `CHANGELOG-brain.md` (as-built history + the
deviations-from-design table) and the three `docs/DESIGN-*.md`. Newest thinking at the top of each track.

> **One status line:** the full scale-first pipeline is **built and green in this handoff** (11 suites + parity).
> It is **not yet ported to the app** — `chloe-solo` is deliberately kept untouched ("anesthetized"). The port is
> the next big step and is a *translation*, not a copy (the app uses the browser `root.Chloe*` / `assemble.py`
> `__NATION__` pattern, not this package's Node UMD wrappers).

---

## Where we are (built & green, handoff only)

- Verified bug fixes **T1–T5** (each test-pinned).
- **Appraisal chamber** — `appraise → strategize`, one frozen `vibe`.
- **Routing layer v1** — faculty metadata (`kind/core/domain/relevance`), `weightOf(id, vibe)`, bounded `route`,
  `seatBudget`.
- **Contributor tier** — built dormant (consult behind `withTimeout` + mandatory default; never votes).
- **Vibe contract v2** — `narrative` dimension + `scene` tone.
- **First novel faculty `scene`** — opt-in roleplay deliberator that yields to distress.
- **Adversarial hardening** — `relevanceOf` sanitized; contributor `consult` gets a frozen ctx view.
- **`/nation` self-report (slice 1)** — `selfReport`/`inspect`/`address`, pure, zero behaviour change.

Roster: 7 `NATIONS` (heart, instinct, conscience [core]; reason, memory, voice, play) + `EXTRAS`
[boundaries, scene]. We are at **9 deliberators = the default `seatBudget` cap**, so the *10th* faculty is the
first to trigger real top-K pruning.

---

## NEXT — the port (un-anesthetize the app)

The pipeline **and** the five bug fixes live in this handoff only; `chloe-solo`'s `nation.js`/`brain.js` are behind.
Porting brings everything across at once. It's a translation: the app's `nation.js` is browser-pattern and assembled
via markers, so each construct is re-expressed, not pasted. Deliverable: a concrete port plan + the risk surface,
and a **checkpoint before editing production**. This is the single biggest queued item.

## Specialists / addressing / fringe (`docs/DESIGN-specialists-addressing-fringe.md`)

- **[DONE]** slice 1 — `/nation` self-report (pure observability).
- **[NEXT]** slice 2 — **addressing promotion:** `/nation <id> --speak` routes a named node through the existing
  resolve/veto path as the proposed speaker. Hard invariant: overrides the *vote*, never the *floor*.
- **[THEN]** slice 3 — **the specialist archetype:** factor a lean `createSpecialist` (no temper/bonds/vote;
  `consult` + `selfReport`), and register the first *real* contributor.
- **[THEN]** slice 4 — **the live fringe:** `nominate(domain)` from a seated deliberator consults that domain's
  specialist this turn; honest deferral when a topic is outside `domain ∪ fringe`.

## Faculty track

- **[OPEN]** `scene`'s contributor companion — a `lore`/`continuity` specialist, selected on the `narrative`
  dimension (sidesteps needing a topic classifier yet). Natural pairing for slice 3.
- **[OPEN]** further novel members / sub-divisions as domains demand them.
- **[PARKED]** a prose-RP signal for `narrative` beyond `*emotes*` (quotes, second-person) — noisier; emotes are
  the high-precision v2 signal.

## Guard tiers / defense-in-depth (more *layers*, not more triggers)

Principle: a few narrow guards each at a real trust boundary, every one cheap to verify — so the conservative veto
never turns trigger-happy and mutes her.

- **[NEXT, with the contributor tier] Ingestion gate (fail CLOSED).** Validate/filter contributor material *before*
  it reaches the model. Note the asymmetry: liveness guards fail **open** (a timed-out contributor → default,
  proceed); a **content** gate fails **closed** (suspect material dropped). Same fleet, opposite fail-modes.
- **[LATER] Appraisal-layer guard.** A single "re-appraise if the strategy pass stalls" hook (ties to the
  appraisal doc's no-backtracking limitation) — not a full feedback loop.
- **[LATER] Guard-tier overlap.** As the fleet grows, the guard tier itself wants overlap so no single faculty
  failing opens the gate. Non-maskable core + both conscience and instinct is the start.
- **[PARKED — instability risk] Meta-watcher.** A guard on cross-turn *trends* (veto-storms, sentiment tailspins,
  a contributor flooding every turn). Neighbours the deferred plasticity work; keep parked until a concrete
  failure points at it.

## Held bug-triage items (`docs/BRAIN-PATCH-PLAN.md`)

- **[HELD]** T6 — per-mind `user` redundancy refactor (verified; cosmetic/inert today).
- **[HELD]** T7 — peer spoken-text consistency.
- **[DESIGN CALL]** B1 — the clear/calm length cliff (the ~600-char gauge behaviour).
- **[DESIGN CALL]** B2 — the `'shared'` drive mapping.

## Consistency / cleanup

- **[OPEN]** `deliberate(candidates, ctx)` — the candidate-reply-**ranking** path — still uses base `weightOf(id)`
  with no vibe. A future consistency item (make it vibe-aware like `deliberateIntents`). *Not* a divergence — the
  design docs only ever spec'd the intent path — but a loose end.
- **[OPEN]** packaging cadence — keep `CHANGELOG-brain.md` and this roadmap current per slice; the zip folds tests
  + docs.

## Out of scope (standing — and why)

- **Weighted referral fringe edges** — a graph with a consistency burden; a flat `fringe` list preserves
  grow-by-addition. Adopt only if flat lists prove too coarse.
- **Specialists voting** — reintroduces retrieval-noise at scale and couples async nodes into the deterministic
  vote. Consult, don't enfranchise.
- **Addressing bypassing the guards** — would make `/nation` a jailbreak around the protective floor.
- **Plasticity / self-warping weights** — instability, worse with dynamic routing. Relevance is a pure function of
  the current vibe, not an accumulating weight.
- **Speculative prefetch** — optimizes the ~microsecond brain, not the ~second model/contributor latency.
