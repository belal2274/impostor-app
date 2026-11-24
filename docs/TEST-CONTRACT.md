# BMF lobby server: test contract (dev branch)
No secrets here. The random category is out of scope for tests and must not be touched.

## 0. How to run the server for tests
- Runtime: Node >= 18, no dependencies. `server.js` listens on load (it exports nothing), so tests start it as a child process: `PORT=<free port> node server.js`.
- Do not set SUPA_URL / SUPA_KEY. Without them accounts live in memory (same code path, fake store). No external network is needed.
- Health: `GET /health` returns 200.
- Existing tests in the repo: none. My puppeteer tests are outside the repo. A dependency-free `node:test` suite under `tests/**` using fetch against the child process is fine. One PR per repo to `dev`.
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
- Ownership: the join message may carry `u:<username>`. The server binds that cid to the account for that room (first join of a cid wins, repeat joins are ignored) and the binding carries into next-round rooms. A claim for a cid bound to a different account, or unbound, -> 403 `not your player`. So claim tests must join with `u` equal to the claiming account.
- Consumption is global per (room, round, cid): once claimed, nobody else can claim it (409).

Room endpoints (room code in the path, JSON body with `t`): join `j` (host creates), `ready`, `vote`, `state`, `fx`, etc. Room create (host join only): n 2..9 else 404; rounds = floor, clamped 1..20, non-numeric -> 3; dur seconds clamped 60..900, non-numeric -> 180. Sent only in the host's first join, ignored afterwards. Next-round rooms keep rounds and dur.
- fx `{t:'fx',k,s}`: id must start with s or a and exist in catalog, round must have started (goAt set) else 400; sender must be in the round else 403.

## 3. Cooldown (fx)
- Scope: per player (cid) inside one round. Not per item, not per room.
- Measured from the last ACCEPTED send. Rejected attempts (429 'wait') do not reset it.
- `now - last < 3000` is rejected, so exactly 3000 ms is accepted.
- Stored for the 30 most recent events, kept 30 s.

## 4. Settings boundaries
Numeric out-of-range values are clamped (rounds 0 -> 1, dur 0 -> 60; 99 -> 20, 5000 -> 900). Non-integers are floored. Missing or non-numeric values use the defaults (rounds 3, dur 180). After the room exists the host values are ignored.

## 5. Room protocol, exact shapes
Base: `POST /r/<code>` with a JSON body, `Content-Type` any. `<code>` = 5 digits: digit 1 = category (1..9), digit 2 = player count n (2..9), digits 3-5 any (e.g. `13123` = category 1, 3 players). Rate limit 1500 req/min per IP. Body max 4096 bytes. Every body needs `t` (string) and `c` (string cid, max 20 chars, your client id, one per player). Errors are plain text.
Live stream: `GET /r/<code>?c=<cid>` is server-sent events. Each line is `data: <json>`. Join messages echo as `{t:'j',v:'full'|'fam',c,n,a}` and when the room fills each member gets `{t:'role',imp:bool,r:int|null}`. `r` is the word index for non-impostors, null for the impostor. Tests can learn the impostor from this (the `reveal` POST answers 403 `later` while a round is running).

### join (create + fill)
`{t:'j', c:'p1', n:'Ali', a:'', v:'full', u:'<username, optional>'}` -> 200 `ok`. The first join of a code by `{host:true, rounds:3, dur:180}` creates the room (host = leader). Without host and with no room -> 404 `no room`. `n` name max 14 chars, `a` avatar string (''), `v` 'fam' or 'full'. A repeat join or full roster -> 200 `ok` (ignored). `{t:'l', c}` leaves while in the lobby. When the roster reaches n, the round object is created (players fixed = roster).

### ready / start
All players POST `{t:'ready', c}` -> state JSON. When all are ready the server sets `ca` (countdown ms, 3000). After that time each player POSTs `{t:'seen', c}`. When all have seen, the round clock starts (`el` in state is ms since start). Votes are accepted only after that.

### vote / end
`{t:'vote', c, v:<target cid>}` -> state JSON. Target must be another player in the round, otherwise ignored (still 200). The last non-impostor vote ends the round automatically. The leader may end early: `{t:'close', c:<leader cid>}`. Both produce `res`.

### state
`{t:'state', c, s:<last fx index seen or 0>}` -> 200 JSON:
`{k,n,el,nx,rd,rm,ca,sn,vt,mine,round,rounds,dur,lead,res,fx,fxs}`
- `n` players, `rd` ready count, `vt` votes cast, `mine` my vote cid or null, `round`/`rounds`, `dur` seconds, `lead` leader cid, `nx` code of the next-round room (or null), `fxs` total fx events, `fx` events newer than `s`.
- `res` is null until the round ends, then `{win,bonus,imp,r,votes,d,tot,disc,round,rounds,at}`: `d` = round points per cid, `tot` = room totals per cid, `win` = winner cids (last round only, else []), `bonus`, `imp` impostor cid, `votes` map voter->target, `disc` discovered flag.
- Not in the round -> 403 `no`.

### next round
Leader POSTs `{t:'again', c:<leader>, cat:<1..9>}` after `res` exists (any player after 120 s). It creates a new room code `nx` with the same roster, rounds, dur, and totals carried over. Everyone then joins `nx` (`state` on the new code). After the last round it returns 400 `finished` unless `ng:true` (starts a fresh game, totals reset).

### fx
`{t:'fx', c, k:'s1', s:0}` -> 200 state JSON (with `fx:[{i,f,k,t}]`). 400 `bad fx` (id not s*/a* or unknown or round not started), 403 `no`, 429 `wait`.

### claim (account points)
`POST /acc {t:'add', u:'<username>', tok:'<from signup/login>', rid:'<any string, optional>', code:'<room code where that round was played>', round:<number>, c:'<cid>'}` -> 200 `{pts}`.
- `code` = the code of the room object in which the round ended. After `again`, the next round lives under the new code `nx`, so use that code for that round.
- `rid` is stored on the account (last 60). Repeating a stored rid -> 200 `{pts, dup:true}` with no change. Different rid for the same (round, cid) -> 409 `already claimed`.
- Round result for the claim comes from the server, not the request.

### Independence (confirmed)
Claim key is (room, round, cid). Different accounts, or different cids, or different rounds do not affect each other. One account can claim for several cids/rounds. Concurrent identical requests: one 200, one 409/dup.

### Safe items for purchase tests (from catalog.json, current prices)
Sticker `s1` = 10, sound `a1` = 5, frame `k1` = 10. Signup with `init:40` gives a 40 coin balance (init is capped 0..40).
Expected: buy s1 -> pts 30; buy a1 -> 25; buy k1 -> 15; repeat any -> 200 `dup:true`, no charge; unknown id -> 400; balance below price -> 402. Read prices from catalog.json in tests rather than hardcoding them.

### Reveal and voice mode (new)
Round start: all ready -> `ca` 3 s countdown -> role shown 10 s to everyone (`rv` ms left) -> play (`el` set). The old "everyone pressed seen" gate is gone; `seen` is still accepted and ignored.
Create with `vm:'game'|'ext'` in the host join. `dur` clamps 60..3600 s. See DEV-NOTES "Voice mode" for `tk`, `ask`, `tdone`.
