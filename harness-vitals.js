/* chloe-vitals — can she tell when she is quietly dying? node harness-vitals.js
 *
 * Two properties carry the whole module, and both are asserted the strict way rather than the convenient way:
 *   OFF IS INERT      — checked by function IDENTITY, not by behaviour looking right.
 *   QUIET WHEN HEALTHY — an idle page must report nothing, or the report trains you to ignore it.
 * Both filters that earn the second (skip-boot, proportional growth) are regressions for false positives that were
 * actually observed on a live server, not hypotheticals.
 */
'use strict';
var V = require('./vitals.js');
var fail = 0; function ok(c, m){ if (c) console.log('  ok   ' + m); else { fail++; console.log('  FAIL ' + m); } }

// a fake host with real-enough timer semantics, so nothing waits on the wall clock
function fakeHost() {
  var seq = 0, fired = {};
  return {
    setInterval: function (fn) { var id = ++seq; fired[id] = fn; return id; },
    clearInterval: function (id) { delete fired[id]; },
    setTimeout: function (fn) { var id = ++seq; fired[id] = fn; return id; },
    clearTimeout: function (id) { delete fired[id]; },
    requestAnimationFrame: function (fn) { var id = ++seq; fired[id] = fn; return id; },
    cancelAnimationFrame: function (id) { delete fired[id]; },
    __fire: function (id) { var fn = fired[id]; if (fn) { delete fired[id]; fn(); } }
  };
}
var clock = 0; function tick(ms) { clock += (ms || 1000); return clock; }
function mk(h) { return V.createVitals({ host: h, now: function () { return clock; } }); }

console.log('chloe-vitals');

// ---- inertness ------------------------------------------------------------------------------------------------
var h = fakeHost(), before = { si: h.setInterval, st: h.setTimeout, raf: h.requestAnimationFrame };
var v = mk(h);
ok(v.isPatched() === false, 'constructing does not patch anything');
ok(h.setInterval === before.si && h.setTimeout === before.st && h.requestAnimationFrame === before.raf,
   'disabled leaves the globals IDENTICAL (identity, not behaviour)');
v.enable();
ok(h.setInterval !== before.si, 'enable() wraps');
v.disable();
ok(h.setInterval === before.si && h.setTimeout === before.st && h.requestAnimationFrame === before.raf,
   'disable() restores the ORIGINAL functions, not equivalents');
ok(v.enable() === true && v.enable() === false, 'double enable is a no-op, not a double-wrap');
v.disable();

// ---- census ---------------------------------------------------------------------------------------------------
h = fakeHost(); v = mk(h); v.enable();
var a = h.setInterval(function () {}), b = h.setInterval(function () {});
ok(v.census().live_intervals === 2, 'counts live intervals');
h.clearInterval(a);
ok(v.census().live_intervals === 1, 'clearing decrements');
var t = h.setTimeout(function () {});
ok(v.census().live_timeouts === 1, 'a pending one-shot counts');
h.__fire(t);
ok(v.census().live_timeouts === 0, 'a FIRED one-shot removes itself — else every completed timeout is a fake leak');
var r1 = h.requestAnimationFrame(function () {}), r2 = h.requestAnimationFrame(function () {});
h.__fire(r1); h.cancelAnimationFrame(r2);
ok(v.census().live_rafs === 0, 'rAF decrements on both fire and cancel');
var ran = false; var t2 = h.setTimeout(function () { ran = true; }); h.__fire(t2);
ok(ran === true, 'the callback still runs — measuring must not change what the timer does');
ok(typeof h.setInterval(function () {}) === 'number', 'wrappers preserve the return value');
v.noteError(); v.noteError(); v.noteRejection();
ok(v.census().errors === 2 && v.census().rejections === 1, 'error and rejection counters accumulate');
ok(!('heap_mb' in v.census()) && !('dom_nodes' in v.census()), 'absent readings are OMITTED, never zeroed');

// ---- ring + the leak signal ------------------------------------------------------------------------------------
h = fakeHost(); v = mk(h); v.enable(); clock = 0;
for (var i = 0; i < 12; i++) { h.setInterval(function () {}); tick(); v.sample(); }
var s = v.suspects();
ok(s.length >= 1 && s[0].field === 'live_intervals' && s[0].monotonic === true,
   'a never-cleared interval shows as a monotonic climb — the actual point of the module');

// busy is not leaking
h = fakeHost(); v = mk(h); v.enable(); clock = 0;
var load = [1, 4, 9, 3, 7, 12, 2, 8, 5, 11, 4, 9];
for (i = 0; i < load.length; i++) { tick(); v.sample({ queue: load[i] }); }
var qs = v.suspects().filter(function (x) { return x.field === 'queue'; });
ok(qs.length === 0, 'a field that ever falls has recovered — busy, not leaking');

// regression: boot seeding. Stores load AFTER the first reading, so initialisation looks like a perfect climb.
h = fakeHost(); v = mk(h); v.enable(); clock = 0;
tick(); v.sample({ facts: 0 });
for (i = 0; i < 12; i++) { tick(); v.sample({ facts: 40 }); }
var f0 = v.suspects().filter(function (x) { return x.field === 'facts'; });
var f1 = v.suspects({ skipFirst: 1 }).filter(function (x) { return x.field === 'facts'; });
ok(f0.length === 1 && f1.length === 0, 'skipFirst drops boot seeding so loading is not reported as a leak');

// regression: an idle page drifted heap 14->15 MB — monotonic, above any absolute floor, and pure warmup.
h = fakeHost(); v = mk(h); v.enable(); clock = 0;
for (i = 0; i < 12; i++) { tick(); v.sample({ heap: 59 + (i > 5 ? 1 : 0) }); }
var h0 = v.suspects().filter(function (x) { return x.field === 'heap'; });
var h1 = v.suspects({ minGrowthPct: 5 }).filter(function (x) { return x.field === 'heap'; });
ok(h0.length === 1 && h1.length === 0, 'minGrowthPct filters proportionally-trivial drift (+1 on 59 is noise)');
h = fakeHost(); v = mk(h); v.enable(); clock = 0;
for (i = 0; i < 12; i++) { tick(); v.sample({ handles: 100 + i * 10 }); }
ok(v.suspects({ minGrowthPct: 5 }).filter(function (x) { return x.field === 'handles'; }).length === 1,
   '…but a proportionally large climb still gets through');
h = fakeHost(); v = mk(h); v.enable(); clock = 0;
for (i = 0; i < 12; i++) { tick(); v.sample({ orphans: i }); }
var z = v.suspects({ minGrowthPct: 50 }).filter(function (x) { return x.field === 'orphans'; });
ok(z.length === 1 && z[0].growthPct === null, 'growth from ZERO is never filtered — nothing to take a percentage of');

// retention
h = fakeHost(); v = V.createVitals({ host: h, capacity: 5, now: function () { return clock; } }); v.enable();
for (i = 0; i < 50; i++) { tick(); v.sample({ n: i }); }
ok(v.series().length === 5 && v.series()[4].n === 49, 'retention is bounded by construction; newest kept');

// ---- ledger ---------------------------------------------------------------------------------------------------
v = mk(fakeHost());
v.record({ source: 'perchance', ms: 1200, chars: 180 });
v.record({ source: 'perchance', ms: 800, chars: 120 });
v.record({ source: 'perchance', ms: 50, ok: false });
var u = v.usage()[0];
ok(u.calls === 3 && u.errors === 1, 'a failure counts as BOTH a call and an error');
ok(u.errorRate === 33.3, 'errorRate is a RATE — 1-in-3 reads worse than 30-in-1000');
ok(u.maxMs === 1200 && u.avgMs === Math.round(2050 / 3), 'latency is tracked, worst case kept');
ok(v.record({ source: '' }) === null && v.usage().length === 1, 'an unattributable call is dropped, not filed under ""');
v.record({ source: 'x', ms: NaN, chars: -5 });
ok(v.usage().filter(function (e) { return e.source === 'x'; })[0].ms === 0, 'junk durations do not corrupt the rollup');

// ---- export + privacy ------------------------------------------------------------------------------------------
v = mk(fakeHost()); v.enable(); clock = 0; tick(); v.sample();
v.record({ source: 'perchance', ms: 10, chars: 5, text: 'a private message', prompt: 'also private' });
var rep = v.exportReport();
ok(rep.kind === 'chloe-vitals' && rep.series.length === 1 && rep.usage.length === 1, 'export is one self-describing blob');
ok(JSON.stringify(rep).indexOf('private') === -1, 'content passed in NEVER survives into the report — counters only');
var allowed = { source:1, calls:1, errors:1, ms:1, maxMs:1, chars:1, lastAt:1, avgMs:1, errorRate:1 };
var extra = Object.keys(rep.usage[0]).filter(function (k) { return !allowed[k]; });
ok(extra.length === 0, 'the usage shape has nowhere to put content — found: ' + extra.join(','));
ok(JSON.parse(JSON.stringify(rep)) && true, 'the report is serialisable as-is');

// a healthy session must be SILENT
v = mk(fakeHost()); v.enable(); clock = 0;
for (i = 0; i < 15; i++) { tick(); v.sample({ steady: 7 }); }
ok(v.exportReport().suspects.length === 0, 'a healthy session reports NOTHING — a report that cries wolf gets ignored');

console.log(fail ? ('\n' + fail + ' FAILED') : '\nall passed');
process.exit(fail ? 1 : 0);
