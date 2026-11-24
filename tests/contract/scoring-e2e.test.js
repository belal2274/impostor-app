'use strict';
// Plays real rounds against the server and checks round points, tally and totals
// against the spec model (tests/helpers/scoring.js). Cases: tests/data/rooms.json.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, SKIP } = require('./helpers/server');
const R = require('./helpers/room');
const S = require('./helpers/scoring');
const D = require('./data/rooms.json');

describe('scoring end to end', { skip: SKIP }, () => {
  let srv; const results = new Map();
  before(async () => {
    srv = await startServer();
    // Rooms run in parallel: each round has a 3 s countdown, so this keeps the suite short.
    await Promise.all(D.scoringScenarios.map(async (sc) => {
      const room = await R.fillRoom(srv.base, { n: sc.n, rounds: 1 });
      try {
        const out = await R.playRound(srv.base, room, sc);
        results.set(sc.name, { room, ...out });
      } finally { room.close(); }
    }));
  });
  after(async () => { await srv.stop(); });

  for (const sc of D.scoringScenarios) {
    it(sc.name, () => {
      const { room, votes, res } = results.get(sc.name);
      assert.equal(res.imp, room.imp);
      assert.equal(res.round, 1);
      assert.deepEqual(res.votes, votes);
      const expected = S.roundScores(room.cids, room.imp, votes);
      assert.deepEqual(res.d, expected, 'round points');
      assert.deepEqual(res.tot, expected, 'room totals after round 1');
      assert.equal(res.disc, S.discovered(room.cids, room.imp, votes), 'discovered flag');
    });
  }

  it('single-round game: winners are the highest totals and bonus is floor(10/winners)', () => {
    for (const sc of D.scoringScenarios) {
      const { res } = results.get(sc.name);
      const w = S.winners(res.tot);
      assert.deepEqual([...res.win].sort(), [...w].sort(), sc.name);
      assert.equal(res.bonus, S.bonusFor(w.length), sc.name);
    }
  });
});
