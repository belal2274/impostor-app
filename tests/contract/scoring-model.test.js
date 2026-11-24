'use strict';
// Checks the hand-written cases in tests/data/scoring.json against the spec model.
// This guards the contract itself; it does not start the server.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./helpers/scoring');
const D = require('./data/scoring.json');

for (const c of D.rounds) {
  test(`round: ${c.name}`, () => {
    assert.deepEqual(S.roundScores(c.ids, c.impostor, c.votes), c.expect);
    assert.equal(S.discovered(c.ids, c.impostor, c.votes), c.discovered);
  });
}
for (const c of D.winners) {
  test(`final: ${c.name}`, () => {
    const w = S.winners(c.totals);
    assert.deepEqual(w, c.winners);
    assert.equal(S.bonusFor(w.length), c.bonus);
  });
}
for (const c of D.claimBalance) {
  test(`claim balance: ${c.name}`, () => {
    assert.equal(S.claimBalance(c.pts, c.roundPoints, c.bonus), c.expect);
  });
}
