# DEV-NOTES-extra

Short notes for the tests and docs added on this branch. Nothing here changes the server.

- Run all tests: `LOBBY_DIR=<path to a local bmf-lobby checkout> node --test tests/contract/*.test.js` (Node 18+, no dependencies). See `docs/TESTING-LOBBY-CONTRACT.md`.
- Data first: constants and cases are in `tests/contract/data/*.json`. New assets or features should add data or a new test file, not rewrite old tests.
- Scoring rules live in `docs/TEST-CONTRACT.md` and `tests/helpers/scoring.js`. Keep the three in step.
- Tests start the server themselves on a free port with no Supabase settings.
- Covered: health, accounts, store, room settings, scoring end to end, multi-round totals, claims, fx and cooldown (clear sides only).
- Not covered: the cooldown boundary at exactly 3000 ms, and claim cases the contract does not settle. Details in `docs/TESTING-LOBBY-CONTRACT.md`.
- Off limits for tests: word lists, the random category, secrets, anything outside localhost.
