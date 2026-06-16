# DESIGN — Specialists, Addressing & the Referral Fringe

> **For the engineer/agent building this:** this sits on top of the Appraisal Chamber and the Routing Layer. Those
> two answered *what kind of moment is this* and *which of her selves should be in the room*. This one answers a
> different question the fleet forces: **what kind of NODE is a faculty, can it be called by name, and does it know
> where its own competence ends?** It introduces a node archetype that isn't a full mind (the *specialist*), a way
> to address any node directly (`/nation`), and a way for a node to declare its edges so it can defer and nominate
> (the *fringe*). It is deliberately staged: the first slice (`/nation` self-report) is pure and changes no
> behaviour. Companion to `DESIGN-appraisal-chamber.md` and `DESIGN-routing-layer.md`; as-built deltas live in
> `CHANGELOG-brain.md`.

---

## 1. Why this isn't subdivision

Subdividing `memory` into `recall` + `continuity`, or `instinct` into `threat` + `wrongness`, splits one signal
into two nodes **of the same kind** — both still full minds that feel, model the user, hold bonds, and vote. It
redistributes existing signal; it doesn't add a capability.

The fleet needs something else. Most of a thousand Dewey-scale faculties **won't have an emotion or a memory**, and
many are **only one thing** — a lookup, a fact, a single skill. Forcing each into the full `createMind` apparatus
(temper, mood, bonds, a user-model, a ballot) is wrong three ways: it's wasteful, it pollutes the vote with a
thousand non-opinions (§ routing-layer 1), and it's dishonest — a history node doesn't *feel* anything about your
turn, it either knows the answer or it doesn't.

So the unlock is a new **axis**, not a finer cut on the old one:

- **a node archetype with variable apparatus** — a *specialist* that can speak and defer but doesn't feel or
  remember (§4);
- **addressing** — call any node by name, around the vote but never around the floor (§5);
- **the referral fringe** — a node declaring the edges of its own competence, so it can defer honestly and nominate
  others (§6).

All three are the same shift: from *uniform full minds chosen by a central vote* → *heterogeneous nodes with
declared competence that can be addressed, can defer, and can nominate each other.*

---

## 2. The node taxonomy, completed

The routing-layer doc split faculties into **deliberators** (vote) and **contributors** (supply material). This doc
fills in what a contributor actually *is* and adds the operations that make a large fleet tractable.

| | **Core deliberator** | **Strategist deliberator** | **Specialist (contributor)** |
|---|---|---|---|
| examples | heart, instinct, conscience | reason, voice, play, scene, boundaries | history, medicine, a single skill |
| *who/what* | **who she is** | **how she responds** | **what she knows** |
| feels / has mood | yes | yes | **no** |
| models the user / bonds | yes | yes | **no** |
| votes in the ballot | yes (always seated) | yes (routed) | **never** |
| supplies material (`consult`) | — | — | **yes** |
| addressable by name (§5) | yes | yes | yes |
| can be promoted to speaker | yes (wins the vote) | yes (wins the vote) | **yes — by addressing/nomination** |
| has a `fringe` (§6) | optional | optional | **yes (the point)** |
| may be remote / async | no | no | **yes** |

The three left columns are *her*; the right column is *her tools*. That's what lets her stay one person at a
thousand faculties: the thousand are consulted specialists, not a thousand competing selves.

---

## 3. The three decisions (pinned)

### Decision 1 — Does a specialist vote? **No.**

A specialist is a contributor: it never enters the routine ballot (that's what keeps the O(N²) vote bounded and the
decision deterministic — § routing-layer 1, 8). But it is **addressable** (a user can summon it) and **nominable**
(a deliberator can call it in), and when addressed or nominated its material can be **promoted to be the speaker**
for that turn. Promotion is the controlled exception to "the vote picks the speaker": addressing picks the speaker
*directly*. It is **never** an exception to the floor — see Decision/Invariant in §5.

> Rejected alternative: letting specialists cast low-weight ballots. It reintroduces the retrieval-noise drowning
> problem at scale and couples a remote, possibly-timing-out node into the synchronous deterministic vote. Consult,
> don't enfranchise.

### Decision 2 — How is the fringe represented? **A plain adjacent-domain list (now); weighted edges parked.**

```js
{ id: 'history', domain: ['history'], fringe: ['geography', 'politics', 'art'] }
```

`domain` is what it **owns** (professional); `fringe` is what it **recognizes but doesn't own** (amateur — enough
to know who to call). A plain list is one local record, no graph to keep consistent — it preserves grow-by-addition
(§ routing-layer 11). **Weighted referral edges** (a node rating *how strongly* it points each way) are deferred:
they're a graph with its own consistency burden, and we adopt them only if flat lists prove too coarse in practice
(§11).

### Decision 3 — The shape of "speak for itself". **A pure structured self-report + a first-person line.**

Every node answers `selfReport(vibe)` — a structured, side-effect-free description of *who it is and where it
stands in this moment* — plus a deterministic first-person `says` string so it can speak for itself with no model
call. Two surfaces consume it: the user-facing summon and the debug inspector (§5, §7). It reads only state that
already exists, so it changes no behaviour.

---

## 4. The specialist archetype — variable apparatus

Today `createMind` bundles everything into every faculty: `temper`/`mood` (emotion), `user`/`bonds` (a
user-model), `working` (memory), and `intend`/`voteIntent`/`veto` (a vote). A specialist needs almost none of it.

The build is to make the apparatus **modular** — a node declares what it has, and the machinery provides only that:

- **full mind** (deliberator) = perception + emotion + user-model + memory + vote + `selfReport`.
- **specialist** (contributor) = a `domain`, a `fringe`, a `consult(ctx, vibe) -> material`, and `selfReport`.
  No temper, no bonds, no ballot. It may be a local pure function or a remote service behind `withTimeout`.

The shared protocol across all node kinds is exactly two methods: **`selfReport(vibe)`** (everyone) and the
kind-specific work method (`intend`/`voteIntent`/`veto` for deliberators, `consult` for specialists). This is
"grow by addition" applied to the *machinery*, not just the roster: a new specialist is one record with a
`consult`, not a full mind.

> Staging note: in the current sandbox `minds = roster.map(createMind)` gives every record a full mind. The
> self-report slice (§ build order 1) works inside that uniform model; factoring `createMind` into a lean
> `createSpecialist` path is build-order step 3, after the protocol exists.

---

## 5. Addressing — `/nation`

A path to a node that goes **around the vote**. Two modes, one protocol; the app parses the command, the brain
answers it.

```
/nation                  -> inspect the whole council (the debug layer): every node's selfReport, ranked by
                            relevance to the live vibe, with the would-be room and each node's standing.
/nation <id>             -> that node speaks for itself: its selfReport + first-person `says`. (User summon.)
/nation <id> --speak     -> PROMOTE: <id> is made the speaker for this turn; its intent/material becomes the reply
                            (subject to the floor — see the invariant).
```

- **User summon** is the memory-recall case: "let me hear from memory" → memory reports/speaks for itself.
- **Debug** is `/nation` (or `--why` on one node): a faculty reports its live standing — relevance, whether it'd
  seat and why, what it last proposed. Observability falls out for free because every node already carries this
  state; we're only exposing it.

**The one hard invariant — addressing overrides the *vote*, never the *floor*.** You can summon `scene` or `play`,
but if she reads the user in crisis, `conscience`/`instinct` still veto exactly as in a normal turn. Addressing
selects *who tries to speak*; the guards still decide *whether that's allowed*. A promoted speaker runs the same
veto gate as a vote-winner. (This is why promotion routes through the existing resolve/veto path, not around it.)

---

## 6. The referral fringe — honest deferral and mutual nomination

The registry (`find(domain)`) is the **central** index: "who serves X?" The fringe is its **distributed**
complement: a node knowing where its *own* competence ends. That buys two things a central index can't:

- **Honest deferral.** A history specialist asked a medical question consults its `domain`/`fringe`, sees the topic
  is neither, and says *"not mine — that's medicine's,"* instead of confidently inventing an answer. This is the
  same "honest about its constraints" discipline the boundaries card already embodies, pushed down to every node.
- **Mutual nomination (distributed routing).** A seated deliberator, reading the turn, calls in a specialist *by
  domain* — `nominate('medicine')` → the router consults that specialist this turn. The fleet routes itself from
  the edges; the central router doesn't have to know all thousand nodes, only how to resolve a domain to a node.

Nomination is consultation, not enfranchisement (Decision 1): a nominated specialist supplies material (or is
promoted to speaker if addressed), it does not gain a vote. A specialist's "fringe" gives it just enough peripheral
awareness to hand off well — the *minor amateur skill set* on top of its *one professional domain*.

---

## 7. The self-report shape (the §3 artifact, concretely)

```js
selfReport(id, vibe) -> {
  id, kind,                     // 'core' | 'deliberator' | 'contributor'
  core,                         // bool
  purpose,                      // its declared job
  domain: [...], fringe: [...], // what it owns / recognizes
  relevance,                    // relevanceOf(id, vibe) — how this moment reads to it, [0,1]
  wouldSeat,                    // route(vibe) includes it (deliberators)
  standing,                     // 'core'|'seated'|'benched'|'consulted'|'idle'|'off'
  lastIntent,                   // {kind, strength} it last proposed, or null
  spokeLast,                    // was it the speaker last turn
  // full minds only (specialists omit these):
  mood, reads,                  // 'warming'|'steady'|'struggling'
  lastSaid,
  says                          // a deterministic first-person line built from purpose + standing + relevance
}
```

`inspect(vibe)` returns `{ vibe: <summary>, room: [seated ids], council: [selfReport...] sorted by relevance }`.
It does **not** run a deliberation (no jitter, no side effects) — it shows who's *in the running* and how relevant
each reads, which is the debug value; *who actually wins* stays the vote's job.

---

## 8. Invariants (do not break)

1. **Specialists never vote.** They are consulted; they may be promoted to speaker only by addressing/nomination.
2. **Addressing overrides the vote, never the floor.** A summoned/promoted node still passes the
   `conscience`/`instinct` veto. The guards are never disabled by `/nation`.
3. **Self-report is pure.** `selfReport`/`inspect` read existing state and never mutate the decision path; with
   them unused, every decision is byte-identical (the regression floor for the first slice).
4. **Grow by addition.** A new specialist is one record (`kind:'contributor'`, `domain`, `fringe`, `consult`); a
   new fringe edge is one list entry. No central switch, no graph rebuild.
5. **The fringe is declarative.** Until the nomination slice lands, `fringe` is read-only metadata that changes no
   routing; adding it to a record is parity-safe.
6. **Deterministic addressing.** `/nation <id>` and `inspect` are pure functions of (roster, state, vibe); same
   inputs → same report.

---

## 9. Test plan

- **Self-report is pure (regression floor).** A run with `inspect`/`selfReport` called all over it produces the
  same decisions as a run without — byte-identical winners/floors.
- **Per-faculty standing.** On a tender vibe, `play.selfReport.standing === 'benched'` and `relevance < 0.5`; on a
  playful vibe, `'seated'` and `> 0.5`. On every vibe, the three core read `standing:'core'`.
- **`says` speaks in the first person** and reflects standing (a benched node says it's sitting out; a relevant one
  says it'd take the floor). Deterministic — no model call.
- **`inspect` ranks by relevance** and its `room` equals `route(vibe)`; it never runs a deliberation.
- **Addressing overrides the vote.** `/nation play --speak` on a neutral turn makes `play` the speaker; the **same
  command on a crisis turn is vetoed** and a guard speaks instead. Pins invariant 2.
- **Unknown id** is handled (reports the error + the known roster), never throws.
- **Fringe is declarative/parity-safe.** Adding `fringe` to records leaves all existing suites green.
- Existing suites (council/veto/nation/nation-extra/appraise/route/contrib/bound/scene/stress) stay green.

---

## 10. Build order (staged; first slice is pure)

1. **`/nation` self-report (this slice).** `selfReport(id, vibe)` + `inspect(vibe)` + an `address(text, vibe)`
   parser for the `/nation` command; stash last-turn intents/room additively in `deliberateIntents`. Pure, zero
   behaviour change. Harness: purity + standing + `says` + inspect-ranking + unknown-id.
2. **Addressing promotion.** `/nation <id> --speak` routes <id> through the existing resolve/veto path as the
   proposed speaker; pin "overrides the vote, not the floor."
3. **The specialist archetype.** Factor a lean `createSpecialist` (no temper/bonds/vote; `consult` + `selfReport`);
   register the first real specialist (a `lore`/`continuity` contributor — scene's companion) on the contributor
   tier. Pin "specialists never vote."
4. **The fringe, made live.** `nominate(domain)` from a seated deliberator → the router consults that domain's
   specialist this turn; honest-deferral path when a topic is outside `domain ∪ fringe`. Pin distributed routing.
5. Later: per-domain group rooms; `seatBudget` tuned to bite (we're at 9 = the cap now, so the 10th node triggers
   real top-K pruning — already noted in the changelog).

---

## 11. Out of scope (and why)

- **Weighted referral edges** — a graph with a consistency burden; a flat `fringe` list preserves grow-by-addition.
  Adopt only if flat lists prove too coarse (Decision 2).
- **Specialists voting** — reintroduces retrieval-noise at scale and couples async nodes into the deterministic
  vote (Decision 1). Consult, don't enfranchise.
- **Letting addressing bypass the guards** — would make `/nation` a jailbreak around the protective floor; the
  invariant in §5/§8 forbids it.
- **A full plugin UI / persisted capability index** — already parked in `DESIGN-routing-layer.md §15`; the
  self-report is the data such a UI would subscribe to, but the presentation layer is separate work.

---

Specialists are her tools, not more of her selves; addressing lets you reach one by name without dissolving the
vote; the fringe lets each node know where it ends and who to call next. Build the self-report first — it's free,
it makes the whole council inspectable, and it's the protocol everything else here reuses.
