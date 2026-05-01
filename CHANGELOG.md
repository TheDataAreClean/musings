# CHANGELOG

Version bump policy: MAJOR = complete visual redesign or change in site concept; MINOR = new feature, section, or page type; PATCH = bug fix, design tweak, content push.

---

## UNRELEASED

—

---

## 2026-05-01 (v3.2.1)

- feat: subtitles on Notes, Ideas, Snaps index pages via `doc-description` class
- fix: RSS link now appears on all section index pages (was home-only)
- fix: about page no longer shows date, word count, or tags (`hideMeta: true`)
- refactor: home subtitle moved from markdown body to `description` front matter

---

## 2026-05-01 (v3.2.0)

- infra: date backfill system — `scripts/backfill-dates.js` fills git creation time into date-only front matter; runs as `prebuild` hook before every build; fixes same-day post ordering
- infra: `prebuild` npm hook chains backfill + webp so `npm run build` handles everything; deploy.yml simplified to two steps
- fix: snaps index tag filter now correctly excludes all collection tags (was only excluding `snaps`)
- fix: SVG images no longer served as broken WebP paths
- fix: `manifest.json` icon corrected from missing `icon-192.png` to existing `favicon-512.png`
- refactor: nav extracted to `src/_includes/nav.njk` — single source across all 6 pages
- refactor: `collectionTags` and `postSigil` Eleventy filters replace duplicated inline logic
- refactor: shared `stripHtml` helper consolidates `wordcount` and `readtime` filters
- feat: `src/404.md` — 404 page now exists
- chore: dead CSS selector `.app-titlebar__app` removed

---

## 2026-05-01 (v3.1.2)

- fix: dot separator restored between read time and tags on post page
- fix: tag spacing on post page now matches home page (CSS margin, no leading spaces)
- fix: tag page count line removed — title and list are sufficient
- fix: counts removed from Ideas, Notes, Snaps index pages
- feat: tag name highlighted in yellow on tag page via `<mark>`

---

## 2026-04-30 (v3.1.1)

- feat: image captions via markdown — `![alt](url "Caption")` renders as `<figure>` with `<figcaption>`; caption font follows the doc font switcher
- infra: WebP conversion in deploy pipeline — `npm run webp` converts uploads before build, auto-rotates via EXIF, deletes originals; images rendered as `<picture>` with WebP-only src (no JPEG fallback)
- fix: feed timestamps now capture actual publish time — Sveltia date widget stores full datetime (`YYYY-MM-DDTHH:mm:ssZ`) instead of date-only

---

## 2026-04-24 (v3.0.0)

- feat: Notion pipeline removed — Sveltia CMS (Git-based) is now the canonical authoring layer
- feat: slug override field added to Sveltia CMS collections
- infra: Cloudflare Worker OAuth proxy for GitHub authentication

---

## v2.x

- v2.5.0: Add — Sveltia CMS, Cloudflare Worker OAuth, optional slug override
- v2.4.0: Add — RSS link in doc nav, feed category tags, shortTitle token, og:title home fix
- v2.3.1: Fix — browser tab uses shortTitle "Musings"; full title retained for feed and OG
- v2.3.0: Add — combined Atom feed at /feed.xml (ideas + notes + snaps), site.title as single source
- v2.2.5: Fix — scale down favicon, fix post-tag colour override
- v2.2.4: Fix — favicon mobile support (ICO, apple-touch-icon, manifest), tag highlight on article pages
- v2.2.3: Fix — three-tier sort order, IST display dates, `updated` stored as full datetime
- v2.2.2: Add — image optimisation via sharp, slug rename on change
- v2.2.1: Fix — tag URL normalisation, version sync, checklist update
- v2.2.0: Add — article description display, Slug override property, local test content convention
- v2.1.3: Update — sync script reads manual Date property instead of page created_time
- v2.1.2: Fix — pre-push review: typos, feed RFC 3339 datetime, package.json version sync
- v2.1.1: Add — og:url, og:site_name, twitter:card, theme-color meta tags
- v2.1.0: Add — auto-download Notion images to src/images/notion/ on sync
- v2.0.1: Fix — codebase review: bugs, dead tokens, docs gaps
- v2.0.0: **Notion becomes canonical authoring layer** — CMS sync, daily Action, idempotent pipeline

---

## v1.x

- v1.1.2: Docs — release history added to CLAUDE.md
- v1.1.1: Docs — README and CLAUDE.md updated for snaps and current state
- v1.1.0: Add — ideas, notes, snaps, tag pages, mobile layout, GitHub Pages deployment
- v1.0.0: **Site reaches definitive form** — nav inside document, full typographic flattening
- v0.2.1: Fix — app chrome: five targeted improvements
- v0.2.0: Redesign — word-processor chrome, unformatted doc aesthetic
- v0.1.0: Initial build — brutalist living-document concept
