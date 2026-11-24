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
