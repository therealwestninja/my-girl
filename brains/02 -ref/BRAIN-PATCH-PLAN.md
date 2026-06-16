# Brain Patch Plan — two code reviews, triaged and verified

> **STATUS — 2026-06-16: Tasks 1–5 LANDED** in `brain-handoff/` (and the shipped `brain.min.js`), each pinned by a
> test; `npm test` + `npm run parity` all green. Held (not bugs): **Task 6** (per-mind `user` redundancy refactor)
> and **Task 7** (peer spoken-text consistency) — verified but cosmetic/inert today, awaiting a go-ahead.
> Deferred design calls: **B1** (clear/calm length cliff) and **B2** (`'shared'` drive mapping). See the README
> Patch log in the handoff package for the per-task summary.


> **For the engineer/agent executing this:** every claim below was checked against the actual source before being
> planned. Where a review's *fix* was wrong or its *diagnosis* overstated, the corrected version is in the task.
> Work top-to-bottom; tiers are ordered by certainty and value. This package has no git — "validate" steps replace
> "commit" steps. Steps use `- [ ]` for tracking.

**Goal:** Apply the genuinely-correct fixes from the two reviews to `brain.js` / `nation.js`, with a test pinning
each, while rejecting the non-issues and surfacing the two items that are actually design decisions, not bugs.

**Architecture:** The Brain is pure, deterministic, DOM/network-free. `brain.js` is the resolver/Society; `nation.js`
is the Seven Nations above it (injected `brain`). Tests are plain-Node harnesses that print `ALL GREEN`. Any
`brain.js` change must be followed by `bash build-brain.sh` + a parity run against `brain.min.js`.

**Tech stack:** Node ≥14, terser (build only). Validation commands: `npm test` (4 source suites), `npm run parity`
(resolver+veto vs `brain.min.js`), `node harness-solo-<name>.js` (one suite), `bash build-brain.sh` (rebuild).

---

## Triage — what survived verification

| # | Review claim | Verdict | Why (verified against source) |
|---|---|---|---|
| A1 | `vetoQuorum \|\| 1` coerces `0`→`1` (brain.js) | **VALID, fix** | Confirmed line 62. `0` is meaningful (all-contested). Trivial `!= null`. |
| A2 | Tally double-counts duplicate `by` ids (brain.js) | **VALID, fix** | `eligible` can hold two `{by:'x'}` (seed + member); `tally['x'] += s` runs twice. Real footgun for the documented `seed` feature. |
| A3 | `open` regex misses a question before a `*action*` (nation.js) | **VALID bug, fix is wrong** | `/\?\s*$/` confirmed. But the reviewer's `/\?[^\w]*$/` and "last quarter" both FAIL the reviewer's own example (`*smiles warmly*` has word chars after `?`). Corrected fix below. |
| A4 | `play` regex flags `**bold**` as an action (nation.js) | **VALID bug, fix has compat risk** | `/\*[^*]+\*/` matches the inner `*…*` of `**bold**`. Reviewer's lookbehind fix risks old-browser breakage; use strip-bold-first. |
| A5 | Stalled member times out **3×** per round (brain.js) | **VALID issue, magnitude wrong** | Vote+veto run in **parallel** (`Promise.all(votePs.concat(vetoPs))`), so it's **2× not 3×**. Blacklisting after propose cuts it to ~1×. Only affects the async-member council path (`/council`,`/society`); the everyday nation path is synchronous and never hits this. |
| A6 | 7 identical per-mind `user` objects (nation.js) | **VALID redundancy, careful refactor** | `perceive`'s nudge is mind-independent → all 7 `user.sentiment` evolve identically; `societySentiment` averages identical numbers. Hoist to one shared object — but the update must run **once**, not 7×, or the EWMA math changes. |
| A7 | Peers don't record what was just said (nation.js) | **REAL asymmetry, impact overstated** | Confirmed peers get `react()` but not a `working` push. But `intend`/`veto` only read the last turn / last *user* turn (both present regardless), so **no current decision changes**. Worth fixing for consistency/future-proofing, not the "massive bug" billed. |
| B1 | `clear`/`calm` cliff at 600 chars (nation.js) | **REAL discontinuity, but TUNING** | Confirmed `len>600?0.3` / `len>600?0.2`. Smoothing changes the length-scoring curve (a behavioral choice). Recommend a curve; needs your sign-off. Candidate-path only. |
| B2 | `'shared'` drive forces "adversarial/commanding" (nation.js) | **DESIGN CALL, diagnosis wrong** | `'shared'` produces `press`/`drive` (initiative), **not** `oppose`/`command` — those require `adversary`/`commands`. It is not adversarial. Whether `'shared'` should let her co-lead is a design decision, not a bug. |
| — | `withTimeout` timer leak (prior review) | **REJECTED** | Already cleared in both resolve handlers; no change. (Listed for completeness.) |

---

## Part A — Patches to implement (TDD, full code)

### Task 1: Respect an explicit `vetoQuorum: 0` (A1)

**Files:** Modify `brain.js` (`resolve`, line ~62); Test `harness-solo-council.js`.

- [ ] **Step 1 — failing test** (add near the other `resolve` cases in `harness-solo-council.js`):
```js
// vetoQuorum 0 is a real value (every proposal blocked -> contested), not a falsy to coerce back to 1
var dq = C.resolve(
  [{ by: 'a', text: 'A', conf: .5 }, { by: 'b', text: 'B', conf: .5 }],
  [{ voter: 'c', scores: { a: .9, b: .1 } }],
  [{ by: 'c', against: 'a', reason: 'x' }], { vetoQuorum: 0 });
ok(dq.status === 'contested', 'vetoQuorum:0 is honored (not coerced to 1): with a 0 threshold every proposal is blocked -> contested');
```
- [ ] **Step 2 — run, expect FAIL:** `node harness-solo-council.js` → the new line FAILs (status is `carried`, because `0` was coerced to `1` and only `a` got blocked).
- [ ] **Step 3 — implement** in `brain.js`, change the quorum default:
```js
var allowSelf = !!opts.allowSelfVote, vetoQuorum = (opts.vetoQuorum != null) ? opts.vetoQuorum : 1;
```
- [ ] **Step 4 — run, expect PASS:** `node harness-solo-council.js` → `ALL GREEN`.
- [ ] **Step 5 — validate (brain.js changed):** `bash build-brain.sh` then `npm run parity` → both `ALL GREEN`.

---

### Task 2: De-duplicate proposers in `resolve` (A2)

**Files:** Modify `brain.js` (`resolve`, right after the existing proposals filter, line ~60); Test `harness-solo-council.js`.

- [ ] **Step 1 — failing test:**
```js
// a seed and a member can share an id; the cross-vote must count that voice ONCE, not twice
var dd = C.resolve(
  [{ by: 'x', text: 'X1', conf: .5 }, { by: 'x', text: 'X2', conf: .9 }, { by: 'y', text: 'Y', conf: .5 }],
  [{ voter: 'y', scores: { x: .4, y: .1 } }], [], {});
ok(dd.tally.x === 0.4, 'a duplicate proposer id is collapsed: tally counts the voter once (0.4), not doubled (0.8)');
ok(dd.winnerId === 'x' && dd.text === 'X1', 'the first proposal for that id is kept');
```
- [ ] **Step 2 — run, expect FAIL:** `tally.x` is `0.8` (double-counted).
- [ ] **Step 3 — implement** in `brain.js`, immediately after `proposals = (proposals || []).filter(function (p) { return p && p.by != null; });`:
```js
// a proposer appears at most once. If a seed and a member (or two seeds) share an id, keep the first —
// otherwise the cross-vote tallies that voice twice and silently doubles its weight.
var seenBy = {}; proposals = proposals.filter(function (p) { if (seenBy[p.by]) return false; seenBy[p.by] = true; return true; });
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — validate:** `bash build-brain.sh` + `npm run parity` → `ALL GREEN`.

---

### Task 3: `open` recognizes a question before a trailing action/emoji (A3)

**Files:** Modify `nation.js` (`gauge`, `open:` line ~ in the `f` object); Test `harness-solo-nation.js`.

> The reviewer's `/\?[^\w]*$/` fails the very example given (`*smiles warmly*` contains word chars after the `?`).
> Correct approach: drop `*action*` spans first, then accept a `?` followed only by non-word decoration.

- [ ] **Step 1 — failing test** (`gauge(text, {open:1})` isolates the `open` trait):
```js
ok(N.gauge('How are you feeling? *smiles warmly*', { open: 1 }) === 1, 'a question before a *roleplay action* still reads as open (the real bug)');
ok(N.gauge('How are you feeling?', { open: 1 }) === 1, 'a plain trailing question still reads as open');
ok(N.gauge('Are you ok? 🙂', { open: 1 }) === 1, 'a trailing emoji does not hide the question');
ok(N.gauge('I am here with you. *holds your hand*', { open: 1 }) === 0, 'a statement plus an action is not open');
```
- [ ] **Step 2 — run, expect FAIL:** the action/emoji cases return `0`.
- [ ] **Step 3 — implement** in `nation.js`, replace the `open:` line inside `gauge`'s `f`:
```js
      open:  (function () { var s = String(t).replace(/\*[^*]+\*/g, ' '); return /\?[^\w]*$/.test(s) ? 1 : 0; })(),
```
- [ ] **Step 4 — run, expect PASS:** `node harness-solo-nation.js` → `ALL GREEN`.
- [ ] **Step 5 — validate:** `npm test` → all four suites `ALL GREEN`. (nation.js isn't compiled; no parity rebuild needed.)

---

### Task 4: `play` ignores `**bold**` markdown (A4)

**Files:** Modify `nation.js` (`gauge`, `play:` line); Test `harness-solo-nation.js`.

> The reviewer's lookbehind regex can throw on older browsers (Perchance targets a wide range). Strip `**bold**`
> spans first, then look for a single-asterisk action — no lookarounds.

- [ ] **Step 1 — failing test:**
```js
ok(N.gauge('*smiles softly*', { play: 1 }) === 1, 'a *roleplay action* reads as play');
ok(N.gauge('**This is very serious**', { play: 1 }) === 0, '**bold** markdown is NOT misread as a playful action');
ok(N.gauge('**emphasis** and then *winks*', { play: 1 }) === 1, 'a real action still counts even alongside bold');
```
- [ ] **Step 2 — run, expect FAIL:** the `**bold**` case returns `1`.
- [ ] **Step 3 — implement** in `nation.js`, replace the `play:` line inside `gauge`'s `f`:
```js
      play:  (function () { var s = String(t).replace(/\*\*[^*]+\*\*/g, ' '); return /\*[^*]+\*/.test(s) ? 1 : 0; })(),
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — validate:** `npm test` → `ALL GREEN`.

---

### Task 5: Blacklist a stalled member for the rest of the round (A5)

**Files:** Modify `brain.js` (`reach` + `deliberate` in `createCouncil`); Test `harness-solo-council.js`.

> Corrects the magnitude: it's 2× (propose, then vote∥veto), not 3×. Marking a member dead after a propose
> timeout makes vote/veto return their fallbacks immediately, cutting a stalled round to ~1× timeout. Mandatory
> participation is preserved (the dead member still contributes a default vote). `deadSet` is optional, so any
> caller not passing it behaves exactly as before.

- [ ] **Step 1 — failing test** (async; add to the council harness's promise chain):
```js
// a member whose propose never resolves must NOT be re-asked to vote/veto (no repeated timeout waits)
var calls = { propose: 0, vote: 0, veto: 0 };
var ghost = C.member('ghost', 'x', {
  propose: function () { calls.propose++; return new Promise(function () {}); },   // never resolves -> times out
  vote: function () { calls.vote++; return 0.5; }, veto: function () { calls.veto++; return { veto: false }; } });
var liveA = C.member('liveA', 'y', { propose: function () { return { text: 'hi', conf: .5 }; }, vote: function () { return .5; }, veto: function () { return { veto: false }; } });
var liveB = C.member('liveB', 'z', { propose: function () { return null; }, vote: function () { return .5; }, veto: function () { return { veto: false }; } });
return C.createCouncil({ members: [ghost, liveA, liveB], timeoutMs: 10 }).deliberate({}).then(function (dg) {
  ok(dg.participation.indexOf('ghost') >= 0, 'a stalled member still participates with a default vote (mandatory participation preserved)');
  ok(calls.vote === 0 && calls.veto === 0, 'after a propose timeout the stalled member is not re-asked to vote/veto (round no longer pays the timeout twice)');
});
```
- [ ] **Step 2 — run, expect FAIL:** `calls.vote`/`calls.veto` are `> 0` today.
- [ ] **Step 3 — implement** in `brain.js`. Give `reach` an optional `deadSet`:
```js
    function reach(m, type, proposal, ctx, fallback, deadSet) {         // bus or direct; always times out cleanly
      if (deadSet && deadSet[m.id]) return Promise.resolve(fallback);   // stalled earlier this round — don't wait again
      var call = nervous ? Promise.resolve(nervous.ask(m.id, { type: type, proposal: proposal, ctx: ctx }))
                         : Promise.resolve(type === 'propose' ? m.propose(ctx) : type === 'vote' ? m.vote(proposal, ctx) : m.veto(proposal, ctx));
      return withTimeout(call, timeoutMs, fallback, sched).then(function (res) {
        if (res.__timeout) { if (nervous) nervous.sleep(m.id); if (deadSet) deadSet[m.id] = true; }   // mark dead for the round
        else lastSeen[m.id] = now();
        return res.value;
      });
    }
```
Then in `deliberate`, create `var dead = {};` after `wakeStalled();` and thread it through all three phases:
```js
    function deliberate(ctx, seed) {
      wakeStalled();
      var dead = {};
      return Promise.all(members.map(function (m) {
        return reach(m, 'propose', null, ctx, null, dead).then(function (r) { return { by: m.id, r: r }; });
      })).then(function (props) {
        var proposals = (seed || []).slice().concat(props.map(function (x) { var r = x.r; return (r && r.text != null) ? { by: x.by, text: String(r.text), conf: Number(r.conf) || 0 } : null; }).filter(Boolean));
        if (!proposals.length) return { status: 'no-proposals', text: null, winnerId: null, transcript: { proposals: [], ballots: [], vetoes: [] }, participation: members.map(function (m) { return m.id; }) };
        var ballots = [], vetoes = [];
        var votePs = members.map(function (m) {
          var scores = {};
          return Promise.all(proposals.map(function (p) {
            return reach(m, 'vote', p, ctx, DEFAULT_SCORE, dead).then(function (s) { scores[p.by] = (typeof s === 'number' && isFinite(s)) ? s : DEFAULT_SCORE; });
          })).then(function () { ballots.push({ voter: m.id, scores: scores }); });
        });
        var vetoPs = members.map(function (m) {
          return Promise.all(proposals.map(function (p) {
            return reach(m, 'veto', p, ctx, { veto: false }, dead).then(function (vr) { if (vr && vr.veto) vetoes.push({ by: m.id, against: p.by, reason: vr.reason || '' }); });
          }));
        });
        return Promise.all(votePs.concat(vetoPs)).then(function () {
          var decision = resolve(proposals, ballots, vetoes, opts);
          decision.transcript = { proposals: proposals, ballots: ballots, vetoes: vetoes };
          decision.participation = ballots.map(function (b) { return b.voter; });
          return decision;
        });
      });
    }
```
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — validate:** `bash build-brain.sh` + `npm run parity` → `ALL GREEN`.

---

### Task 6: One Society-level user model instead of seven identical copies (A6)

**Files:** Modify `nation.js` (`createMind`, the army-level `perceive`, `societySentiment`, `setUserDescription`, and where minds are constructed); Test `harness-solo-nation.js`.

> No behavioral change is intended. The key risk is the EWMA update: today each of the 7 minds applies *one*
> update to its *own* user, so all land on the same value. After hoisting, the shared user must be updated
> **exactly once per turn** — do NOT leave the update inside `mind.perceive` (that would apply it 7× and change the
> math). Per-mind `bonds` stay per-mind; only `user` is shared.

- [ ] **Step 1 — failing/guard test** (pins the post-refactor contract):
```js
var hv = N.createArmy({ config: {} });
for (var hi = 0; hi < 4; hi++) hv.perceive({ who: 'You', role: 'user', text: 'i feel awful', valence: -0.8 });
var s1 = hv.mindOf('heart').user, s2 = hv.mindOf('reason').user;
ok(s1 === s2, 'all faculties share ONE user model (same object reference), not seven copies');
ok(s1.sentiment < 0, 'the shared user sentiment moved with the negative turns');
ok(hv.mindOf('heart').bonds !== hv.mindOf('reason').bonds, 'bonds stay per-mind (only the user model is shared)');
```
- [ ] **Step 2 — run, expect FAIL:** `s1 === s2` is false today (separate objects).
- [ ] **Step 3 — implement** in `nation.js`:
  1. In `createArmy`, before minds are built, add the shared model:
```js
    var societyUser = { description: '', sentiment: 0, engagement: 0, lastSaid: null };
```
  2. Build minds with it (find the `roster.map`/`createMind(` construction and pass it):
```js
    var minds = roster.map(function (n) { return createMind(n, societyUser); });
```
  3. Change `createMind`'s signature and drop its private `user`, using the passed one:
```js
  function createMind(nation, user) {                 // `user` is the Society-shared model (single source of truth)
    var temper = TEMPER[nation.id] || {};
    var self = { id: nation.id, purpose: nation.purpose, persona: null, mood: 0.5, lastSaid: null };
    var working = [];
    var bonds = {};
    // (no local `var user = …` — it now comes in shared)
```
  4. In `mind.perceive`, REMOVE the user-update block, keeping only memory + cues:
```js
    function perceive(turn) {
      remember(turn);
      return read(turn.text);   // the shared user model is updated once at the Society level (see army.perceive)
    }
```
  5. In `createArmy`'s `perceive`, update the shared model **once** per turn (replicating the exact old EWMA):
```js
    function perceive(turn) {
      if (!turn || turn.text == null) return null;
      var reactions = [];
      minds.forEach(function (m) { m.perceive(turn); reactions.push(m.react(turn)); });
      if (turn.role === 'user') {
        var cues = read(turn.text);
        var nudge = (turn.valence != null) ? (clamp11(turn.valence) * 0.3) : ((cues.warmth + cues.humor - cues.distress - cues.anger) * 0.15);
        societyUser.sentiment = clamp11(societyUser.sentiment * 0.7 + nudge);
        societyUser.engagement = clamp01(societyUser.engagement * 0.8 + Math.min(1, cues.len / 120) * 0.2);
        societyUser.lastSaid = turn.text;
      }
      state.turns++;
      return { cues: read(turn.text), sentiment: societySentiment(), reactions: reactions };
    }
```
  6. Simplify `societySentiment` (no more averaging identical numbers) and point `setUserDescription` at the shared model:
```js
    function societySentiment() { return r2(societyUser.sentiment); }
```
```js
    function setUserDescription(d) { societyUser.description = String(d || ''); }   // (match the existing body)
```
- [ ] **Step 4 — run, expect PASS:** `node harness-solo-nation.js` → `ALL GREEN` (the existing sentiment/veto tests must still pass — that's the regression guard).
- [ ] **Step 5 — validate:** `npm test` → all `ALL GREEN`. nation.js isn't compiled; no parity step.

> If any existing assertion that reads `mind.user.sentiment` breaks, that's the signal a reference wasn't
> repointed — search `nation.js` for `.user.` and confirm each now resolves to the shared `societyUser`.

---

### Task 7: Every faculty remembers what was just said (A7)

**Files:** Modify `nation.js` (`reactToSpoken`); Test `harness-solo-nation.js`.

> Low impact today (no decision reads beyond the last/last-user turn), but it removes a real asymmetry and
> future-proofs anything that walks `working`. The speaker already records via `said()`; give the non-speakers the
> same record (as `role:'other'`), respecting the 8-item cap.

- [ ] **Step 1 — failing test:**
```js
var rm = N.createArmy({ config: {} });
rm.perceive({ who: 'You', role: 'user', text: 'i had a rough day' });
rm.reactToSpoken('heart', 'I hear you. That sounds really hard.');
var peer = rm.mindOf('reason').working.some(function (w) { return w.role === 'other' && /hear you/.test(w.text); });
ok(peer, 'a non-speaking faculty now remembers what was just said (no longer blind to her own reply)');
var spkCount = rm.mindOf('heart').working.filter(function (w) { return /hear you/.test(w.text); }).length;
ok(spkCount === 1, 'the speaker records it exactly once (no double-entry from the new peer path)');
```
- [ ] **Step 2 — run, expect FAIL:** the `reason` peer has no record of the spoken line.
- [ ] **Step 3 — implement** in `nation.js`, replace the body of `reactToSpoken`'s minds loop:
```js
    function reactToSpoken(speakerId, text) {
      var sp = mindOf(speakerId); if (sp) sp.said(text);
      var t = String(text || '').slice(0, 400);
      minds.forEach(function (m) {
        var role = m.self.id === speakerId ? 'self' : 'other';
        if (role === 'other') { m.working.push({ who: speakerId, role: 'other', text: t }); if (m.working.length > 8) m.working.shift(); }
        m.react({ who: speakerId, role: role, text: text });
      });
    }
```
(Keep any other lines `reactToSpoken` already had, e.g. an `ingestReaction`/bond step, untouched — only the loop changes.)
- [ ] **Step 4 — run, expect PASS.**
- [ ] **Step 5 — validate:** `npm test` → `ALL GREEN`.

---

## Part B — Decisions for you (not auto-patched)

These are real observations, but the "fix" is a behavioral/semantic choice, not a correctness repair. Each needs a
call before any code lands.

### B1 — The `clear`/`calm` length cliff at 600 chars

Confirmed: `clear: len>600?0.3` and `calm: len>600?0.2` step instantly at 600. A 600-char reply scores `clear=1.0`;
a 601-char reply scores `0.3`. It only affects the **candidate-text** path (`/council`, the emotion society,
`nation.deliberate`) — the everyday intent path doesn't call `gauge`.

The reviewer's replacement (`max(0.2, 1-(len-400)/400)`) doesn't just remove the cliff — it **re-shapes** how length
is valued (it starts penalising at 400 and is already flat-1.0 from 240–600 today). That's a tuning decision about
what "a good length" means.

**Recommendation if you want it smoothed** (preserves today's curve up to ~400, then decays gently instead of a
cliff):
```js
      clear: len < 8 ? 0 : Math.max(0.3, Math.min(1, 0.4 + Math.min(len, 240) / 240 * 0.6) - Math.max(0, len - 400) / 1000),
      calm:  len < 8 ? 0.3 : Math.max(0.2, 1 - Math.max(0, len - 400) / 1000),
```
**Decision needed:** keep the cliff (simple, and replies rarely sit near 600), or adopt a smooth decay (and if so,
where should the knee be — 400? 600?). If you say go, it becomes a Task with the same TDD shape: a test asserting
continuity across 599→601 and monotonic non-increase past the knee.

### B2 — Does a `'shared'` drive let her co-lead, or stay supportive?

The diagnosis in the review is **factually wrong**: `'shared'` does not produce an "adversarial, commanding posture."
`intentFor` only yields `oppose`/`command` under `alignment:'adversary'` / `stature:'commands'`. With
`drive:'shared'`, `ally`, `equal` you get `voice:'press'`, `reason:'drive'`, `play:'play'` — i.e. she *takes
initiative / co-leads*, not hostility.

So the real question is design intent: when the user sets a **shared** drive, should she be allowed to push the
scene forward (current behavior), or should "shared" stay in the supportive register (`express`/`ground`/`comfort`)
and reserve initiative for `drive:'she'`?

**Decision needed.** If you want `'shared'` to be supportive-only, the one-line change is removing it from the
trigger — `function isDrivingFrame(f){ return !!f && (f.drive === 'she' || f.alignment === 'adversary' || f.stature
=== 'commands'); }` — and `harness-solo-nation-extra.js` gets a case asserting `'shared'+ally+equal` yields
`voice:'express'`. I'd lean toward **keeping** it (shared = mutual driving reads naturally as "she may lead too"),
but it's your character call.

---

## Part C — Corrected or rejected, for the record

- **"3× timeout cascade" → it's 2×.** Vote and veto are one parallel `Promise.all`. Task 5 still helps (cuts it to
  ~1×), but anyone reasoning about latency should use the right number, and remember the everyday nation path is
  synchronous and never pays this at all.
- **"`'shared'` is adversarial" → no.** See B2; it's `press`/`drive`, not `oppose`/`command`.
- **"Peers are blind, a massive bug" → real but inert.** Task 7 fixes the asymmetry, but no current decision depends
  on it; don't expect behavior to change, only consistency.
- **`withTimeout` "memory leak" (earlier review) → already handled.** No action.

---

## Validation protocol (applies to every task)

1. One test per fix, asserting the *behavior*, added to the matching harness (`council` for `resolve`/`createCouncil`;
   `nation` for `gauge`/minds/`reactToSpoken`; `nation-extra` for frame intents).
2. After **any `brain.js`** edit: `bash build-brain.sh`, then `npm run parity`. A green `brain.js` with a stale
   `brain.min.js` is how a silent regression ships.
3. End state: `npm test` (4 suites) and `npm run parity` (2 suites) all `ALL GREEN`.

## Suggested order

Tier 1 (clear, cheap, high-confidence): **Task 1 → 2 → 3 → 4.** (1+2 are `brain.js`; batch their rebuild/parity.)
Tier 2 (real, more surface): **Task 5 → 7 → 6.** (6 last: highest churn, zero intended behavior change — do it when
the suite is otherwise green so any drift is obvious.)
Tier 3 (your call, no code yet): **B1, B2.**

## Self-review

- **Coverage:** all 9 review items mapped — 7 to tasks, 2 to decisions (B1/B2), plus the rejected `withTimeout`
  claim noted in C.
- **Placeholders:** none — every code step shows the actual patch and the actual test.
- **Consistency:** `gauge(text, {trait:1})` is used uniformly to isolate a trait; `deadSet` threads identically
  through all three `reach` calls in Task 5; `societyUser` is the single name used across Task 6's steps.
- **Risk flagged:** Task 6 is the one with refactor risk (the "update once, not 7×" trap) and is sequenced last with
  an explicit regression guard.
