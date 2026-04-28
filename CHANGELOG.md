# CHANGELOG

Version bump policy: MAJOR = complete visual redesign or change in site concept; MINOR = new feature, section, or page type; PATCH = bug fix, design tweak, content push.

---

## UNRELEASED

—

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
