'use strict';
// Starts the lobby server as a child process on a free localhost port.
// No SUPA_* env vars are passed, so accounts live in memory. No network needed.
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');

// Where is server.js? In order: BMF_SERVER (file), LOBBY_DIR/server.js (a local bmf-lobby checkout),
// then the repo root of bmf-lobby. Returns null when none exists (tests then skip, they do not fail).
function findServer() {
  const c = [];
  if (process.env.BMF_SERVER) c.push(process.env.BMF_SERVER);
  if (process.env.LOBBY_DIR) c.push(path.join(process.env.LOBBY_DIR, 'server.js'));
  return c.find((f) => fs.existsSync(f)) || null;
}
const SERVER = findServer();
const SKIP = SERVER ? false : 'LOBBY_DIR is not set (path to a local authorised bmf-lobby checkout): lobby contract tests skipped';

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  const port = await freePort();
  const file = SERVER;
  if (!file) throw new Error(SKIP);
  const env = { PATH: process.env.PATH, PORT: String(port) }; // deliberately no SUPA_URL / SUPA_KEY
  const child = spawn(process.execPath, [file], { env, cwd: path.dirname(file), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  const t0 = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error('server exited early: ' + log.slice(0, 500));
    try { const r = await fetch(base + '/health'); if (r.status === 200) break; } catch (e) { /* not up yet */ }
    if (Date.now() - t0 > 8000) { child.kill(); throw new Error('server did not start in 8s'); }
    await sleep(50);
  }
  return { base, port, stop: () => new Promise((res) => { child.once('exit', res); child.kill(); }) };
}

// /acc allows 60 requests per minute per IP. This helper keeps every test file
// under ACC_BUDGET calls in any 60 s window by sleeping when needed.
const ACC_BUDGET = 50;
function makeAccClient(base) {
  const stamps = [];
  let total = 0;
  async function acc(body) {
    for (;;) {
      const now = Date.now();
      while (stamps.length && now - stamps[0] > 60000) stamps.shift();
      if (stamps.length < ACC_BUDGET) break;
      await sleep(stamps[0] + 60000 - now + 20);
    }
    stamps.push(Date.now());
    total++;
    const r = await fetch(base + '/acc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* plain text error body */ }
    return { status: r.status, text, json };
  }
  acc.count = () => total;
  return acc;
}

module.exports = { startServer, makeAccClient, sleep, SKIP, SERVER };
