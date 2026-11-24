# BMF lobby server: test contract (dev branch)
No secrets here. The random category is out of scope for tests and must not be touched.

## 0. How to run the server for tests
- Runtime: Node >= 18, no dependencies. `server.js` listens on load (it exports nothing), so tests start it as a child process: `PORT=<free port> node server.js`.
- Do not set SUPA_URL / SUPA_KEY. Without them accounts live in memory (same code path, fake store). No external network is needed.
- Health: `GET /health` returns 200.
- Existing tests: puppeteer browser tests are in impostor-app tests/ (they need a local Chrome). The server repo has none. A dependency-free `node:test` suite under `tests/**` using fetch against the child process is fine. One PR per repo to `dev`.
- Do not edit: server.js, catalog.json, scripts/**. Add only new files under tests/** and docs/**.
- Rate limit: `/acc` is limited to 60 requests/min per IP, so keep per-test request counts low or space them.

## 1. Scoring (per round, server computed)
- Players = `ids` fixed when the round starts (st.ids). Disconnects do not change it. A player who never votes counts as "no vote".
- Impostor is one of ids. "Picker" = a non-impostor whose vote target is the impostor.
- Non-impostor: picks impostor +2, picks someone else -1, no vote -2. The impostor's own vote is not scored (it does count in the vote tally used for "discovered").
- others = n-1; picks = number of pickers; nonPick = others - picks.
- Impostor points: n >= 5: nonPick - picks. n < 5: (5, or 0 if picks == others) - picks.
- Round points can be negative. The room total (room.scores) is a plain running sum and is NOT floored.
- Discovered flag: impostor has the single highest tally and > 0.
- Last round only: winners = ids with max room total (ties share). bonus = floor(10 / winners). Everyone at 0 on the last round = all win. Max 9 players, so bonus is always >= 1 and 10 never splits to 0.

## 2. Interfaces (POST JSON)
Account store: `POST /acc`, body `{t, u, ...}`. Errors are plain text bodies, success is JSON.
- signup `{t:'signup',u,p,init}` -> 200 `{tok,pts,items}` | 400 | 409 name taken. init clamps to 0..40.
- login `{t:'login',u,p}` -> 200 `{tok,pts,items}` | 403 | 429 after 8 fails in 10 min.
- get `{t:'get',u,tok}` -> `{pts,items}`.
- chpw `{t:'chpw',u,tok,p,n}` -> 200 `{ok:1}` | 403 wrong old/token | 400 new not 6..64 chars.
- buy `{t:'buy',u,tok,item}` -> 200 `{pts,items}` (already owned: 200 with dup:true, no charge) | 402 not enough | 400 unknown item.
- add (claim) `{t:'add',u,tok,rid,code,round,c}` -> 200 `{pts}`.
- Unauthenticated (missing/wrong tok) for get/buy/add/chpw -> 403.
Item ids: sticker s*, sound a*, frame k*; prices come from catalog.json.

Claim rules (add):
- Round unknown, not finished, or cid not in that round -> 404. A round only exists in history once its result is computed.
- Same (round, cid) claimed twice -> second is 409 (or 200 `dup:true` when the same rid was already stored on the account). Calls for one account are serialized (lock), so concurrent identical claims give one 200 and one 409/dup. Different accounts/cids are independent.
- Balance rule per claim: bal = max(0, pts + roundPoints), then + bonus if winner. So the floor applies per claim before the bonus, not on the aggregate.
- Known limit: the claim names a cid, and the account is not bound to the cid on the server.

Room endpoints (room code in the path, JSON body with `t`): join `j` (host creates), `ready`, `vote`, `state`, `fx`, etc. Room create (host join only): n 2..9 else 404; rounds = floor, clamped 1..20, non-numeric -> 3; dur seconds clamped 60..900, non-numeric -> 180. Sent only in the host's first join, ignored afterwards. Next-round rooms keep rounds and dur.
- fx `{t:'fx',k,s}`: id must start with s or a and exist in catalog, round must have started (goAt set) else 400; sender must be in the round else 403.

## 3. Cooldown (fx)
- Scope: per player (cid) inside one round. Not per item, not per room.
- Measured from the last ACCEPTED send. Rejected attempts (429 'wait') do not reset it.
- `now - last < 3000` is rejected, so exactly 3000 ms is accepted.
- Stored for the 30 most recent events, kept 30 s.

## 4. Settings boundaries
Out of range values are clamped, not rejected. Non-integers are floored. After the room exists the host values are ignored.
