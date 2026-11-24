# Testing the lobby server

Local tests only. They start `server.js` as a child process on a free localhost port. No `SUPA_*` env vars are set, so accounts live in memory. No network, no secrets.

## Run
Node 18 or newer. No install step, no dependencies.

    node --test tests/contract/*.test.js

The server file is found in this order: `BMF_SERVER` (a file path), `LOBBY_DIR/server.js` (a local bmf-lobby checkout). If neither is set the suites skip with a clear message (set `LOBBY_DIR` to a local, authorised bmf-lobby checkout; there is no URL option and no network call).

A full run takes about 30 to 70 seconds because each round has a 3 second countdown and the cooldown test waits 3 seconds.

## Layout
- `tests/contract/*.test.js`: test files (node:test + fetch): `health`, `accounts`, `store`, `rooms`, `scoring-model`, `scoring-e2e`, `final-rounds`, `claims`, `fx-cooldown`.
- `tests/contract/helpers/server.js`: starts and stops the server, and a `/acc` client that stays under the rate limit.
- `tests/contract/helpers/room.js`: room protocol helpers (join, ready, wait for the round clock, vote, close, state, again, SSE role).
- `tests/contract/helpers/scoring.js`: the scoring rules as code (spec model).
- `tests/contract/data/*.json`: constants and cases. Change rules or add cases here.
- The rules live in `docs/TEST-CONTRACT.md`. If a test and the contract disagree, the contract wins; fix the test.

## Add a case or change a rule
- New scoring case: add an object to `tests/contract/data/scoring.json` (`rounds`, `winners` or `claimBalance`). Write the expected values by hand from the contract. No code change.
- Changed constant (bonus pool, vote points, clamp values): edit `tests/contract/data/*.json`.
- New account case: add to `tests/contract/data/accounts.json` or copy one test in `tests/contract/accounts.test.js`.
- New store item: fill `tests/contract/data/items.json` with a real id and price. The buy tests switch on when it is filled.
- New feature: add `tests/contract/<feature>.test.js`, reuse `startServer()`, keep its data in `tests/contract/data/<feature>.json`.

## Rate limit
`/acc` allows 60 requests per minute per IP, and that limit is kept inside each server process (checked: after 60 calls one server answers 429 while a second server started beside it still answers normally). Every test file starts its own server, so files running at the same time do not share a window. Inside a file the `/acc` helper sleeps before the 50th call in any 60 s window, and a final test in each file that uses `/acc` reports the call count (about 20 to 40 per file). Do not share one server between files, and keep new account tests short. `/r` has a separate, much higher limit (1500 per minute).

## Known limits
- Cooldown (fx) planned checks: an immediate repeat is 429, a send at 3.1 s or later is 200, and a 429 does not reset the clock. These do NOT establish the exact 3000 ms boundary. Over real HTTP the timing is not exact. The boundary needs a fake clock or a direct unit test.
- Prices in `tests/contract/data/items.json` are copied from the contract, not read from the catalog file. Keep them in step.
- Not tested because the contract does not settle it: a second claim with no `rid`, and a stored `rid` reused for a different room, round or cid.
- Round start is ready, a 3 s countdown, a 10 s role reveal, then play. Helpers poll `state` until `el` is set (up to 13 s). `seen` is ignored by the server and is not sent. A round start therefore takes about 14 s.
- Voice mode is NOT covered: the `vm` host option, the `rv`/`tk` state fields and the `ask`/`tdone` messages exist in the server but have no tests here.
- Host `dur` clamps to 60..3600 and `rounds` to 1..20 (data in `tests/contract/data/rooms.json`).
- Claims need the room join to carry `u` equal to the claiming account (the server binds the cid to the first account that joins it). Tests pass `users: [...]` to `fillRoom`. A cid bound to another account, or joined without `u`, is 403. Consumption by a second account is therefore not reachable and is not tested.
- Concurrent claims state their identity: same rid gives one mutation and one `dup:true` repeat; a different rid gives one mutation and one 409. Both outcomes are confirmed by the owner.
- Green here is not full compliance: only the listed cases are covered.
- The word lists and the random category are out of scope. Tests never read them.
