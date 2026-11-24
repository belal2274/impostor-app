'use strict';
// Round points claims: POST /acc {t:'add'}. Contract: docs/TEST-CONTRACT.md section 2 and 5.
// Every claim test joins its rooms with u = the claiming account (contract section 2, Ownership).
// Not encoded on purpose (contract does not settle them): a second claim with NO rid, and
// a stored rid reused for a different (round, cid).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, makeAccClient, SKIP } = require('./helpers/server');
const R = require('./helpers/room');
const S = require('./helpers/scoring');

describe('claims', { skip: SKIP }, () => {
  let srv; let acc; let room1; let room2; let r1; let r2; let mid; let accounts; let n = 0;
  let gC; let gI; let gM; let cc; let ix; let m; // finished games with unclaimed (room, round, cid) keys, and their accounts
  const INITS = [1, 10, 40]; // 1 forces the per-claim floor when a round loses points
  const claim = (a, extra) => acc({ t: 'add', u: a.u, tok: a.tok, ...extra });
  const body = (room, res, cid, rid) => ({ code: room.code, round: res.round, c: cid, ...(rid ? { rid } : {}) });
  const newAccount = async (init) => {
    const u = `cl${Date.now().toString(36)}${n++}`;
    const r = await acc({ t: 'signup', u, p: 'secret123', init });
    return { u, tok: r.json.tok, pts: r.json.pts };
  };

  before(async () => {
    srv = await startServer();
    acc = makeAccClient(srv.base);
    accounts = [];
    for (const init of INITS) accounts.push(await newAccount(init));
    const plan = { picks: 1, wrong: 1, none: 0, impVote: 'none' };
    // room1 and room2 (next round, binding carries over): cid p1..p3 belong to accounts 0..2
    room1 = await R.fillRoom(srv.base, { n: 3, rounds: 2, users: accounts.map((a) => a.u) });
    r1 = await R.playRound(srv.base, room1, { picks: 1, wrong: 1, none: 0, impVote: 'none' });
    room2 = await R.nextRound(srv.base, room1);
    r2 = await R.playRound(srv.base, room2, { picks: 1, wrong: 0, none: 1, impVote: 'none' });
    cc = [await newAccount(10), await newAccount(10)]; // concurrent-claim accounts
    ix = [await newAccount(10), await newAccount(10)]; // independence accounts
    m = await newAccount(40); // one account bound to both cids of a two-round game
    const game = async (rounds, users, nPlayers = 3) => {
      const a = await R.fillRoom(srv.base, { n: nPlayers, rounds, users });
      const ra = await R.playRound(srv.base, a, plan);
      return { a, ra };
    };
    // gC p3 and gI p3 are joined without u on purpose (unbound cid)
    [gC, gI, gM] = await Promise.all([game(1, [cc[0].u, cc[1].u]), game(1, [ix[0].u, ix[1].u]), game(2, [m.u, m.u], 2)]);
    gM.b = await R.nextRound(srv.base, gM.a);
    gM.rb = await R.playRound(srv.base, gM.b, plan);
    // a room that is still running, for the unfinished-round case
    mid = await R.fillRoom(srv.base, { n: 2, rounds: 1, users: [accounts[0].u] });
    await R.startClock(srv.base, mid);
  });
  after(async () => { [room1, room2, mid, gC && gC.a, gI && gI.a, gM && gM.a, gM && gM.b].forEach((r) => r && r.close()); await srv.stop(); });

  it('round 1 claim: balance is max(0, pts + round points), no bonus', async () => {
    for (let i = 0; i < 3; i++) {
      const cid = room1.cids[i];
      const r = await claim(accounts[i], body(room1, r1.res, cid, `r1-${i}`));
      assert.equal(r.status, 200, cid);
      assert.equal(r.json.pts, S.claimBalance(INITS[i], r1.res.d[cid], 0), cid);
      accounts[i].pts = r.json.pts;
    }
  });

  it('round 2 (last round) claim: floor first, then the winner bonus', async () => {
    for (let i = 0; i < 3; i++) {
      const cid = room2.cids[i];
      const bonus = r2.res.win.includes(cid) ? r2.res.bonus : 0;
      const r = await claim(accounts[i], body(room2, r2.res, cid, `r2-${i}`));
      assert.equal(r.status, 200, cid);
      assert.equal(r.json.pts, S.claimBalance(accounts[i].pts, r2.res.d[cid], bonus), cid);
      accounts[i].pts = r.json.pts;
    }
  });

  it('same rid again is 200 dup:true and changes nothing', async () => {
    const r = await claim(accounts[0], body(room1, r1.res, room1.cids[0], 'r1-0'));
    assert.equal(r.status, 200);
    assert.equal(r.json.dup, true);
    assert.equal(r.json.pts, accounts[0].pts);
  });

  it('a different rid for the same room, round and cid is 409', async () => {
    const r = await claim(accounts[0], body(room1, r1.res, room1.cids[0], 'another-rid'));
    assert.equal(r.status, 409);
  });

  // Request identity is stated per scenario. kind(): mutation = 200 without dup, idempotent = 200 with dup:true,
  // conflict = 409.
  const kind = (r) => (r.status === 200 && r.json && r.json.dup === true ? 'idempotent' : r.status === 200 ? 'mutation' : r.status === 409 ? 'conflict' : `other:${r.status}`);
  const pointsOf = async (a) => (await acc({ t: 'get', u: a.u, tok: a.tok })).json.pts;
  const expected = (g, cid, start) => S.claimBalance(start, g.ra.res.d[cid], g.ra.res.win.includes(cid) ? g.ra.res.bonus : 0); // single-round game: round 1 is the last

  it('concurrent claims, DIFFERENT rid, same account and key: one mutation and one 409, points added once', async () => {
    const cid = gC.a.cids[1]; // bound to cc[1]
    const [x, y] = await Promise.all([claim(cc[1], body(gC.a, gC.ra.res, cid, 'rid-A')), claim(cc[1], body(gC.a, gC.ra.res, cid, 'rid-B'))]);
    assert.deepEqual([kind(x), kind(y)].sort(), ['conflict', 'mutation']);
    assert.equal(await pointsOf(cc[1]), expected(gC, cid, 10));
  });

  it('concurrent claims, SAME rid, same account and key: one mutation and one idempotent repeat, points added once', async () => {
    const cid = gC.a.cids[0]; // bound to cc[0]
    const [x, y] = await Promise.all([claim(cc[0], body(gC.a, gC.ra.res, cid, 'same-rid')), claim(cc[0], body(gC.a, gC.ra.res, cid, 'same-rid'))]);
    assert.deepEqual([kind(x), kind(y)].sort(), ['idempotent', 'mutation']);
    assert.equal(await pointsOf(cc[0]), expected(gC, cid, 10));
  });

  it('independent claims: one account bound to several cids claims several cids and rounds', async () => {
    const s1 = await claim(m, body(gM.a, gM.ra.res, gM.a.cids[0], 'multi-1'));
    const s2 = await claim(m, body(gM.a, gM.ra.res, gM.a.cids[1], 'multi-2'));
    const s3 = await claim(m, body(gM.b, gM.rb.res, gM.b.cids[0], 'multi-3'));
    assert.deepEqual([s1.status, s2.status, s3.status], [200, 200, 200]);
  });

  it('a cid bound to another account is 403, and the failed attempt does not consume the claim', async () => {
    const cid = gI.a.cids[1]; // bound to ix[1]
    const bad = await claim(ix[0], body(gI.a, gI.ra.res, cid, 'steal'));
    assert.equal(bad.status, 403);
    const own = await claim(ix[1], body(gI.a, gI.ra.res, cid, 'iy'));
    assert.equal(own.status, 200);
  });

  it('independent claims: two accounts claiming their own cids of the same round are both 200', async () => {
    const rx = await claim(ix[0], body(gI.a, gI.ra.res, gI.a.cids[0], 'ix'));
    assert.equal(rx.status, 200);
    // ix[1] already claimed its own cid in the previous test, so a repeat of that rid is a 200 dup and not a second charge
    const ry = await claim(ix[1], body(gI.a, gI.ra.res, gI.a.cids[1], 'iy'));
    assert.equal(ry.status, 200);
    assert.equal(ry.json.dup, true);
  });

  it('a cid that joined without u (unbound) is 403 for any account', async () => {
    const r = await claim(ix[0], body(gI.a, gI.ra.res, gI.a.cids[2], 'unbound'));
    assert.equal(r.status, 403);
  });

  it('unknown room code, unknown round number, cid not in the round: 404', async () => {
    const a = await newAccount(10);
    const ok = body(room1, r1.res, room1.cids[2], 'x');
    assert.equal((await claim(a, { ...ok, code: '19999', rid: 'n1' })).status, 404, 'unknown code');
    assert.equal((await claim(a, { ...ok, round: 99, rid: 'n2' })).status, 404, 'unknown round');
    assert.equal((await claim(a, { ...ok, c: 'stranger', rid: 'n3' })).status, 404, 'cid not in round');
  });

  it('round that has not finished: 404', async () => {
    const a = await newAccount(10);
    const r = await claim(a, { code: mid.code, round: 1, c: mid.cids[0], rid: 'unfinished' });
    assert.equal(r.status, 404);
  });

  it('bad or missing token: 403', async () => {
    const r = await acc({ t: 'add', u: accounts[0].u, tok: 'wrong', ...body(room1, r1.res, room1.cids[0], 'bad') });
    assert.equal(r.status, 403);
  });

  it('request budget stays under the /acc rate limit', (t) => { t.diagnostic(`/acc calls: ${acc.count()}`); assert.ok(acc.count() <= 55, `used ${acc.count()}`); });
});
