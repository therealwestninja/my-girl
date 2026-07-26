/* chloe-mood — does chemistry actually change who speaks? node harness-mood.js
 *
 * `harness-adapter.js` proves PARITY with mood off: the migration changed nothing it shouldn't. This proves the
 * opposite half — that turning mood on is not decorative. A feature that cannot be shown to alter an outcome is
 * indistinguishable from one that is silently disabled, which is exactly how the mouth ledger fooled me earlier today.
 */
const fs = require('fs');
const B = (function () {
  const c = fs.readFileSync('./lib/chloe-adapter.bundle.js', 'utf8');
  const b = new Function(c + ';return RookChloeBrain;')();
  if (!b || typeof b.resolve !== 'function') throw new Error('ADAPTER FAILED TO LOAD — refusing a vacuous pass');
  return b;
})();

let pass = 0, fail = 0;
const ok = (name, fn) => { try { fn(); console.log('  ok   ' + name); pass++; } catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); fail++; } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); };

// A deliberately balanced vote: both proposals tie on ballots, so ONLY confidence (and therefore mood) can break it.
const props = () => [{ by: 'heart', text: 'I am here with you.' }, { by: 'reason', text: 'Here is what the evidence says.' }];
const tied = [{ voter: 'a', scores: { heart: 2, reason: 2 } }, { voter: 'b', scores: { heart: 2, reason: 2 } }];

console.log('chloe-mood');

ok('mood OFF is the neutral baseline — a tie resolves by proposal order', () => {
  B.enableMood(false);
  const r = B.resolve(props(), tied, [], {});
  eq(r.winnerId, 'heart', 'equal scores resolve by stable order:');
});

ok('feedback moves the chemistry — approval is not a no-op', () => {
  const before = B.snapshotChem();
  B.feedback({ kind: 'up' });
  const after = B.snapshotChem();
  if (!(after.dopamine > before.dopamine)) throw new Error('a thumbs-up must raise reward chemistry: ' + JSON.stringify({ before, after }));
});

ok('disapproval registers as a stressor, not merely absent reward', () => {
  const before = B.snapshotChem();
  B.feedback({ kind: 'down' });
  const after = B.snapshotChem();
  if (!(after.dopamine < before.dopamine)) throw new Error('a thumbs-down must lower reward: ' + JSON.stringify({ before, after }));
  if (after.cortisol != null && !(after.cortisol >= before.cortisol)) throw new Error('and should not lower stress');
});

ok('an unrecognised reaction changes nothing', () => {
  const before = B.snapshotChem();
  const r = B.feedback({ kind: 'shrug' });
  eq(r, null, 'unknown reaction returns null:');
  eq(B.snapshotChem(), before, 'and leaves chemistry untouched:');
});

// THE test: same proposals, same ballots, different chemistry -> a different mind takes the floor.
ok('mood ON can change WHO SPEAKS on an otherwise tied vote', () => {
  B.enableMood(true);
  const chem = B.chemistry();
  // drive the chemistry hard in one direction, then the other, and compare the tallies it produces
  for (let i = 0; i < 12; i++) B.feedback({ kind: 'up' });
  const hot = B.resolve(props(), tied, [], {});
  for (let i = 0; i < 24; i++) B.feedback({ kind: 'down' });
  const cold = B.resolve(props(), tied, [], {});
  const moved = JSON.stringify(hot.tally) !== JSON.stringify(cold.tally) || hot.winnerId !== cold.winnerId;
  if (!moved) throw new Error('chemistry made no difference to the decision — the tilt is not wired: '
    + JSON.stringify({ hot: { w: hot.winnerId, t: hot.tally }, cold: { w: cold.winnerId, t: cold.tally } }));
  B.enableMood(false);
});

ok('mood tilt never breaks the contract shape', () => {
  B.enableMood(true);
  const r = B.resolve(props(), tied, [], {});
  for (const k of ['winnerId', 'text', 'status', 'tally', 'margin', 'consensus', 'dissent', 'vetoed']) {
    if (!(k in r)) throw new Error('missing legacy field: ' + k);
  }
  B.enableMood(false);
});

ok('a veto still strikes regardless of mood', () => {
  B.enableMood(true);
  const r = B.resolve(props(), tied, [{ by: 'c', against: 'heart', reason: 'not now' }], {});
  eq(r.winnerId, 'reason', 'vetoed proposer must not win however good the mood:');
  B.enableMood(false);
});

console.log('\n' + (fail ? fail + ' FAILED, ' : '') + pass + ' passed');
process.exit(fail ? 1 : 0);
