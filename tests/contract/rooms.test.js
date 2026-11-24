'use strict';
// Room creation rules: player count in the code, host settings clamping.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, SKIP } = require('./helpers/server');
const R = require('./helpers/room');
const D = require('./data/rooms.json');

describe('rooms', { skip: SKIP }, () => {
  let srv;
  before(async () => { srv = await startServer(); });
  after(async () => { await srv.stop(); });

  for (const n of D.playerCounts.rejectedWith404) {
    it(`host join with player-count digit ${n} is 404`, async () => {
      const r = await R.post(srv.base, R.roomCode(n), { t: 'j', c: 'p1', n: 'P1', a: '', v: 'full', host: true });
      assert.equal(r.status, 404);
    });
  }
  for (const n of D.playerCounts.ok) {
    it(`host join with player-count digit ${n} is 200`, async () => {
      const r = await R.post(srv.base, R.roomCode(n), { t: 'j', c: 'p1', n: 'P1', a: '', v: 'full', host: true });
      assert.equal(r.status, 200);
    });
  }

  it('a join without host and with no room is 404', async () => {
    const r = await R.post(srv.base, R.roomCode(3), { t: 'j', c: 'p1', n: 'P1', a: '', v: 'full' });
    assert.equal(r.status, 404);
  });

  // Settings show up in state once the roster is full (2 players keeps it cheap).
  for (const c of D.hostSettings) {
    it(`host settings: ${c.name}`, async () => {
      const code = R.roomCode(2);
      const h = await R.post(srv.base, code, { t: 'j', c: 'p1', n: 'P1', a: '', v: 'full', host: true, ...c.send });
      assert.equal(h.status, 200);
      const j = await R.post(srv.base, code, { t: 'j', c: 'p2', n: 'P2', a: '', v: 'full' });
      assert.equal(j.status, 200);
      const st = await R.post(srv.base, code, { t: 'state', c: 'p1', s: 0 });
      assert.equal(st.status, 200);
      assert.equal(st.json.rounds, c.expect.rounds);
      assert.equal(st.json.dur, c.expect.dur);
    });
  }

  it('host settings sent after the room exists are ignored', async () => {
    const code = R.roomCode(2);
    await R.post(srv.base, code, { t: 'j', c: 'p1', n: 'P1', a: '', v: 'full', host: true, rounds: 4, dur: 100 });
    await R.post(srv.base, code, { t: 'j', c: 'p2', n: 'P2', a: '', v: 'full', host: true, rounds: 9, dur: 500 });
    const st = await R.post(srv.base, code, { t: 'state', c: 'p1', s: 0 });
    assert.equal(st.json.rounds, 4);
    assert.equal(st.json.dur, 100);
  });

  it('state for a player who is not in the round is 403', async () => {
    const code = R.roomCode(2);
    await R.post(srv.base, code, { t: 'j', c: 'p1', n: 'P1', a: '', v: 'full', host: true });
    await R.post(srv.base, code, { t: 'j', c: 'p2', n: 'P2', a: '', v: 'full' });
    const st = await R.post(srv.base, code, { t: 'state', c: 'stranger', s: 0 });
    assert.equal(st.status, 403);
  });
});
