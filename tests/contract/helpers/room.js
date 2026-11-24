'use strict';
// Room protocol helpers (docs/TEST-CONTRACT.md section 5). Players are p1..pn; p1 is the host and leader.
const crypto = require('node:crypto');
const { sleep } = require('./server');

// Unique within this process so two rooms never share a code by chance.
const used = new Set();
function roomCode(n, cat = 1) {
  for (;;) {
    const c = `${cat}${n}${String(crypto.randomInt(0, 1000)).padStart(3, '0')}`;
    if (!used.has(c)) { used.add(c); return c; }
  }
}

async function post(base, code, body) {
  const r = await fetch(`${base}/r/${code}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* plain text */ }
  return { status: r.status, text, json };
}

// Server-sent events for one player. Resolves .role with {t:'role', imp, r}.
function listen(base, code, cid) {
  const ctrl = new AbortController();
  let onRole; let rejectRole;
  const role = new Promise((res, rej) => { onRole = res; rejectRole = rej; });
  const timer = setTimeout(() => rejectRole(new Error(`no role message for ${cid}`)), 15000);
  (async () => {
    try {
      const r = await fetch(`${base}/r/${code}?c=${cid}`, { signal: ctrl.signal });
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith('data:')) continue;
          let m = null;
          try { m = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }
          if (m && m.t === 'role') { clearTimeout(timer); onRole(m); }
        }
      }
    } catch (e) { /* aborted on close */ }
  })();
  return { role, close: () => { clearTimeout(timer); ctrl.abort(); } };
}

// Creates a room, fills it, waits for roles. Returns { code, cids, imp, leader, close }.
async function fillRoom(base, { n, rounds = 3, dur = 180, cat = 1, code = roomCode(n, cat), v = 'full', users = [] }) {
  const cids = Array.from({ length: n }, (_, i) => `p${i + 1}`);
  const host = await post(base, code, { t: 'j', c: cids[0], n: 'P1', a: '', v, host: true, rounds, dur, ...(users[0] ? { u: users[0] } : {}) });
  if (host.status !== 200) throw new Error(`host join ${host.status} ${host.text}`);
  const ls = [listen(base, code, cids[0])];
  for (let i = 1; i < n; i++) {
    ls.push(listen(base, code, cids[i]));
    await sleep(30);
    const j = await post(base, code, { t: 'j', c: cids[i], n: `P${i + 1}`, a: '', v, ...(users[i] ? { u: users[i] } : {}) });
    if (j.status !== 200) throw new Error(`join ${cids[i]} ${j.status} ${j.text}`);
  }
  const roles = await Promise.all(ls.map((l) => l.role));
  const imps = cids.filter((c, i) => roles[i].imp);
  if (imps.length !== 1) throw new Error(`expected one impostor, got ${imps.length}`);
  return { code, cids, users, imp: imps[0], leader: cids[0], close: () => ls.forEach((l) => l.close()) };
}

// ready -> countdown -> seen. After this the round clock runs and votes/fx are accepted.
async function startClock(base, room) {
  let last;
  for (const c of room.cids) last = await post(base, room.code, { t: 'ready', c });
  const ca = (last.json && last.json.ca) || 3000;
  await sleep(ca + 200);
  for (const c of room.cids) await post(base, room.code, { t: 'seen', c });
}

const state = (base, room, c = room.leader, s = 0) => post(base, room.code, { t: 'state', c, s });

// plan: { picks, wrong, none, impVote: 'none' | 'nonimp' }. Returns the votes actually cast (voter -> target).
function buildVotes(room, plan) {
  const non = room.cids.filter((c) => c !== room.imp);
  const votes = {};
  // The impostor votes first: the round ends when the last non-impostor votes, so a later vote would be ignored.
  if (plan.impVote === 'nonimp') votes[room.imp] = non[0];
  non.forEach((c, i) => {
    if (i < plan.picks) votes[c] = room.imp;
    else if (i < plan.picks + plan.wrong) votes[c] = non[(i + 1) % non.length];
  });
  return votes;
}

async function castVotes(base, room, votes) {
  for (const [c, v] of Object.entries(votes)) await post(base, room.code, { t: 'vote', c, v });
}

// Plays one round to its result. If any non-impostor does not vote, the leader closes it.
async function playRound(base, room, plan) {
  await startClock(base, room);
  const votes = buildVotes(room, plan);
  await castVotes(base, room, votes);
  let st = await state(base, room);
  if (!st.json || !st.json.res) { await post(base, room.code, { t: 'close', c: room.leader }); st = await state(base, room); }
  if (!st.json || !st.json.res) throw new Error('round did not end: ' + st.text);
  return { votes, res: st.json.res, st: st.json };
}

// Leader starts the next round room; everyone joins it. Returns a room object for the new code.
async function nextRound(base, room, cat = 1) {
  const a = await post(base, room.code, { t: 'again', c: room.leader, cat });
  if (a.status !== 200) throw new Error(`again ${a.status} ${a.text}`);
  const st = await state(base, room);
  const nx = st.json && st.json.nx;
  if (!nx) throw new Error('no nx code');
  const ls = room.cids.map((c) => listen(base, nx, c));
  for (const c of room.cids) {
    const k = room.cids.indexOf(c);
    const j = await post(base, nx, { t: 'j', c, n: c, a: '', v: 'full', ...((room.users || [])[k] ? { u: room.users[k] } : {}) });
    if (j.status !== 200) throw new Error(`rejoin ${c} ${j.status} ${j.text}`);
  }
  const roles = await Promise.all(ls.map((l) => l.role));
  const imp = room.cids.filter((c, i) => roles[i].imp)[0];
  return { code: nx, cids: room.cids, users: room.users || [], imp, leader: room.leader, close: () => ls.forEach((l) => l.close()) };
}

module.exports = { roomCode, post, listen, fillRoom, startClock, state, buildVotes, castVotes, playRound, nextRound };
