# APP.md — Musings

Architecture and technical reference. Claude's operating manual lives in [CLAUDE.md](CLAUDE.md).

---

## Architecture at a glance

Static site generator (Eleventy 3.x) → HTML + CSS + JS → GitHub Pages.

No build tools, no bundler. Eleventy templates produce static HTML; all CSS and JS are served as-is.

**Author/deploy flow:**
1. Author writes `.md` in `src/` (directly, or via Sveltia CMS at `/admin/`)
2. Commit to `main` triggers `deploy.yml`
3. GitHub Actions: `npm ci && npm run build` → `_site/`
4. Pages deploys `_site/` to `musings.thedataareclean.com`

---

## Stack

| Concern | Choice |
|---|---|
| Generator | Eleventy 3.x |
| Templates | Nunjucks + Markdown |
| Styling | Vanilla CSS (~1,200 lines across 6 files) |
| JavaScript | Inline script in `base.njk` — no bundler |
| Fonts | Georgia (document default); Arial (chrome, always; user-switchable for the document) |
| Hosting | GitHub Pages + custom domain |
| CMS | Sveltia CMS (Git-based, via Cloudflare Worker OAuth) |

---

## Content collections

| Collection | Directory | Sigil | Purpose |
|---|---|---|---|
| `ideas` | `src/ideas/` | `→` | Long-form essays |
| `notes` | `src/notes/` | `·` | Short observations |
| `snaps` | `src/snaps/` | `○` | Photography |
| `feed` | — | — | Merged collection for home page + Atom feed |

**Sort order** (all collections): dated posts desc → `updated` desc as tie-break → undated last.

**Permalink computation:** `scripts/backfill-permalink.js` runs as part of `prebuild`. When `slug` is set in front matter, it writes `permalink: /{type}/{date}-{slug}/` directly into the file. Without `slug`, the filename drives the URL. Do not set `permalink` manually — the script manages it.

**Front matter per type:**

Field order convention: `title`, `description`, `date`, `tags`, `slug`, `permalink` (script-managed, see below), `draft` last.

Ideas (long-form):
```yaml
title: The title
description: One sentence for OG, meta, and article subtitle.
date: 2026-03-26
tags:
  - design
slug: optional-custom-url-slug   # omit to use filename
draft: true                      # omit to publish
```

Notes (short observations):
```yaml
title: The title
description: One sentence — shown as subtitle and used for OG meta.
date: 2026-03-26
tags:
  - personal
slug: optional-custom-url-slug
draft: true
```

Snaps (photography):
```yaml
title: Place or subject
description: One line of context.
date: 2026-03-26
tags:
  - luru
slug: optional-custom-url-slug
draft: true
```

Layout is inherited from directory data files — do not repeat it in front matter. `tags` beyond the collection tag (`ideas`/`notes`/`snaps`, also inherited) are freeform, e.g. `personal`, `tech`, `design`.

---

## Eleventy config (`.eleventy.js`)

- `markdownTemplateEngine: "njk"` — Nunjucks runs on all `.md` files before Markdown
- `isoDate` filter → `YYYY-MM-DD` in IST (`Asia/Kolkata`)
- `readableDate` filter → human-readable in IST
- `atomDate` filter → full UTC ISO 8601 (RFC 3339, for Atom feed — do not apply IST)
- `buildTime` global → feed fallback timestamp
- `sortPosts` shared function handles all four collection sorts

---

## Template hierarchy

```
base.njk      Shell — chrome HTML, inline <script>, affects every page
doc.njk       Single post layout (wraps base.njk)
home.njk      Home/feed listing (wraps base.njk)
feed.njk      Atom XML — must have layout: false
```

`doc.njk` element order: title → nav → description (if present) → meta (omitted if `hideMeta: true`) → body → post-nav

`home.njk` sigils by tag: `→` ideas, `○` snaps, `·` notes (fallback).

---

## CSS architecture

Load order is the import order in `main.css`:

```
tokens.css      All CSS custom properties — colours, fonts, spacing, dimensions
reset.css       Minimal reset
doc-chrome.css  App chrome (titlebar, menubar, toolbar, ruler, statusbar, canvas)
typography.css  Document prose — headings, paragraphs, lists, code, tables
components.css  Post list, footnotes, callouts, margin notes, post-nav
print.css       Print stylesheet — strips chrome, shows link URLs
```

**Token rules:**
- All design values in `tokens.css` as `:root` custom properties
- `doc-chrome.css` is the only file permitted to hardcode hex colours (chrome-only values)
- Never hardcode a value that has a token in `typography.css` or `components.css`

**Key tokens:**

| Token | Value | Purpose |
|---|---|---|
| `--font-ui` | Arial/Helvetica | All chrome elements — never changes |
| `--font-doc` | Georgia (default) | Document body — user can switch to Arial |
| `--page-width` | 794px | A4 at 96dpi |
| `--page-pad-v` | 80px | A4 vertical padding |
| `--page-pad-h` | 96px | A4 horizontal padding |
| `--chrome-h` | 114px | Sum of all chrome bar heights (34+26+32+22) |
| `--titlebar-h` | 34px | |
| `--menubar-h` | 26px | |
| `--toolbar-h` | 32px | |
| `--ruler-h` | 22px | |

`--chrome-h` is used by `scroll-margin-top` on headings. Must be kept in sync with individual bar heights manually.

---

## Shortcodes

Defined in `.eleventy.js`:

| Shortcode | Type | Output |
|---|---|---|
| `{% callout "note" %}…{% endcallout %}` | Paired | Callout block (type: `note` or `warning`) |
| `{% marginnote %}…{% endmarginnote %}` | Paired | Inline aside |
| `{% pagebreak %}` | Non-paired | `<div>` grey desk gap between pages |

`callout` and `marginnote` call `md.render()` — Markdown is supported inside them.

Section break: `---` in body renders as `* * *`.
Page break: `<hr class="page-break">` renders as a grey desk gap.

**Template filters (`.eleventy.js`):**

| Filter | Input | Output |
|---|---|---|
| `collectionTags` | `tags` array | Tags with `ideas`, `notes`, `snaps` removed |
| `postSigil` | `tags` array | `→` ideas · `○` snaps · `·` notes (default) |
| `wordcount` | HTML string | Word count (strips tags first) |
| `readtime` | HTML string | Minutes to read at 200 wpm |
| `readableDate` | date | "30 April 2026" in IST |
| `isoDate` | date | `YYYY-MM-DD` in IST |
| `atomDate` | date | UTC ISO 8601 for Atom feed |
| `groupByYear` | posts array | Posts grouped by year, descending |
| `excerpt` | HTML string | First 200 chars, tags stripped |
| `limit` / `offset` | array, n | Slice helpers |
| `findIndex` | array, page | Index of current page in collection |

**Nav include:** `src/_includes/nav.njk` — shared navigation used by all pages. Set `{% set navRss = true %}` before including to show the RSS link (home, section index, and post pages).

---

## Markdown extensions

| Extension | Package | Feature |
|---|---|---|
| Footnotes | `markdown-it-footnote` | `[^1]` inline + `[^1]: text` at bottom |
| Heading anchors | `markdown-it-anchor` | Auto-generated; override with `{ #id }` (space required) |
| Custom attributes | `markdown-it-attrs` | `{ .class }`, `{ data-x="y" }` on any block |
| Image figures | custom (`markdownItFigures` in `.eleventy.js`) | Lone images wrapped in `<figure>`; title text becomes `<figcaption>` — `![alt](url "Caption")` |

---

## Inline JS (`base.njk` script block)

All code in an IIFE — no globals leaked.

| Feature | Behaviour |
|---|---|
| Font dropdown | Switches `--font-doc`; persists `musings-font` in `sessionStorage` |
| Zoom dropdown | Sets `app-canvas` CSS zoom 50–200%; Cmd/Ctrl +/-/0 shortcuts; persists `musings-zoom` in `sessionStorage` |
| Stoplight dot | `window.close()` — browser-blocked for normal tabs, silent no-op |
| Titlebar dimming | `setActive` on `blur`, `focus`, `visibilitychange` — all three needed |

`initDropdown` returns `{ setValue }` — used by zoom to sync label with keyboard shortcuts.

Session persistence: `sessionStorage` only — resets on new tab by design.

---

## Infrastructure

### Deployment

`deploy.yml` triggers on push to `main` — `npm ci → npm run webp → npm run build` → deploys `_site/` to GitHub Pages.

`npm run build` runs `prebuild` automatically, which chains four scripts:
1. `backfill-dates.js` — fills git creation time into date-only front matter
2. `convert-webp.js` — converts JPEG/PNG/HEIC in `src/images/uploads/` to WebP (quality 82, auto-rotates via EXIF), deletes the original, then updates all markdown references in content files from the old extension to `.webp`. Existing `.webp` files are skipped.
3. `backfill-permalink.js` — writes `permalink` to front matter for any post with a `slug` field
4. `generate-og-images.js` — renders each post's `og:image` (see below). Must run after step 3, since it needs the final `permalink`.

`src/CNAME` is passthrough-copied to `_site/CNAME` — required for the custom domain to survive deploys.

### Passthrough copies

Directories: `src/fonts/`, `src/css/`, `src/images/`
Files: `src/favicon.svg`, `src/favicon.ico`, `src/apple-touch-icon.png`, `src/manifest.json`, `src/CNAME`

Any new asset type needs a corresponding `addPassthroughCopy` in `.eleventy.js`.

`src/images` is a symlink to a top-level `images/` directory, not a real nested folder. Node resolves it transparently for local builds and scripts, so `src/images/uploads/` is a valid filesystem path — but tools that read the repo through GitHub's API (Sveltia CMS) see only `images/uploads/` as a real git path; `src/images/uploads/` 404s there.

### Sveltia CMS

Access: `https://musings.thedataareclean.com/admin/` — sign in with GitHub.

- Cloudflare Worker at `https://sveltia-cms-auth.thedataareclean.workers.dev` proxies the GitHub OAuth flow
- GitHub OAuth App callback URL must point to the Worker
- Every CMS save commits a Markdown file to `main`, which triggers `deploy.yml`
- `media_folder` in `config.yml` is `images/uploads` (the real path, not the `src/images` symlink — see above); served from `/images/uploads/`

### Feed

`/feed.xml` — combined Atom feed (ideas + notes + snaps), 15 most recent posts. Uses `atomDate` (UTC ISO 8601). `feed.njk` must have `layout: false`.

### OG images

`scripts/generate-og-images.js` renders a per-post `og:image` at build time — a 1200×630 screenshot of the site's own doc-chrome (titlebar showing the site domain, title, description, tags), not a generic redesigned social card. It's a real render (Satori → SVG → `@resvg/resvg-js` → PNG), not a screenshot tool — no headless browser dependency.

- Output: `images/og/<slug>.png`, where `<slug>` comes from `ogImageSlug(page.url)` — sanitizes the final URL (`/ideas/2026-08-15-grandmother/` → `ideas-2026-08-15-grandmother`). `images/og/` is gitignored — regenerated every build, same as `_site/`.
- `ogImageSlug` is exported from `generate-og-images.js` and required directly by `.eleventy.js` (registered as a filter) — `base.njk` uses the same filter to build the `<meta property="og:image">` URL, so the filename the script writes and the URL the template points at can never drift apart.
- Only pages using `doc.njk` get one — gated in `base.njk` on `ogType == "article"` (set in `doc.njk`'s front matter). Home page, tag pages, and the feed don't get an `og:image`.
- Skips regenerating a post's image if its PNG is already newer than the source `.md` file — same caching pattern as `convert-webp.js`.
- Font: reads `--font-doc` from `tokens.css` at generation time, so the card can't silently drift from whichever font the site actually defaults to. Uses the real Arial/Georgia `.ttf` when one is installed locally (pixel-perfect); falls back to the committed OFL substitutes, Arimo/Gelasio, when it isn't (always the case in CI). See `CLAUDE.md`'s trap entry.
- Chrome (the titlebar) is drawn at its real fixed pixel size, never scaled — content (title/description/tags) is scaled uniformly by a zoom factor matching one of the site's own zoom-dropdown rungs (200%). This mirrors the real site: chrome lives outside `.app-canvas` and never zooms with content.

---

## Dependencies

All `devDependencies` — build-time only, nothing shipped to the browser.

| Package | Purpose |
|---|---|
| `@11ty/eleventy` | SSG |
| `@resvg/resvg-js` | Rasterizes the SVG `satori` produces into the final og:image PNG |
| `gray-matter` | Front-matter parsing in `generate-og-images.js` |
| `markdown-it-anchor` | Heading anchors |
| `markdown-it-attrs` | Custom attributes |
| `markdown-it-footnote` | Footnotes |
| `satori` | Lays out each post's og:image (title/description/tags) as SVG |
| `sharp` | Image conversion — JPEG/PNG/HEIC → WebP in `convert-webp.js` |
