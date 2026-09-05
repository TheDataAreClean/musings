# CHANGELOG

Version bump policy: MAJOR = complete visual redesign or change in site concept; MINOR = new feature, section, or page type; PATCH = bug fix, design tweak, content push.

---

## UNRELEASED

---

## 2026-09-05 (v3.7.3)

- fix: the deploy workflow's "Commit generated content changes" step scoped `git status`/`git add` to `-- src/` only, but `src/images` is a symlink — writes prebuild scripts (e.g. `convert-webp.js`) make through it land at the real path `images/...`, outside `src/`. A converted upload was left unstaged, so the auto-commit's `git pull --rebase` failed on "unstaged changes" and the deploy silently didn't ship. Step now stages the whole working tree (`git add -A`) instead.

---

## 2026-09-05 (v3.7.2)

- fix: the browser-tab `<title>` still used the old em-dash + shortTitle format after `og:title` was unified to `{Page Name} | Musings | TheDataAreClean` — the two had drifted apart. `<title>` now uses the identical format, byte-for-byte, on every page.
- feature: 404 now has a real `og:image` (title "404", description "This page doesn't exist.", pulled from its own on-page text). `ogImageSlug` now strips a trailing `.html` too — 404's `page.url` is `/404.html` (its permalink has no trailing slash, unlike every other page), which would otherwise slug to a colliding `404.html.png`.

---

## 2026-09-05 (v3.7.1)

- feature: `og:image` generation extended to every page type — home, the three section indices (with their real sigils), every tag page (title highlighted like the real `<mark>{{ tag }}</mark>`, description a live-computed post count), and About. Gating in `base.njk` switched from `ogType == "article"` to a new `ogImageExists` check, so image coverage is decoupled from `og:type` and any page the generator covers gets the tags automatically.
- fix: About page previously had a broken `og:image` (referenced a PNG that was never generated, 404ing in link previews) — now generates a real one.
- fix: every tag page (`/tags/{tag}/`) previously shared one identical, generic `<title>`/`og:title`/description across all of them — now each has its own via `eleventyComputed`.
- design: `og:title` format unified to `{Page Name} | Musings | TheDataAreClean` across every page (was an inconsistent mix of em-dash and pipe separators, and the 404 page said "Page not found" instead of "404").
- design: section index pages (`/ideas/`, `/notes/`, `/snaps/`) and About now have real `og:description`s pulled from their own on-page content, instead of falling back to the generic site-wide description.
- infra: `images/og/` now mirrors each page's own URL hierarchy (`images/og/ideas/2026-08-15-grandmother.png`, `images/og/tags/family.png`) instead of one flat directory of hyphenated filenames.

---

## 2026-09-05 (v3.7.0)

- design: Georgia is now the document body's default font (`--font-doc`), switchable to Arial via the font dropdown — was the reverse. `--font-ui` (chrome) is unaffected, still always Arial.
- feature: per-post `og:image` — generated at build time (`scripts/generate-og-images.js`, new `prebuild` step) as a real screenshot of the site's own doc-chrome (titlebar, title, description, tags), not a generic social card; wired into `base.njk` for pages using `doc.njk` (`ogType: article`), `twitter:card` upgraded to `summary_large_image` for those pages
- design: post tags moved to their own line below the date/read-time/section-label line; the section label lost its yellow highlight to visually distinguish "type of post" from topic tags
- docs: removed a stale `CLAUDE.md` trap entry describing the Obsidian Git plugin as part of the deploy workflow, and an Obsidian mention in `APP.md`'s images-symlink explanation — Obsidian-based authoring was dropped
- chore: standardized front-matter field order across all 25 posts to `title`, `description`, `date`, `tags`, `slug`, `permalink`, `draft`
- chore: `draft: false` made explicit on all 24 existing posts (previously implicit-by-omission on most)
- infra: `src/images` is now a symlink to a top-level `images/` directory instead of a real nested folder
- fix: Sveltia CMS `media_folder` pointed at `src/images/uploads`, which resolves locally through the symlink above but 404s via GitHub's Contents API (symlinks aren't traversed) — media wasn't showing in the CMS; pointed at the real path `images/uploads` instead
- fix: reverted an incomplete migration off Sveltia CMS to Obsidian-based authoring — `src/admin/` was restored, unused `obsidian-templates/` removed, docs (`APP.md`, `README.md`, `CLAUDE.md`) corrected back to describe Sveltia as the authoring path

---

## 2026-08-02 (v3.6.1)

- fix: `nav.njk` — site nav (`Home · Ideas · Notes · Snaps · About · RSS`) now a semantic `<nav>` element instead of `<p class="doc-nav">`, so readability-style content extractors (used by RSS readers' "fetch full page" fallback for sparse entries) correctly exclude it instead of folding it into extracted article content
- docs: `CLAUDE.md` trimmed of codebase-derivable content (stack facts, file map, a fact already in `.gitignore`)
- chore: pre-push checklist and release workflow moved from `CLAUDE.md` into `.claude/skills/release/SKILL.md`, loaded on demand instead of every session

---

## 2026-08-02 (v3.6.0)

- feat: `deploy.yml` — CI now auto-commits `prebuild`'s output (WebP conversions, backfilled dates/permalinks) back to `main` after every build, so generated content no longer requires a manual local build-and-push cycle to land in the repo
- infra: `deploy.yml` permissions scoped per-job instead of workflow-wide — only `build` holds `contents: write` (needed for the auto-commit), only `deploy` holds `pages`/`id-token: write`
- fix: `deploy.yml` auto-commit step rebases (`git pull --rebase`) before pushing, so a concurrent push (e.g. from Sveltia CMS) doesn't fail the build

---

## 2026-08-02 (v3.5.0)

- feat: `robots.txt` added — disallows all crawlers, with explicit entries for named AI/LLM crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, PerplexityBot, and others)
- feat: sitewide `<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">` added to `base.njk`

---

## 2026-08-02 (v3.4.1)

- fix: doc-body paragraph spacing — consecutive paragraphs (`p + p`) now have a small 8px gap instead of sitting fully flush against the indent

---

## 2026-07-20 (v3.4.0)

- feat: post nav — prev/next title arrows replaced with "← More [section]" and "All posts →" links
- feat: section name shown as first tag in post meta line, linking to the section index
- feat: RSS feed — post description now rendered as visible text at the top of each entry's content, not just the `<summary>` field
- fix: blockquote styles — left border, even padding, inter-paragraph spacing corrected
- fix: `backfill-permalink.js` — an empty/blank `slug` field (e.g. `slug: ''`, which Sveltia CMS writes when the field is left blank) is now treated as unset instead of producing a malformed permalink like `/snaps/2026-05-04-/`
- fix: RSS feed — images/figures now get inline spacing since feed readers don't load `main.css`
- chore: removed empty `src/fonts/` passthrough from Eleventy config
- content: "Tis the day!" and "Noted" — cleared stray empty `slug` field left by Sveltia CMS
- content: "Why do something?" moved from Ideas to Notes; permalink updated to `/notes/2026-07-11-vizchitra-2026/`

---

## 2026-05-03 (v3.3.1)

- fix: image filenames now use the post's `slug` front matter field (e.g. `2026-05-02-year-offline-{hash}.webp`) instead of the raw filename stem; falls back to filename stem when no slug is set
- fix: `convert-webp.js` renames existing WebP uploads that don't match the naming convention, in addition to newly converted files
- content: "FY 2025-26, offline" — blob image placeholders replaced with uploaded photos, typo fixed, photos link added

---

## 2026-05-02 (v3.3.0)

- feat: draft support — `draft: true` in front matter hides a post from home feed, section pages, and RSS while keeping the URL live for preview; `Draft` toggle added to Sveltia CMS for all three sections
- feat: RSS content footer — post tags rendered as visible text at the bottom of each Atom entry
- feat: slug → permalink backfill — `scripts/backfill-permalink.js` (runs as part of `prebuild`) writes a `permalink` into front matter when `slug` is set; date prefix is preserved from the filename
- fix: HEIC image support — `convert-webp.js` now converts HEIC uploads to WebP alongside JPEG/PNG
- fix: markdown image references automatically updated to `.webp` paths after conversion, so posts always reference the file that exists
- fix: `<img>` fallback in `<picture>` element now uses the original source path (not the `.webp` path), so images degrade correctly before conversion runs
- fix: broken `*.11tydata.js` directory data files (silently ignored by Eleventy 3.x) replaced with correct `.json` files; layout and tags were not being applied to any post

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
