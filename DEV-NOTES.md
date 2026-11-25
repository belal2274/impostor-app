
## Temporary "unlock everything" switch
`rules.unlock_all` in items.json (true during development). When true, every sticker, sound and frame counts as owned for everyone, guests included. Nothing is written to anyone's stored items or points, so setting it to false (then `python3 scripts/make_catalog.py`, bump BUILD/version.json/catalog.js?v=) restores normal buying with each account's real balance and real purchases untouched. The server never checks ownership when a sticker or sound is sent, so no server change is needed. MUST be false before any commercial launch.
