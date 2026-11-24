'use strict';
// Sticker/sound (fx) rules and cooldown. See docs/TESTING.md, Known limits:
// these checks do NOT establish the exact 3000 ms boundary. Over real HTTP a send at exactly
// 3000 ms cannot be timed reliably, so we test the clear sides: repeat now is 429, 3.1 s later is 200.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, sleep, SKIP } = require('./helpers/server');
const R = require('./helpers/room');
const D = require('./data/rooms.json').cooldown;

const fx = (base, room, c, k) => R.post(base, room.code, { t: 'fx', c, k, s: 0 });

describe('fx and cooldown', { skip: SKIP }, () => {
  let srv; let room; let early;
  before(async () => {
    srv = await startServer();
    room = await R.fillRoom(srv.base, { n: 2, rounds: 1 });
    early = await fx(srv.base, room, room.cids[0], D.firstItem); // round not started yet
    await R.startClock(srv.base, room);
  });
  after(async () => { room.close(); await srv.stop(); });

  it('before the round clock starts, fx is 400', () => { assert.equal(early.status, 400); });

  it('bad ids are 400', async () => {
    for (const k of D.badIds) assert.equal((await fx(srv.base, room, room.cids[1], k)).status, 400, k);
  });

  it('a sender who is not in the round is 403', async () => {
    assert.equal((await fx(srv.base, room, 'stranger', D.firstItem)).status, 403);
  });

  it('cooldown: repeat is 429 (any item), a rejected send does not reset it, 3.1 s after the accepted send is 200', async () => {
    const [a, b] = room.cids;
    const t0 = Date.now();
    const ok1 = await fx(srv.base, room, a, D.firstItem);
    assert.equal(ok1.status, 200);
    const rep = await fx(srv.base, room, a, D.firstItem);
    assert.equal(rep.status, 429, 'same item right away');
    const other = await fx(srv.base, room, a, D.otherItem);
    assert.equal(other.status, 429, 'different item right away (cooldown is per player, not per item)');
    const bFirst = await fx(srv.base, room, b, D.firstItem);
    assert.equal(bFirst.status, 200, 'another player is not affected (per player)');
    await sleep(Math.max(0, t0 + D.waitAfterRejectMs - Date.now()));
    const mid = await fx(srv.base, room, a, D.firstItem);
    assert.equal(mid.status, 429, 'still inside 3 s');
    await sleep(Math.max(0, t0 + D.waitAfterAcceptMs - Date.now()));
    const later = await fx(srv.base, room, a, D.firstItem);
    assert.equal(later.status, 200, 'more than 3 s after the last ACCEPTED send, although a 429 happened 1.6 s earlier');
  });
});
