# APP.md — Musings

Architecture and technical reference. Claude's operating manual lives in [CLAUDE.md](CLAUDE.md).

---

## Architecture at a glance

Static site generator (Eleventy 3.x) → HTML + CSS + JS → GitHub Pages.

No build tools, no bundler. Eleventy templates produce static HTML; all CSS and JS are served as-is.

**Author/deploy flow:**
1. Author writes `.md` in `src/` (directly or via Sveltia CMS)
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
| Fonts | Arial (system); Georgia (user-switchable) |
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

**Permalink computation:** `{type}.11tydata.js` in each content directory. When `slug` is set in front matter, URL is `/{type}/{date}-{slug}/`. Without it, the filename drives the URL.

**Front matter per type:**

Ideas (long-form):
```yaml
title: The title
date: 2026-03-26
description: One sentence for OG, meta, and article subtitle.
slug: optional-custom-url-slug
```

Notes (short observations):
```yaml
title: The title
date: 2026-03-26
slug: optional-custom-url-slug
```

Snaps (photography):
```yaml
title: Place or subject
date: 2026-03-26
description: One line of context.
slug: optional-custom-url-slug
```

Tags and layout are inherited from directory data files — do not repeat them in front matter.

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

`doc.njk` element order: title → nav → description (if present) → meta → body → post-nav

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
| `--font-doc` | Arial (default) | Document body — user can switch to Georgia |
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

---

## Markdown extensions

| Extension | Package | Feature |
|---|---|---|
| Footnotes | `markdown-it-footnote` | `[^1]` inline + `[^1]: text` at bottom |
| Heading anchors | `markdown-it-anchor` | Auto-generated; override with `{ #id }` (space required) |
| Custom attributes | `markdown-it-attrs` | `{ .class }`, `{ data-x="y" }` on any block |

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

`deploy.yml` triggers on push to `main` — `npm ci && npm run build` → deploys `_site/` to GitHub Pages.

`src/CNAME` is passthrough-copied to `_site/CNAME` — required for the custom domain to survive deploys.

### Passthrough copies

Directories: `src/fonts/`, `src/css/`, `src/images/`
Files: `src/favicon.svg`, `src/favicon.ico`, `src/apple-touch-icon.png`, `src/manifest.json`, `src/CNAME`

Any new asset type needs a corresponding `addPassthroughCopy` in `.eleventy.js`.

### Sveltia CMS

Access: `https://musings.thedataareclean.com/admin/` — sign in with GitHub.

- Cloudflare Worker at `https://sveltia-cms-auth.thedataareclean.workers.dev` proxies the GitHub OAuth flow
- GitHub OAuth App callback URL must point to the Worker
- Every CMS save commits a Markdown file to `main`, which triggers `deploy.yml`
- Images land in `src/images/uploads/` and are served from `/images/uploads/`

### Feed

`/feed.xml` — combined Atom feed (ideas + notes + snaps), 15 most recent posts. Uses `atomDate` (UTC ISO 8601). `feed.njk` must have `layout: false`.

---

## Dependencies

All `devDependencies` — build-time only, nothing shipped to the browser.

| Package | Purpose |
|---|---|
| `@11ty/eleventy` | SSG |
| `markdown-it-anchor` | Heading anchors |
| `markdown-it-attrs` | Custom attributes |
| `markdown-it-footnote` | Footnotes |
