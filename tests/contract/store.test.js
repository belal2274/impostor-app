'use strict';
// Purchases through POST /acc (buy). Items and prices: tests/data/items.json.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, makeAccClient, SKIP } = require('./helpers/server');
const D = require('./data/items.json');

describe('store', { skip: SKIP }, () => {
  let srv; let acc; let n = 0;
  before(async () => { srv = await startServer(); acc = makeAccClient(srv.base); });
  after(async () => { await srv.stop(); });
  const user = async (init) => {
    const u = `st${Date.now().toString(36)}${n++}`;
    const r = await acc({ t: 'signup', u, p: 'secret123', init });
    return { u, tok: r.json.tok, pts: r.json.pts };
  };

  it('buying each safe item in turn charges its price', async () => {
    const a = await user(D.startBalance);
    assert.equal(a.pts, D.startBalance);
    for (const it of D.items) {
      const r = await acc({ t: 'buy', u: a.u, tok: a.tok, item: it.id });
      assert.equal(r.status, 200, it.id);
      assert.equal(r.json.pts, it.expectPts, it.id);
    }
  });

  it('buying an owned item again is 200 dup:true with no charge', async () => {
    const a = await user(D.startBalance);
    const first = await acc({ t: 'buy', u: a.u, tok: a.tok, item: D.items[0].id });
    const again = await acc({ t: 'buy', u: a.u, tok: a.tok, item: D.items[0].id });
    assert.equal(again.status, 200);
    assert.equal(again.json.dup, true);
    assert.equal(again.json.pts, first.json.pts);
  });

  it('balance below the price is 402 and nothing is charged', async () => {
    const a = await user(0);
    const r = await acc({ t: 'buy', u: a.u, tok: a.tok, item: D.items[0].id });
    assert.equal(r.status, 402);
    const g = await acc({ t: 'get', u: a.u, tok: a.tok });
    assert.equal(g.json.pts, 0);
  });

  it('balance exactly equal to the price buys it and leaves 0', async () => {
    const cheapest = D.items.reduce((m, x) => (x.price < m.price ? x : m));
    const a = await user(cheapest.price);
    const r = await acc({ t: 'buy', u: a.u, tok: a.tok, item: cheapest.id });
    assert.equal(r.status, 200);
    assert.equal(r.json.pts, 0);
  });

  it('request budget stays under the /acc rate limit', (t) => { t.diagnostic(`/acc calls: ${acc.count()}`); assert.ok(acc.count() <= 55, `used ${acc.count()}`); });

  it('unknown item is 400, wrong token is 403', async () => {
    const a = await user(D.startBalance);
    assert.equal((await acc({ t: 'buy', u: a.u, tok: a.tok, item: D.unknownId })).status, 400);
    assert.equal((await acc({ t: 'buy', u: a.u, tok: 'wrong', item: D.items[0].id })).status, 403);
  });
});
