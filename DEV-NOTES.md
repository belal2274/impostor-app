
## Cache busting (web)
GitHub Pages caches files for about 10 minutes and we cannot set headers. index.html embeds BUILD and checks version.json (no-store) on load; if they differ it reloads once with a fresh query string. catalog.js is loaded as catalog.js?v=BUILD. On every web release bump BUILD in index.html (two places), the catalog.js ?v= value and version.json together. The Android app skips the check (it only runs on *.github.io).
