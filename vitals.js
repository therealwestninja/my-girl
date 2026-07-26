/* chloe-vitals - can this mind tell when it is quietly dying?
 *
 * Chloe lives in a tab that is never reloaded ("if the tab is open, she's alive"). That is the same shape as a phone
 * WebView, and it fails the same way: a leaked interval, a rAF that never cancels, a growing heap. Nothing crashes. She
 * just gets slower over days until someone reloads the page and the evidence is gone forever.
 *
 * This is the condensed form of a larger diagnostics stack built for the Rook server + phone (see
 * D:/Claude/docs/NEKO-LESSONS-PLAN.md). Only the parts that survive without a server are here:
 *
 *   census  - how many timers/rAFs are LIVE right now (the leak itself)
 *   ring    - a bounded time series of samples, so "growing" is distinguishable from "busy"
 *   ledger  - mouth calls: how many, how slow, how often they FAILED
 *   export  - one JSON blob to hand over, because there is no server to post to
 *
 * Deliberately dropped as inapplicable: a readiness handshake and bootstrap reconciliation (there is no protocol here),
 * and machine-readable wire codes (there is no wire). Copying those would have been cargo cult.
 *
 * TWO PROPERTIES CARRIED OVER INTACT, both learned the hard way:
 *   1. OFF MEANS INERT. Disabled is not "enabled but quiet" - nothing is patched and the globals keep their exact
 *      identity, so the default path is byte-for-byte unchanged. A diagnostic that can break the app it watches is
 *      not worth having.
 *   2. QUIET WHEN HEALTHY. An idle page must report NOTHING. A leak report that fires on a healthy page trains you to
 *      ignore it, which is worse than no report at all. Two filters earn that: skip the boot samples (stores load
 *      after the first reading, so initialisation looks exactly like a climb), and require growth to be significant
 *      RELATIVE to its own size (heap drifting 14->15 MB is JIT warmup, not a leak).
 *
 * PRIVACY: counters and durations only. There is nowhere in the sample shape to put a message, a prompt or a name,
 * which is structural rather than a promise.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChloeVitals = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_CAP = 240;

  function createVitals(opts) {
    opts = opts || {};
    var host = opts.host || (typeof self !== 'undefined' ? self : global);
    var nowFn = opts.now || function () { return Date.now(); };
    var cap = isFinite(opts.capacity) ? Math.max(2, Math.floor(opts.capacity)) : DEFAULT_CAP;

    // ---- census -------------------------------------------------------------------------------------------------
    var patched = false, orig = null, startedAt = 0;
    var liveI = {}, liveT = {}, liveR = {}, nI = 0, nT = 0, nR = 0;   // plain maps: id -> 1 (Set is fine too, this is smaller)
    var errors = 0, rejections = 0;

    function enable() {
      if (patched) return false;
      orig = { si: host.setInterval, ci: host.clearInterval, st: host.setTimeout, ct: host.clearTimeout,
               raf: host.requestAnimationFrame, caf: host.cancelAnimationFrame };
      // Wrappers only RECORD. Same arguments, same return value, same `this` - a timer that behaves differently while
      // being measured makes the measurement worthless.
      host.setInterval = function () { var id = orig.si.apply(host, arguments); if (!liveI[id]) { liveI[id] = 1; nI++; } return id; };
      host.clearInterval = function (id) { if (liveI[id]) { delete liveI[id]; nI--; } return orig.ci.call(host, id); };
      host.setTimeout = function (fn) {
        var id, args = Array.prototype.slice.call(arguments, 1);
        // A one-shot removes itself when it fires; otherwise every completed setTimeout reads as a leak within minutes.
        var wrapped = typeof fn === 'function' ? function () { if (liveT[id]) { delete liveT[id]; nT--; } return fn.apply(this, arguments); } : fn;
        id = orig.st.apply(host, [wrapped].concat(args));
        if (!liveT[id]) { liveT[id] = 1; nT++; }
        return id;
      };
      host.clearTimeout = function (id) { if (liveT[id]) { delete liveT[id]; nT--; } return orig.ct.call(host, id); };
      if (orig.raf) {
        host.requestAnimationFrame = function (fn) {
          var id;
          var wrapped = typeof fn === 'function' ? function () { if (liveR[id]) { delete liveR[id]; nR--; } return fn.apply(this, arguments); } : fn;
          id = orig.raf.call(host, wrapped);
          if (!liveR[id]) { liveR[id] = 1; nR++; }
          return id;
        };
        host.cancelAnimationFrame = function (id) { if (liveR[id]) { delete liveR[id]; nR--; } return orig.caf.call(host, id); };
      }
      startedAt = nowFn(); patched = true; return true;
    }

    // Restores the ORIGINAL function objects, not equivalents - otherwise "off" is a lie you cannot check.
    function disable() {
      if (!patched) return false;
      host.setInterval = orig.si; host.clearInterval = orig.ci;
      host.setTimeout = orig.st; host.clearTimeout = orig.ct;
      if (orig.raf) { host.requestAnimationFrame = orig.raf; host.cancelAnimationFrame = orig.caf; }
      liveI = {}; liveT = {}; liveR = {}; nI = nT = nR = 0;
      patched = false; orig = null; return true;
    }

    function census() {
      var s = { live_intervals: nI, live_timeouts: nT, live_rafs: nR, errors: errors, rejections: rejections,
                uptime_s: patched ? Math.round((nowFn() - startedAt) / 1000) : 0 };
      // Absent readings are OMITTED, never zeroed - "unknown" must stay distinguishable from "zero".
      try { if (host.document) s.dom_nodes = host.document.getElementsByTagName('*').length; } catch (e) {}
      try { var m = host.performance && host.performance.memory;
            if (m && isFinite(m.usedJSHeapSize)) s.heap_mb = Math.round(m.usedJSHeapSize / 1048576); } catch (e) {}
      return s;
    }
    function noteError() { errors++; }
    function noteRejection() { rejections++; }

    // ---- ring ---------------------------------------------------------------------------------------------------
    var ring = [];
    function sample(extra) {
      var row = { t: nowFn() }, c = census(), k;
      for (k in c) if (c.hasOwnProperty(k)) row[k] = c[k];
      if (extra) for (k in extra) if (extra.hasOwnProperty(k) && typeof extra[k] === 'number' && isFinite(extra[k])) row[k] = extra[k];
      ring.push(row);
      while (ring.length > cap) ring.shift();          // bounded by construction: no cleanup job to forget to run
      return row;
    }
    function series() { return ring.slice(); }

    function fieldsOf() {
      var seen = {}, out = [], i, k;
      for (i = 0; i < ring.length; i++) for (k in ring[i]) if (k !== 't' && typeof ring[i][k] === 'number' && !seen[k]) { seen[k] = 1; out.push(k); }
      return out.sort();
    }

    // A field that only ever climbs, never recovers. Reports SUSPECTS for a human to read; nothing acts on this
    // automatically, because a monotonic climb is evidence, not proof.
    function suspects(o) {
      o = o || {};
      var minSamples = o.minSamples || 8, minDelta = o.minDelta || 1, minGrowthPct = o.minGrowthPct || 0;
      var skipFirst = o.skipFirst || 0, ignore = o.ignore || ['uptime_s'];   // uptime climbs forever by design
      var out = [], names = fieldsOf(), i, j, f, pts, everFell, first, last, delta, pct;
      for (i = 0; i < names.length; i++) {
        f = names[i];
        if (ignore.indexOf(f) >= 0) continue;
        pts = [];
        for (j = 0; j < ring.length; j++) if (typeof ring[j][f] === 'number') pts.push(ring[j]);
        pts = pts.slice(skipFirst);                    // boot samples: stores load AFTER the first reading, so a
        if (pts.length < minSamples) continue;         // counter that merely initialises looks like a perfect climb
        everFell = false;
        for (j = 1; j < pts.length; j++) if (pts[j][f] < pts[j - 1][f]) { everFell = true; break; }
        if (everFell) continue;                        // it recovered at least once - busy, not leaking
        first = pts[0][f]; last = pts[pts.length - 1][f]; delta = last - first;
        if (delta < minDelta) continue;
        // Proportional gate: +1 on a heap of 59 MB is warmup; +1 on a counter sitting at 3 matters. An absolute
        // threshold alone is either too noisy for megabytes or too deaf for small counters.
        pct = first > 0 ? (delta / first) * 100 : null;
        if (minGrowthPct > 0 && pct !== null && pct < minGrowthPct) continue;
        out.push({ field: f, samples: pts.length, first: first, last: last, delta: delta,
                   growthPct: pct === null ? null : Math.round(pct * 10) / 10,
                   spanMs: pts[pts.length - 1].t - pts[0].t, monotonic: true });
      }
      out.sort(function (a, b) { return b.delta - a.delta; });
      return out;
    }

    // ---- ledger -------------------------------------------------------------------------------------------------
    // The mouth is Perchance, over the network, and it can fail. Today a failure is invisible: the page retries or
    // degrades and nothing records that it happened, so "she feels slow lately" has no evidence behind it.
    var ledger = {};
    function record(r) {
      r = r || {};
      var who = String(r.source || '').trim();
      if (!who) return null;                           // unattributable: dropped rather than filed under ''
      if (!ledger[who]) ledger[who] = { source: who, calls: 0, errors: 0, ms: 0, maxMs: 0, chars: 0, lastAt: 0 };
      var e = ledger[who], ms = (isFinite(r.ms) && r.ms > 0) ? r.ms : 0;
      e.calls++;                                       // a failure counts as a call TOO - excluding it flatters the rate
      if (r.ok === false) e.errors++;
      e.ms += ms; if (ms > e.maxMs) e.maxMs = ms;
      e.chars += (isFinite(r.chars) && r.chars > 0) ? r.chars : 0;
      e.lastAt = nowFn();
      return e;
    }
    function usage() {
      var out = [], k, e;
      for (k in ledger) if (ledger.hasOwnProperty(k)) {
        e = ledger[k];
        out.push({ source: e.source, calls: e.calls, errors: e.errors, ms: e.ms, maxMs: e.maxMs, chars: e.chars, lastAt: e.lastAt,
                   avgMs: e.calls ? Math.round(e.ms / e.calls) : 0,
                   errorRate: e.calls ? Math.round((e.errors / e.calls) * 1000) / 10 : 0 });
      }
      out.sort(function (a, b) { return b.calls - a.calls; });
      return out;
    }

    // ---- export -------------------------------------------------------------------------------------------------
    // No server to post to, so the artifact IS the deliverable: one blob covering the whole session.
    function exportReport(o) {
      o = o || {};
      return { kind: 'chloe-vitals', at: nowFn(), enabled: patched, capacity: cap, samples: ring.length,
               census: census(), usage: usage(),
               suspects: suspects({ skipFirst: o.skipFirst == null ? 2 : o.skipFirst,
                                    minGrowthPct: o.minGrowthPct == null ? 5 : o.minGrowthPct }),
               series: series() };
    }

    return { enable: enable, disable: disable, isPatched: function () { return patched; },
             census: census, noteError: noteError, noteRejection: noteRejection,
             sample: sample, series: series, fields: fieldsOf, suspects: suspects,
             record: record, usage: usage, exportReport: exportReport,
             capacity: function () { return cap; } };
  }

  return { createVitals: createVitals };
}));
