# FUTURE.md — Musings

Ideas and backlog. Not history — see [CHANGELOG.md](CHANGELOG.md) for shipped items.

---

## NOW

*(nothing urgent)*

---

## NEXT

### Product
- **Dark mode** — optional toggle; chrome and doc both need token variants; persist in `sessionStorage`
- **Search** — client-side (Pagefind or similar); no server required

### Tech Debt
- **CSS line count audit** — `doc-chrome.css` (~760 lines) and `components.css` (~560) have grown; consider splitting the menus/dropdowns and margin-note styles into their own files
- **Self-host Sveltia** — the CMS loads from unpkg. Installing it from npm isn't enough on its own: it fetches its chunks and some libraries (dayjs locales, leaflet) from unpkg too. Revisit if unpkg becomes unreliable

---

## LATER

### Hosting
- **Cloudflare** — deploy the same build with `wrangler` (Workers static assets) instead of GitHub Pages: no Pages artifact step, a preview URL per branch, and a `_headers` file for long caching of `/img/` and `?v=` assets. Needs a Cloudflare API token in repo secrets and a DNS change
- **Repo size** — the git history holds about 225 MB of original photos deleted after conversion. CI no longer downloads them (blobless checkout). Purging them needs a history rewrite and a force-push to `main`; only worth it if the repo itself becomes a problem

### Product
- Complete visual overhaul (new site concept; next MAJOR version)
- Related posts by tag at bottom of doc layout

### DX
- Formatting enforced for Nunjucks templates — currently no formatter in the chain
