# dev branch (work in progress, NOT released)
Snapshot of the unreleased BMF Impostor build (Android project in app/, web client in app/src/main/assets/www/index.html).
- Do not open PRs against main or gh-pages unless the owner asks. Open PRs against `dev`.
- No Deploy, no release edits, no direct push to main/gh-pages.
- Random category (العشوائي): only words dictated by the owner. Do not add words.
- tests/ holds puppeteer scripts (they need a local lobby server from the bmf-lobby repo, dev branch).

## Adding content (data-driven)
Edit `items.json`, then run `python3 scripts/make_catalog.py` (writes www/catalog.js and catalog.json). Copy catalog.json into the lobby server repo so prices match.
- Sticker: put the file in www/fx (s<N>.webp), add an entry with id s<N> and price.
- Sound: a<N>.mp3 in www/fx, entry with id a<N>.
- Frame: add a design function in the FRM list in index.html, plus an entry k<N> with name and price.
- Avatar: drop m*/w*/f*.webp in www/img/av, rerun the script.
- Words: data/categories.json (never the random category).
- Prices: change the number in items.json and rerun.
- Name font: put the subset .woff in www/fonts, add `{id:"f<N>", file, lang:"ar"|"en", credit}` to items.json, rerun the script. The About screen lists the credit lines automatically.
- Forgotten password: see bmf-lobby DEV-NOTES.md (owner-only script).

## Voice mode, reveal and round rules (rules file)

All timings live in `items.json` -> `rules` (run `python3 scripts/make_catalog.py`, copy `catalog.json` to the server repo):
`reveal` 10 s (role shown to everyone, then play starts, both modes), `ask` 60, `ans` 60, `disc` 300 (all mics, ends early when every player presses done), `cap` 3600 (round auto-closes), `dur_min`/`dur_max` (host round length, minutes, external mode).

Host picks `vm` at room creation: `ext` (external call: no in-game voice UI, no mic flow, host round length) or `game` (in-game voice, turn flow, no fixed round length, 60 min hard cap in both modes).

Server state (`stateOf`): `vm`, `rv` (ms left of reveal, else null), `tk` = `{ph:'ask'|'ans'|'disc', a:asker, t:target, u:ms left, cyc, dn, dm}` (null in ext mode or before play).
Messages: `{t:'ask', c, v:target}` (asker only, target must be another player), `{t:'tdone', c}`: asker with a target -> answer phase; asker without target -> skip; target during `ans` -> next turn; any player in `disc` marks done (all done -> next cycle). Ask with no target at timeout or target gone -> skipped. After the last asker, `disc`, then a new cycle. Votes are open at any time.
Mic gating is enforced by the app only (the server only owns the turn state).
Tests: tests/vm.js (http state machine), tests/vmui.js (3 browsers, fake mic).
