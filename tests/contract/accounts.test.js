'use strict';
// Account endpoint (POST /acc) tests against the real server run as a child process.
// Rules come from docs/TEST-CONTRACT.md. Cases and constants live in tests/data/*.json.
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, makeAccClient, SKIP } = require('./helpers/server');
if (SKIP) { test('lobby contract tests', { skip: SKIP }, () => {}); return; }
const D = require('./data/accounts.json');
const ITEMS = require('./data/items.json');

let srv; let acc; let n = 0;
const uname = (tag) => `t${tag}${Date.now().toString(36)}${n++}`;
const PW = 'secret123';

test.before(async () => { srv = await startServer(); acc = makeAccClient(srv.base); });
test.after(async () => { await srv.stop(); });

async function signup(init = 0, tag = 'u') {
  const u = uname(tag);
  const r = await acc({ t: 'signup', u, p: PW, init });
  return { u, r };
}

test('signup returns tok, pts and items', async () => {
  const { r } = await signup(10);
  assert.equal(r.status, D.statuses.ok);
  assert.equal(typeof r.json.tok, 'string');
  assert.ok(r.json.tok.length > 0);
  assert.equal(r.json.pts, 10);
  assert.ok(r.json.items !== undefined);
});

for (const c of D.initClamp) {
  test(`signup init ${c.init} clamps to ${c.expectPts}`, async () => {
    const { r } = await signup(c.init, 'c');
    assert.equal(r.status, D.statuses.ok);
    assert.equal(r.json.pts, c.expectPts);
  });
}

test('signup with a taken name is 409', async () => {
  const { u } = await signup(0, 'd');
  const r = await acc({ t: 'signup', u, p: PW, init: 0 });
  assert.equal(r.status, D.statuses.conflict);
});

test('login: right password 200 with tok, wrong password 403', async () => {
  const { u } = await signup(5, 'l');
  const ok = await acc({ t: 'login', u, p: PW });
  assert.equal(ok.status, D.statuses.ok);
  assert.equal(typeof ok.json.tok, 'string');
  assert.equal(ok.json.pts, 5);
  const bad = await acc({ t: 'login', u, p: PW + 'x' });
  assert.equal(bad.status, D.statuses.forbidden);
});

test('get: valid token 200, wrong or missing token 403', async () => {
  const { u, r } = await signup(7, 'g');
  const ok = await acc({ t: 'get', u, tok: r.json.tok });
  assert.equal(ok.status, D.statuses.ok);
  assert.equal(ok.json.pts, 7);
  assert.equal((await acc({ t: 'get', u, tok: 'wrong' })).status, D.statuses.forbidden);
  assert.equal((await acc({ t: 'get', u })).status, D.statuses.forbidden);
});

test('chpw: wrong old password 403, bad new length 400, success 200 and takes effect', async () => {
  const { u, r } = await signup(0, 'p');
  const tok = r.json.tok;
  const wrongOld = await acc({ t: 'chpw', u, tok, p: PW + 'x', n: 'newsecret1' });
  assert.equal(wrongOld.status, D.statuses.forbidden);
  for (const c of D.newPasswordRejected) {
    const bad = await acc({ t: 'chpw', u, tok, p: PW, n: 'a'.repeat(c.length) });
    assert.equal(bad.status, D.statuses.badRequest, c.label);
  }
  const ok = await acc({ t: 'chpw', u, tok, p: PW, n: 'newsecret1' });
  assert.equal(ok.status, D.statuses.ok);
  assert.deepEqual(ok.json, { ok: 1 });
  assert.equal((await acc({ t: 'login', u, p: 'newsecret1' })).status, D.statuses.ok);
  assert.equal((await acc({ t: 'login', u, p: PW })).status, D.statuses.forbidden);
});

test('chpw with a wrong token is 403', async () => {
  const { u } = await signup(0, 'q');
  const r = await acc({ t: 'chpw', u, tok: 'wrong', p: PW, n: 'newsecret1' });
  assert.equal(r.status, D.statuses.forbidden);
});

test('buy: unauthenticated 403, unknown item 400', async () => {
  const { u, r } = await signup(0, 'b');
  assert.equal((await acc({ t: 'buy', u, tok: 'wrong', item: ITEMS.unknownId })).status, D.statuses.forbidden);
  assert.equal((await acc({ t: 'buy', u, tok: r.json.tok, item: ITEMS.unknownId })).status, D.statuses.badRequest);
});

test('add (claim): unauthenticated 403, unknown round 404', async () => {
  const { u, r } = await signup(0, 'a');
  const body = { t: 'add', u, rid: 'r-none', code: '00000', round: 1, c: 'nobody' };
  assert.equal((await acc({ ...body, tok: 'wrong' })).status, D.statuses.forbidden);
  assert.equal((await acc({ ...body, tok: r.json.tok })).status, D.statuses.notFound);
});

test('login lock: 429 after the allowed failed attempts', async () => {
  const { u } = await signup(0, 'k');
  for (let i = 0; i < D.loginLock.failsAllowed; i++) {
    const bad = await acc({ t: 'login', u, p: 'wrong-' + i });
    assert.equal(bad.status, D.statuses.forbidden, `fail ${i + 1}`);
  }
  const locked = await acc({ t: 'login', u, p: 'wrong-final' });
  assert.equal(locked.status, D.loginLock.status);
});

test('request budget: this file stays under the /acc rate limit', (t) => {
  t.diagnostic(`/acc calls: ${acc.count()}`);
  assert.ok(acc.count() <= 55, `used ${acc.count()} /acc calls`);
});
