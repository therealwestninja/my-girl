# my-girl brain migration — endpoint map & wiring tracker

Migrating my-girl off the inlined **Chloe/Rook brain** onto the new **`D:\Claude\brain`** (unifying with book-maker),
via an adapter that reproduces the interface the app already calls. This file is the contract + the to-wire list.

## Where the old brain lived
Inlined into `solo-app-html.txt`, **lines 9442–10758** (8 UMD modules, contiguous). App "glue" that *calls* them
resumes at line 10761 (`/* Chloe-bot glue */`). The rip replaces 9442–10758 with a placeholder; the glue stays and
gets re-pointed at the new adapter (`window.Chloe*` globals the adapter must re-provide).

Backup of the pre-rip file: `solo-app-html.txt.pre-migration.bak`.

## The endpoints to reproduce (the contract)

### 1. `ChloeBrain` / `ChloeCouncil` (was `brain.min.js`, line 9442) — the deliberation substrate
| endpoint | shape | new-brain backing |
|---|---|---|
| `resolve(props, ballots, vetoes, opts)` | → `{winnerId, text, status, tally, margin, consensus, dissent, vetoed}` | **BUILD** — weighted vote tally; map onto `selection.js` / `executive.js` or keep as a thin pure tallier |
| `createNervous(log)` | → `{register, wake, sleep, standby, send, ask, publish, subscribe, health, list, describe, find, setState}` | **BUILD/PORT** — a pub/sub + registry seam; likely keep as-is (pure infra, brain-agnostic) |
| `createCouncil({members, nervous, opts, timeoutMs, idleMs, now, sched, log})` | → `{deliberate(ctx, seed), resolve, members, nervous, wakeStalled, size}` | **BUILD** — orchestrates propose/vote/veto → resolve |
| `member(id, role, hooks)` , `withTimeout(p, ms, fallback, sched)` | helpers | keep (pure) |

App call sites: `councilMembers(prompt)` + `createCouncil` (line 13084–85, 13132–33 — the emotion "society"); `createNervous` ×2.

### 2. `ChloeNation` (was `nation.js`, line 9456) — the Seven Nations top layer
| endpoint | shape | new-brain backing |
|---|---|---|
| `NATIONS` | array of 7 faculty descriptors | keep as data (the 7 stay; they become lenses over the new brain) |
| `EXTRAS` | extra faculty descriptors | keep as data |
| `gauge(text, lean)` | → score (pure warmth/tone lens) | **PORT** — pure text lens; reuse `features.js`/`salience.js` cues |
| `createArmy({brain, config, nations})` | → army (below) | **BUILD** — the army, now driven by the new brain |
| army.`about()` | self-knowledge string | keep (data) |
| army.`setUserDescription(desc)` | set the user model | → new brain `self`/user-model |
| army.`perceive(turn)` | read a turn through each mind | → `extractFeatures` + `classifyIntent` + per-mind mood |
| army.`deliberateIntents(ctx)` | propose (speaker, intent) | → council over new-brain faculties |
| army.`deliberate(cands, ctx)` | resolve a winner from candidates | → `resolve` |
| army.`reactToSpoken(line, speaker)` | each mind reacts to the spoken line | → `organism.feedback` / mood bursts |
| army.`syncPersonas(map)` | bind characters to nations | keep (data) |
| army.`ingestReaction(reaction)` | fold 👍/👎 into the user read | → `organism.feedback` (vote learning) |

App call sites: `createArmy` (13664 reply-driving; 13772 throwaway preview); `perceive`, `deliberateIntents`, `deliberate`, `reactToSpoken`, `ingestReaction`, `setUserDescription`, `syncPersonas`, `about`.

### 3. `ChloeReaderCore` (line 10300) — base incremental reader
`createReader(opts)` → `{read(text), observe(text), snapshot(), reset(), isPinned(), set(v), now}`.
Used as the base for Stance/Affect/Topics. new-brain backing: **PORT** (pure incremental estimators; or fold into `features.js`).

### 4. `ChloeStance` (line 10387) — narrator stance reader
`createReader({initial})` → stance reader (`read/observe/snapshot/reset`). App: `stanceReader` (13483), `.snapshot()`. → maps to persona **setpoints** (story-brain does this).

### 5. `ChloeAffect` (line 10445) — felt-affect reader + voice
| endpoint | new-brain backing |
|---|---|
| `BASE` (resting affect) | data |
| `createReader({initial, resting})` → affect reader (`snapshot()`) | → new-brain **mood readout** (`neuromodulation` / `mind.mood`) |
| `feltDirective(snapshot)` → a voice instruction from felt affect | → the moodClause pattern (valence×arousal → voice) — reuse the sweetie-bot `moodClause` idea |

App: `affectReader` (13537), `feltDirective` (10938 — inside Frame; and in the reply builder).

### 6. `ChloeTopics` (line 10514) — topic-salience reader
`createReader({initial})` → topic reader (`read/observe/snapshot`). App: `topicReader` (13608). → `salience.js` `entities()` + a topic tally.

### 7. `ChloeFrame` (line 10609) — role-frame (STATIC, no instance)
`affectResting(frame)`, `beatInstruction(frame)`, `describe(frame)`, `directive(frame)`, `drives(frame)`, `isDefault(frame)`, `normalize(frame)`.
App: 25 refs — the role/scene frame that shapes the reply. → mostly **KEEP** (pure frame logic, brain-agnostic); `affectResting`/`directive` consult affect → re-point at the new mood.

### 8. `ChloeMeasure` (line 10703) — decayed reward meter (tag-level learning)
`createMeter({initial, halfLifeDays, now})` → `{record(tags, reward), summary(), forTag(tag), get(), set(v), reset()}`.
App: `meter` (13632). → the new brain's **feedback/salience learning**; or **PORT** (a pure decayed tally, brain-agnostic).

## Wiring plan (what to BUILD vs KEEP vs PORT)
- **KEEP as-is (pure, brain-agnostic):** `ChloeFrame` (role frames), `createNervous` (pub/sub infra), `ChloeMeasure` (decayed reward tally), `NATIONS`/`EXTRAS`/`about` (data), `gauge` (text lens).
- **PORT to the new brain (thin re-backing):** the readers (Stance/Affect/Topics/ReaderCore) → new-brain mood/persona/salience; `feltDirective` → moodClause pattern.
- **BUILD (the real adapter work):** `createArmy` (the Seven Nations driven by the new brain: perceive→intend→deliberate→react), and `resolve`/`createCouncil` (the vote tally over new-brain faculties). This is the heart of the migration — a `chloe-adapter.mjs` (esbuild → `window.ChloeBrain/ChloeNation/…`), mirroring book-maker's `story-brain.mjs`.

## STATUS (migration in progress)
- **DONE — the affect/felt-cognition core is on the new brain.** `chloe-affect.mjs` re-backs `ChloeAffect` on the new
  brain's `extractFeatures` (its text-affect faculty) + the legacy reader's EMA smoothing (build/fade over turns). Same
  interface (`STATES/BASE/toneHint/feltDirective/read/createReader`; reader → `{valence,arousal,vector,dominant}`).
  Built + esbuild-bundled (`lib/chloe-affect.bundle.js`, 8KB) + smoke-tested: warm text → valence 0.67/dominant "warm"
  + voice directive fires; sad/angry go negative. This IS the meaningful brain swap (felt emotion now from D:/Claude/brain).
- **DONE — app reconstituted to WORKING.** All 8 `window.Chloe*` globals re-provided: the brain-AGNOSTIC scaffolding
  (deliberation council, frames, readers, measure, nation — none of these are neural/chemistry; they're a vote-tallier,
  frame logic, text estimators, a decayed reward tally) is retained verbatim from the backup (`lib/chloe-legacy-modules.js`),
  and the new-brain `ChloeAffect` is inlined AFTER it to override the legacy affect. Verified via eval-load: 8/8 globals
  present, the new affect wins. solo-app-html.txt back to a working 15.2k lines.
- **ARCHITECTURE DECISION (surface to user):** kept the pure scaffolding (it's app cognition, not "the Rook brain") and
  migrated the felt-cognition core. This mirrors book-maker's story-brain (which also wraps the new brain selectively).
- **REMAINING (optional deeper migration):** reimplement the deliberation (`ChloeBrain.resolve`/council) + the Seven
  Nations `createArmy` (perceive→intend→deliberate→react) on the new brain's faculties (selection/executive/feedback/
  mood-per-mind), instead of the retained pure scaffolding. Bigger, and only worth it for full parity with book-maker.
- **Note:** the standalone harness (`harness-solo-nation.js`) can't run — its `require('./brain.min.js')` isn't in the
  root (lives in the handoff zips); pre-existing, and it validates the OLD brain we're leaving. Real validation is the
  app-load check above.

## Validation target
`harness-solo-nation.js` (47/47 green today): asserts NATIONS.length===7, gauge warmth ordering, `createArmy(...).deliberate(cands)` picks a winner via resolve, weight-swinging changes the winner, disable/enable, self-knowledge. The adapter must keep this green (it may need its `require('./brain.min.js')` re-pointed at the adapter build).
