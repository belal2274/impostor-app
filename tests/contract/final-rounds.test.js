'use strict';
// Two-round game: totals carry over, winners and bonus only on the last round, 'again' after the end is 400.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, SKIP } = require('./helpers/server');
const R = require('./helpers/room');
const S = require('./helpers/scoring');

describe('multi-round game', { skip: SKIP }, () => {
  let srv; let room1; let room2; let r1; let r2;
  before(async () => {
    srv = await startServer();
    room1 = await R.fillRoom(srv.base, { n: 3, rounds: 2 });
    r1 = await R.playRound(srv.base, room1, { picks: 1, wrong: 1, none: 0, impVote: 'none' });
    room2 = await R.nextRound(srv.base, room1);
    r2 = await R.playRound(srv.base, room2, { picks: 0, wrong: 0, none: 2, impVote: 'none' });
  });
  after(async () => { room1.close(); room2.close(); await srv.stop(); });

  it('round 1 is not the last: no winners, no bonus', () => {
    assert.deepEqual(r1.res.win, []);
    assert.equal(r1.res.bonus, 0);
    assert.equal(r1.res.round, 1);
    assert.equal(r1.res.rounds, 2);
  });
  it('round 2 totals are round 1 totals plus round 2 points', () => {
    assert.equal(r2.res.round, 2);
    for (const c of room2.cids) assert.equal(r2.res.tot[c], r1.res.tot[c] + r2.res.d[c], c);
    assert.deepEqual(r2.res.d, S.roundScores(room2.cids, room2.imp, r2.votes));
  });
  it('last round: winners have the highest total and bonus is floor(10/winners)', () => {
    const w = S.winners(r2.res.tot);
    assert.deepEqual([...r2.res.win].sort(), [...w].sort());
    assert.equal(r2.res.bonus, S.bonusFor(w.length));
  });
  it('the next room keeps the roster, rounds and duration', async () => {
    const st = await R.state(srv.base, room2);
    assert.equal(st.json.rounds, 2);
    assert.equal(st.json.dur, 180);
    assert.equal(st.json.n, 3);
  });
  it('again after the last round is 400 finished', async () => {
    const a = await R.post(srv.base, room2.code, { t: 'again', c: room2.leader, cat: 1 });
    assert.equal(a.status, 400);
    assert.match(a.text, /finished/);
  });
});
