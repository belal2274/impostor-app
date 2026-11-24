'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, SKIP } = require('./helpers/server');
if (SKIP) { test('lobby contract tests', { skip: SKIP }, () => {}); return; }

test('GET /health returns 200', async () => {
  const s = await startServer();
  try {
    const r = await fetch(s.base + '/health');
    assert.equal(r.status, 200);
  } finally { await s.stop(); }
});
