# DESIGN — The Routing Layer (built for scale)

> **For the engineer/agent building this:** this is a design, not a patch. It sits **on top of the Appraisal
> Chamber** (`DESIGN-appraisal-chamber.md`): it consumes the frozen `vibe` and turns it into a *seated room*. The
> declared end goal is **scale** — a large fleet of faculties (imagine one per knowledge subject, some running as
> remote servers) with this code as the backbone. So every seam here is judged twice: does it work at seven, and
> does it survive a thousand. The build is **staged** (the parity-safe slice ships first), but nothing in the
> staging may bake in a seven-faculty assumption that shatters at N-large. Synchronous, pure, deterministic,
> fail-open, parity-safe on day one. Companion to `DESIGN-council.md` and `DESIGN-appraisal-chamber.md`.

---

## 1. The end goal: a fleet, not a council of seven

Seven faculties is the seed, not the target. The target is a large, growing fleet — many specialized faculties,
some local and pure, some potentially remote services — with this Brain as the routing and arbitration backbone
others build on. That ambition sets the bar: **a backbone can't have hidden state, undocumented coupling, or
contracts that only hold at small N.** The discipline already in this codebase (a pure heart, frozen contracts,
harness-pinned invariants, a cold-start handoff) is exactly what infrastructure requires; this doc keeps it.

Two consequences shape everything below:

- **The vote is O(N²).** Every deliberator proposes and every deliberator scores every proposal. At seven that's
  ~49 trivial ops; at a thousand it's ~10⁶ per turn before `resolve` runs. The routing *tree* exists to cut N down
  to a small seated set **before** the vote, so `resolve`'s cost tracks the *seated-room* size, not the fleet size.
- **Not every faculty belongs in the ballot.** The council votes to arbitrate competing *intentions*. A history
  faculty and a math faculty don't disagree about intent — they *supply material*. A thousand of them casting
  ballots would drown the decision in retrieval noise. So scale forces a split in the node model (§2).

The staging still holds — ship the parity-safe weighting first (§7) — but we lay the scale seams (bounded-K,
the registry index, the contributor tier) now, dormant, so we never have to retread.

---

## 2. The shape that makes scale work: deliberators vs contributors

The single most important refinement for scale. Faculties divide into two kinds:

- **Deliberators** — they *vote on what to do*. Pure, local, synchronous, in the ballot. Subdivided into:
  - **Core deliberators** `{ instinct, conscience, heart }` — *who she is*. Always seated, non-routable, the
    appraisal/guard floor. Never dropped, never remote.
  - **Strategist deliberators** `{ reason, voice, play, memory, ... }` — routed and weighted by the vibe, but still
    local, pure, and in the ballot.
- **Contributors** — they *supply material*. Routed **in** on demand to inform the decision, but **never in the
  ballot**. They may be remote, async, and timeout-guarded. This is where the knowledge fleet lives — *what she
  knows*, consulted, not a thousand competing selves.

```
[ turn ] -> appraise -> vibe
                 |
                 v
   route(vibe, ctx):  (a) seat a bounded set of DELIBERATORS (core + top-K strategists)
                      (b) select which CONTRIBUTORS to consult (by domain/capability)
                 |
                 v
   consult contributors  --(async, withTimeout, mandatory default)-->  material -> ctx (additive context)
                 |
                 v
   deliberators propose / vote / veto over the enriched ctx  ->  resolve (pure)  ->  speaker + intent
```

`resolve` only ever sees **deliberator** ballots. Contributors feed `ctx`; deliberators decide how to use what came
back. This is the honest hierarchical tree: you route to *which subjects to consult*, they return facts, and a
small council decides. It also resolves the determinism tension a remote fleet raises — see §8.

---

## 3. The two seams on the hot path

The everyday path is `deliberateIntents` (sync, no bus). It exposes two seams.

```js
// today:
var live = minds.filter(function (m) { return isOn(m.self.id); });        // seam 1: membership
... jitter(m.voteIntent(p.intent, ctx) * weightOf(p.by)) ...              // seam 2: weight
```

Routing replaces these with vibe-aware versions that operate on **deliberators**:

```js
var live = route(minds, vibe, ctx);                                       // seam 1 -> the router (bounded)
... jitter(m.voteIntent(p.intent, ctx) * weightOf(p.by, vibe)) ...        // seam 2 -> relevance weight
```

Contributor consultation is a third step that happens **inside `route`/before the vote** and writes into `ctx`; it
is not one of these two ballot seams (contributors don't vote). See §8.

**Not the router:** the nervous-bus registry (`find`/`does`/`setState`/`register`) lives on the *async council*,
not the hot path. At seven it's a plugin nicety; at scale it *is* the router's **capability index** (§5, §8) — how
`route` discovers which contributors can serve a domain without enumerating the fleet. Sleep/standby stays the
council's liveness mechanism (`wakeStalled` reawakens sleepers), never a pruning lever. `resolve` stays pure.

---

## 4. The `vibe` it consumes

Unchanged from `DESIGN-appraisal-chamber.md`: `{ safety, tension, vulnerability, warmth, sentiment, engagement,
openness, tone, v }`. Read-only here (the vibe is frozen). `decision.vibe` is already attached each turn, giving the
router its input for this turn and as last-turn context.

---

## 5. Faculty metadata (what makes "grow by addition" safe at scale)

Each faculty record (`NATIONS`, today `{ id, purpose, lean }`) gains four optional fields. The router reads these;
it never hardcodes a roster, so adding a faculty — local or remote — is a single local record.

```js
{
  id: 'play',
  purpose: 'Keep it alive, curious, and human.',
  lean: { open: 1.0, play: 0.5 },                 // existing — the gauge lens
  kind: 'deliberator',                            // NEW: 'deliberator' (votes) | 'contributor' (supplies material)
  core: false,                                    // NEW: true = non-routable, always seated (deliberators only)
  domain: ['banter', 'roleplay'],                 // NEW: experiential/knowledge domains — the registry index key
  relevance: function (vibe) {                     // NEW: pure [0,1], CENTERED AT 0.5 on a neutral vibe
    return clamp01(0.5 + (vibe.warmth + vibe.openness) * 0.4 - (vibe.vulnerability + vibe.tension) * 0.6);
  }
}
```

Contract:

- **`kind`** — `'deliberator'` (default) or `'contributor'`. Only deliberators enter the ballot and `weightOf`.
  Contributors are consulted via §8. A contributor record may also carry `does: [{ name }]` (the bus capability
  list) so the registry can index it.
- **`core`** — `true` only for `{ instinct, conscience, heart }`; structurally always seated. Default `false`.
- **`domain`** — experiential domains for deliberators (`support`, `roleplay`, `lore`, `banter`, `meta`) and
  knowledge domains for contributors (the Dewey-style subjects). This is the key the router/registry selects on.
- **`relevance(vibe) -> [0,1]`** — for deliberators, drives weight and top-K seating; for contributors, drives
  whether to consult. **Must return ~0.5 on a neutral vibe** so weighting is parity-safe (§7). Default: constant
  `0.5`.

A record without the new fields is a non-core, general, neutral-relevance deliberator — exactly today.

---

## 6. `route(minds, vibe, ctx)` — choosing a *bounded* room

Pure, deterministic, fails open, always seats the core, and — for scale — **bounded**. Fail-open does NOT mean
"seat everyone" (a seven-faculty luxury that's fatal at a thousand); it means "core plus the **top-K** most
relevant strategists" — generous when unsure, never unbounded.

```js
function route(minds, vibe, ctx) {
  var deliberators = minds.filter(function (m) { return (m.kind || 'deliberator') === 'deliberator'; });
  var seated = [];
  deliberators.forEach(function (m) { if (m.core) seated.push(m); });                 // 1. the non-routable floor
  var pool = deliberators.filter(function (m) { return !m.core && isOn(m.self.id); }); // 2. routable, user-on
  pool.sort(function (a, b) {                                                          //    by relevance, desc
    return (b.relevance ? b.relevance(vibe) : 0.5) - (a.relevance ? a.relevance(vibe) : 0.5);
  });
  var K = seatBudget(deliberators.length);            // 3. bounded fan-in: small N -> all; large N -> top-K
  for (var i = 0; i < pool.length && seated.length < seated.length + K; i++) seated.push(pool[i]); // (top-K)
  if (seated.length % 2 === 0) seated = odden(seated, pool, vibe);                     // 4. odd / tie-safe
  return seated.length ? seated : deliberators.filter(coreOrOn);                       // 5. never empty
}
```

`seatBudget(n)` is the one scale knob: at small `n` it returns `n` (seat all — today's behaviour, parity), and as
`n` grows it caps at a bounded `K` (e.g. `min(n, 9)` or a configured ceiling). **The bounded path exists from v1**,
dormant while `n` is small; it never has to be retrofitted.

Invariants (the tests pin these, not specific rooms):

1. **Core always present** — `instinct`, `conscience`, `heart` are in every room; routing widens, never subtracts
   below the floor (the `conscience`/`instinct` veto needs them live).
2. **Bounded fan-in** — the seated set is `≤ |core| + K`; `resolve`'s cost tracks the seated set, not the fleet.
3. **Fail open** — unknown/neutral vibe → core + the top-K (at small N, everyone); over-inclusion's worst case is
   today's council; under-inclusion would silently drop a voice, so when unsure, seat more (up to the bound).
4. **Pure & deterministic** — no `now()`, no RNG, no mutation; same inputs → same room. (Ties in relevance break by
   stable faculty order.)
5. **Config wins** — a faculty the user turned off stays off (core excepted, structural).
6. **Odd / tie-safe, never empty, never silent** — preserved as today.

**v1 = fail-open identity:** with `seatBudget(7) === 7`, the room is unchanged. The machinery (core-pinning,
bounded loop, fallback) is in place and tested; the bound only bites once the roster grows.

---

## 7. `weightOf(id, vibe)` — the parity-safe v1 win, and the top-K score

Applies to **deliberators**. It scales the user's configured weight by a bounded relevance multiplier — louder when
relevant, quieter when not, never zero, and **exactly the configured weight on a neutral vibe**.

```js
function weightOf(id, vibe) {
  var base = (cfg.weights || {})[id]; base = (base == null) ? 1 : Number(base);
  if (!vibe) return base;                                   // old callers unchanged
  var m = mindOf(id), rel = (m && m.relevance) ? m.relevance(vibe) : 0.5;
  return base * (0.5 + rel);                                // rel 0.5 -> 1.0x (parity);  [0,1] -> [0.5x, 1.5x]
}
```

- **Parity floor:** every `relevance` returns `0.5` on a neutral vibe → `weightOf(id, neutralVibe) === base`. The
  change is invisible on flat turns.
- **The signal:** the same `relevance` that weights the vote also ranks the top-K seating in §6 — one function,
  two uses, no second source. The "competence matrix" lives here, in `weightOf`, **outside `resolve`**.

Ship this first: real value, fully parity-safe, no pruning required.

---

## 8. Contributors and the async tier (how the fleet plugs in without poisoning determinism)

A contributor is consulted, not voted. The flow, reusing machinery the async council already has:

1. **Select** — `route` asks the registry which contributors serve the turn's domain(s):
   `nervous.find('history')`, `nervous.find('lore')`. At scale this index is load-bearing — it's how the router
   avoids enumerating the fleet.
2. **Consult** — each selected contributor is invoked behind **`withTimeout(call, ms, DEFAULT, sched)`** with a
   **mandatory default** (empty contribution). The council was built for exactly this: "the node didn't answer in
   time → take the default, move on." A remote, networked, non-deterministic service is fine here because a timeout
   yields a defined empty result and the decision proceeds.
3. **Fold** — returned material is written into `ctx` (e.g. `ctx.material`), additive context the deliberators may
   read. It is **never** a second source of truth for who feels what — the `vibe` stays authoritative.
4. **Decide** — core + seated strategist deliberators propose/vote/veto over the enriched `ctx` → `resolve`. The
   ballot contains only deliberators; contributors influence *content*, not the *vote*.

So: **deliberators stay pure, local, synchronous; contributors may be remote, async, timeout-guarded.** Two
execution models, one `resolve`. The determinism of the *decision* is preserved because the only async part is
retrieval, and retrieval is timeout-bounded to a default — the same discipline that already keeps a stalled council
member from hanging a turn.

(The synchronous hot path stays the deliberator path. The contributor tier is the async council's domain — which is
why the bus registry, not the hot-path router, is where contributors register and are discovered.)

---

## 9. Group spaces (faculties handling a beat together)

A "group space" is a routed sub-room sharing the frozen `vibe`. At scale, a group is a **small deliberator core +
routed contributors** for the beat: a roleplay scene seats `{ scene, voice, play } ∪ core` as deliberators and
consults `{ lore, continuity, the relevant subject contributors }` for material. The group decides through the same
`resolve` on the same `vibe` — no second decision path, the protective core in every group. Domain material rides
`ctx` (`ctx.scene`, `ctx.material`) as additive context; the vibe remains the authoritative read of feeling.

---

## 10. Taxonomy — who she is vs what she knows

- **Deliberators are experiential** — `support`, `roleplay`, `banter`, `meta`. The core `{ heart, conscience,
  instinct }` is *who she is*: always seated. Strategists shape *how* she responds.
- **Contributors are knowledge** — the Dewey-style fleet, *what she knows*: routed in, consulted, never voting.

This is what lets her stay herself at a thousand faculties: the thousand are tools she consults, not a thousand
competing selves. The core/strategist/contributor tiers are the mechanism, not a slogan.

---

## 11. Invariants (consolidated)

1. Core `{ instinct, conscience, heart }` always seated; routing widens, never subtracts below it.
2. The `conscience`/`instinct` veto floor is always live (follows from 1).
3. Only **deliberators** vote; **contributors** never enter the ballot.
4. **Bounded fan-in:** the seated deliberator set is `≤ |core| + K`; `resolve` cost tracks the seated set, not the
   fleet.
5. `route` and `weightOf(vibe)` are pure and deterministic; the `vibe` is read-only.
6. **Fail open is bounded:** unknown/neutral → core + top-K (at small N, everyone); never unbounded, never below
   core.
7. `resolve` stays pure and weight-blind; all weighting is in `weightOf`.
8. **Contributors are off the deterministic vote path:** consulted async behind `withTimeout` + a mandatory
   default; a timeout yields an empty contribution and the decision proceeds. Deliberators stay pure/sync.
9. No sleep-based pruning; routing selects a member set. User config is honoured (core excepted).
10. Odd / tie-safe; never empty; never silent.
11. Grow by addition: a new faculty (deliberator or contributor) is one record with
    `kind`/`core`/`domain`/`relevance`; no central switch.

---

## 12. Test plan — `harness-solo-route.js` (pin invariants, including scale)

- **Core always seated** across crisis/hostile/warm/neutral, even with config disabling them.
- **Fail-open parity (small N).** Neutral vibe → `route` returns every on deliberator; `weightOf(id, neutralVibe)
  === weightOf(id)` for all. The regression floor.
- **Relevance shifts weight, not membership (v1).** Tense vibe → `weightOf('play', vibe) < weightOf('play')`, play
  still seated; warm → `>`. Nobody dropped.
- **Bounded fan-in (scale).** Inject a synthetic roster of, say, 30 strategist deliberators; assert
  `route(...).length <= core + K`, the room is odd, and the core is present. Pins that the bound works *before* the
  fleet exists.
- **Top-K picks the relevant.** With many faculties, on a given vibe the seated strategists are the K highest by
  `relevance(vibe)` — deterministically.
- **Contributors never vote.** A registered `kind:'contributor'` faculty is consulted (its material lands in `ctx`)
  but never appears in `decision.transcript.ballots`/`participation`.
- **Contributor timeout → default, decision proceeds.** A contributor that never resolves yields an empty
  contribution within the timeout and the turn still decides (mandatory-default discipline).
- **Determinism.** Same vibe → same room, same weights, same decision.
- **Add-a-faculty-no-regress.** A new non-core faculty leaves neutral-vibe decisions unchanged and only gains
  weight/seating on its domain's vibe.
- Existing suites (council/veto/nation/nation-extra/appraise) stay green — additive.

---

## 13. Migration / build order (staged, scale-seams dormant from v1)

1. Add `kind`/`core`/`domain`/`relevance` to `NATIONS`; `core:true` on `instinct`/`conscience`/`heart`; relevance
   centered at 0.5. (Defaults cover untouched records.)
2. **Ship `weightOf(id, vibe)`** (the v1 win) + thread `vibe` into the ballot call. Parity test first.
3. **Ship `route`** as bounded fail-open with `seatBudget(7) === 7` (identity at current N); wire `var live =
   route(minds, vibe, ctx)`. Pin core-always + bounded-fan-in (with a synthetic large roster) now, so the bound is
   proven before it's needed.
4. Write `harness-solo-route.js` (§12); keep all suites green. No `brain.js` rebuild (nation-layer).
5. **Lay the contributor seam dormant:** define `kind:'contributor'`, the `route`→registry→consult→`ctx` path, and
   the `withTimeout`+default consultation on the async council — even with zero contributors registered — so the
   tier exists and is tested before the first remote faculty arrives.
6. Then, as the fleet grows: real contributors (registered on the bus, discovered by `find`), per-domain group
   rooms, and `seatBudget` tuned to bite.

---

## 14. Out of scope (and why)

- **Plasticity / self-warping weights** — instability, worse with dynamic membership. Relevance is a *pure function
  of the current vibe*, not an accumulating weight. Keep it pure.
- **Speculative prefetch** — optimizes the microsecond brain, not the model/contributor latency. No win.
- **Async on the *deliberator* path** — breaks determinism. Async belongs to the *contributor* tier only (§8).
- **Building the actual fleet** — this doc defines the router, the metadata, and the two tiers faculties plug into;
  designing the first real specialized faculty (deliberator) and the first contributor is the next step, written
  against these contracts.

---

## 15. Parked for future-us (not now)

A reactive **plugin UI** on top of this: abilities/contributors lazy-load on start and "ready up" in the interface
as they come online, and the app keeps a **persisted capability index** so startup doesn't re-probe every plugin's
ready-state on each reload. This rides existing seams — the index *is* the bus registry (`find`/`does`); a
not-yet-ready ability *is* a contributor that times out to its default (§8), so the brain never blocks on a
half-loaded fleet and the UI just subscribes to readiness. **One discipline to remember when we build it:** the
cached index is *optimistic*, not ground truth — render cached capabilities instantly, then reconcile each
ready-state in the background and update the UI reactively; a stale-but-dead plugin simply times out to its default.
Cache for speed, reconcile for truth. (Presentation-layer + persistence work; no change to the pure decision path.)

---

Routing is the room; the vibe is the read it stands on; `resolve` is the judge underneath. Build the weighting
first (parity-safe, real value), keep the core non-routable, bound the fan-in from day one, let contributors inform
without voting, and let the fleet grow one safe record at a time.
