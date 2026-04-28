# FUTURE.md — Musings

Ideas and backlog. Not history — see [CHANGELOG.md](CHANGELOG.md) for shipped items.

---

## NOW

*(nothing urgent)*

---

## NEXT

### Product
- **Tag pages** — `/ideas/tag/{slug}/`, `/notes/tag/{slug}/` listing pages — low build complexity, already have tag data
- **Dark mode** — optional toggle; chrome and doc both need token variants; persist in `sessionStorage`
- **Search** — client-side (Pagefind or similar); no server required

### Tech Debt
- **CSS line count audit** — `components.css` has grown; consider splitting post-nav and archive into separate files
- **Feed validation in CI** — currently a manual post-push step; worth automating in `deploy.yml`

---

## LATER

### Product
- `v4.0.0` — complete visual overhaul (new site concept; resets MAJOR version)
- Reading time estimate in post meta
- Related posts by tag at bottom of doc layout

### DX
- Formatting enforced for Nunjucks templates — currently no formatter in the chain
