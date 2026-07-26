# Vitals — can she tell when she is quietly dying?

`vitals.js` + `harness-vitals.js` (31 checks, `node harness-vitals.js`).

## Why

Chloe lives in a tab that is never reloaded — *"if the tab is open, she's alive."* That is the same shape as a phone
WebView, and it fails the same way: a leaked interval, a `requestAnimationFrame` that never cancels, a heap that only
grows. Nothing crashes. She just gets slower over days, and then someone reloads the page and every trace of the cause
is gone.

The page currently holds **4 `setInterval`, 23 `setTimeout`, 1 `rAF`** and counts none of them. `nation.js` itself is
clean (0 intervals, 0 rAF) — the reasoning core is pure, so the risk lives entirely in the page around it.

This is the condensed form of a diagnostics stack built for the Rook server + phone
(`D:/Claude/docs/NEKO-LESSONS-PLAN.md`), which in turn came from tearing down a commercial companion app whose own
source note reads: *"users report it gets stuck after two or three days; backend counters weren't enough — the leaks
were in the renderer."*

## What transferred, and what did not

| From the Rook work | Here | Why |
|---|---|---|
| client leak census | ✅ `census()` | same never-reloads shape, same failure |
| health ring + leak heuristic | ✅ `sample()` / `suspects()` | a snapshot cannot tell *growing* from *busy* |
| usage + failure ledger | ✅ `record()` / `usage()` | the mouth is remote and can fail; today that is invisible |
| correlated client↔server export | ✅ `exportReport()` | no server, so the artifact **is** the deliverable |
| readiness handshake | ❌ | there is no protocol here |
| bootstrap reconciliation | ❌ | nothing is pushed; nothing to reconcile |
| machine-readable wire codes | ❌ | there is no wire |

Copying the bottom three would have been cargo cult. Four of seven ideas survive contact with a serverless page.

## The two properties that carried over intact

**1. Off means inert.** Disabled is not "enabled but quiet" — nothing is patched, and the globals keep their exact
identity. The harness asserts this by *identity* (`host.setInterval === original`), not by behaviour looking right,
because a diagnostic that can break the app it watches is not worth having.

**2. Quiet when healthy.** An idle page must report **nothing**. A leak report that fires on a healthy page trains you
to ignore it, which is worse than no report. Two filters earn that, and both are regressions for false positives
actually observed on a live server:

- `skipFirst` — stores load *after* the first sample, so a counter that merely initialises (`facts: 0 → 40`) reads as a
  perfect monotonic climb.
- `minGrowthPct` — an idle server drifted heap `14 → 15 MB`: monotonic, above any absolute floor, and pure JIT warmup.
  An absolute threshold alone is either too noisy for megabytes or too deaf for small counters. Growth from **zero** is
  never filtered — that is exactly the case worth seeing.

## Use

```js
var vitals = ChloeVitals.createVitals({});      // nothing patched yet
if (localStorage.getItem('chloe-vitals') === '1') {
  vitals.enable();                               // only now are timers wrapped
  addEventListener('error', vitals.noteError);
  addEventListener('unhandledrejection', vitals.noteRejection);
  setInterval(function () { vitals.sample(); }, 60000);
}
// around a mouth call:
vitals.record({ source: 'perchance', ms: elapsed, ok: didSucceed, chars: reply.length });
// when something feels wrong:
copy(JSON.stringify(vitals.exportReport(), null, 2));
```

`exportReport()` applies `skipFirst: 2, minGrowthPct: 5` by default — the settings that made a live server silent when
healthy while still catching a real climb.

**Privacy:** counters and durations only. There is nowhere in the sample or usage shape to put a message, a prompt, or a
name — structural, not a promise, and asserted by a test that passes content in and confirms it cannot come back out.

## Wiring (done 2026-07-20)

Inlined into `solo-app-html.txt` and verified in a real browser session against the actual page.

**Position is load-bearing, not cosmetic.** The block sits immediately after the opening `<script>`, before any app
code. The mouth ledger instruments `grabAiText()`, so anything that resolves the mouth before `window.chloeVitals`
exists escapes instrumentation — with the block further down the file, **measured: the first turn of a session went
unrecorded**, and two boot-time mouth calls were invisible entirely. Hoisting it to the top captured both.

**The ledger hooks `grabAiText()`** — the one function every mouth call in the app resolves through. Instrumenting
there covers all 8+ call sites without touching any of them, and it cannot drift from reality because there is
nowhere else to call the mouth from. When vitals is off, `grabAiText` returns the original function untouched.

**Enable:** `localStorage.setItem('chloe-vitals','1')` then reload. Read with `window.chloeVitals.exportReport()`.
With the flag absent nothing is patched at all — verified live: `window.chloeVitals` is `undefined` and the globals
keep their identity.

**Kept in sync by `tools/check-inline.mjs`.** The generator inlines its modules (a Perchance page has no file server),
so the repo file and the generator are two copies. That check compares them **semantically**, folding both sides to
ASCII first — the generator is ASCII-only, so a byte comparison reports every prose line as drift and the check gets
abandoned within a week. Currently guards `nation.js`, `vitals.js`, `brain.min.js`.

## Not done

Not yet left running for days against the real page — which is the only thing that proves the leak detection itself,
and takes days by definition.
