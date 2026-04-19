# CLAUDE.md — Musings

Developer and AI reference for the Musings personal blog.

---

## Project overview

A static blog built with [Eleventy 3.x](https://www.11ty.dev/). The visual conceit is a word-processor application — Google Docs / early macOS aesthetic — sitting in the browser. The document is the site; the chrome is decoration with three functional easter eggs.

**Live URL:** `https://musings.thedataareclean.com`
**Stack:** Eleventy · Nunjucks · Markdown · vanilla CSS · vanilla JS (no build tools, no bundler)
**Author:** Arpit

---

## Commands

```sh
npm run dev      # Eleventy dev server with live reload — http://localhost:8080
npm run build    # Production build → _site/
npm run clean    # Delete _site/
```

---

## File structure

```
src/
  _data/
    site.json          # Global site config and chrome decoration values
  _includes/
    layouts/
      base.njk         # Shell: chrome, script — all pages wrap this
      doc.njk          # Single post/page layout (ideas + notes + snaps + about)
      home.njk         # Home page layout (feed list)
  css/
    main.css           # @import manifest — order is load order
    tokens.css         # All CSS custom properties (design tokens)
    reset.css          # Minimal reset
    doc-chrome.css     # App chrome: titlebar, menubar, toolbar, ruler, statusbar
    typography.css     # Document body typography
    components.css     # Post list, footnotes, callouts, post-nav
    print.css          # Print media query — strips chrome, shows URLs
  feed.njk             # Combined Atom feed (XML) — must have layout: false
  ideas/
    ideas.json         # Directory data: layout + tags for all ideas
    ideas.11tydata.js  # Computed permalink: uses slug field when present
    index.njk          # Ideas listing page
    *.md               # Individual idea posts
  notes/
    notes.json         # Directory data: layout + tags for all notes
    notes.11tydata.js  # Computed permalink: uses slug field when present
    index.njk          # Notes listing page
    *.md               # Individual notes
  snaps/
    snaps.json         # Directory data: layout + tags for all snaps
    snaps.11tydata.js  # Computed permalink: uses slug field when present
    index.njk          # Snaps listing page
    *.md               # Individual shot posts
  images/              # Static images (passthrough copied)
    icon-192.png       # Web app manifest icon (192×192, generated from favicon.svg)
  fonts/               # Static fonts (passthrough copied)
  favicon.svg          # SVG favicon — used by modern desktop browsers
  favicon.ico          # ICO favicon — used by bookmark managers, RSS readers, older browsers
  apple-touch-icon.png # iOS Safari home screen icon (180×180, generated from favicon.svg)
  manifest.json        # Web app manifest — Android Chrome "Add to Home Screen"
  CNAME                # Custom domain — passthrough copied to _site/
  index.md             # Home page content (uses home.njk layout)
  about.md             # About page (uses doc.njk layout)
.eleventy.js           # Eleventy config: markdown, collections, filters, shortcodes
.github/
  workflows/
    deploy.yml         # GitHub Actions: build Eleventy → deploy to GitHub Pages
src/admin/
  index.html           # Sveltia CMS entry point
  config.yml           # Sveltia CMS collection definitions
```

---

## Architecture decisions

### Template engine order
Eleventy processes Nunjucks **before** Markdown. Any Nunjucks syntax in `.md` files is evaluated first — including inside code fences.

**`{#` is a Nunjucks comment delimiter.** Never write `{#` literally in any `.md` file, even inside backticks or code blocks. The parser silently consumes everything from `{#` to the next `#}`, invisibly truncating the page. Use `{ #id }` (with a space) for `markdown-it-attrs` ID attributes.

### CSS custom properties
All design values live in `tokens.css` as `:root` custom properties. Never hardcode a value that has a token. Exception: chrome-specific border colours (e.g. `#d4d4d4`) are intentionally hardcoded in `doc-chrome.css` — they are chrome-only and do not belong in global tokens.

### Font architecture
- `--font-ui` — always Arial/Helvetica. Used by all chrome elements. Never changes.
- `--font-doc` — document body font. Defaults to Arial. User can switch to Georgia via the toolbar dropdown.

The JS easter egg sets only `--font-doc`. Chrome stays in `--font-ui` regardless.

### Session persistence
Font and zoom persist for the browser session via `sessionStorage` (keys: `musings-font`, `musings-zoom`). Not persisted across sessions. Do not upgrade to `localStorage` without the user asking.

### Page dimensions
A4 at 96dpi: `--page-width: 794px`, `--page-pad-v: 80px`, `--page-pad-h: 96px`, `min-height: 297mm`.

### Content collections
- `ideas` — `src/ideas/**/*.md`
- `notes` — `src/notes/**/*.md`
- `snaps` — `src/snaps/**/*.md`
- `feed` — all three merged (home page)

All four collections use the same `sortPosts` function in `.eleventy.js`:
1. Posts with a `date` come before undated posts
2. Within dated posts: `date` descending
3. Tie-break: `updated` descending (full ISO datetime)
4. Undated posts at the end

---

## Content authoring

### Front matter

Tags and layout are inherited from the directory data file (`ideas.json` / `notes.json` / `snaps.json`) — only add extra tags if needed.

**Ideas** (long-form essays):
```yaml
---
title: The title
date: 2026-03-26
description: One sentence for OG, meta, and article subtitle.
slug: optional-custom-url-slug
---
```

**Notes** (short observations):
```yaml
---
title: The title
date: 2026-03-26
slug: optional-custom-url-slug
---
```

**Snaps** (photography):
```yaml
---
title: Place or subject
date: 2026-03-26
description: One line of context.
slug: optional-custom-url-slug
---
```

`slug` is optional. When omitted, the URL is derived from the filename (`YYYY-MM-DD-title-words`). When present, the URL becomes `/{type}/{date}-{slug}/` — computed by `{type}.11tydata.js`.

### Markdown extensions

**Footnotes** — `[^1]` inline, `[^1]: text` at the bottom.

**Heading anchors** — auto-generated. Override with `{ #custom-id }` (space before `#` required).

**Custom attributes** — `{ .class }` or `{ data-x="y" }` on any block element.

**Shortcodes:**
```njk
{% callout "note" %}   (type: "note" or "warning")
Content here.
{% endcallout %}

{% marginnote %}
Short aside.
{% endmarginnote %}
```

Section break: `---` renders as `* * *`

Page break: `<hr class="page-break">` renders as a grey desk gap between pages.

### Rules
- No `{% %}` Nunjucks tags except the paired shortcodes above
- No `{#` anywhere — not in prose, not in code blocks, not in backticks
- Content should be portable Markdown

### Filename convention
`YYYY-MM-DD-slug.md` — date prefix is the canonical post date. The slug becomes the URL.

---

## Chrome easter eggs

| Element | Behaviour | Implementation |
|---|---|---|
| Red stoplight | Attempts `window.close()` — blocked by browsers for normal tabs; silently fails. Expected. | `button.stoplight__red` click handler |
| Font dropdown | Switches `--font-doc` between Arial and Georgia; persists in `sessionStorage` | `.app-toolbar__font` custom dropdown |
| Zoom dropdown | Sets `app-canvas` CSS zoom 50–200%; Cmd/Ctrl +/-/0 keyboard shortcuts; persists in `sessionStorage` | `.app-toolbar__zoom` custom dropdown |

Stoplight yellow and green are `<span>` (non-interactive). All chrome carries `aria-hidden="true"`.

Titlebar and dots dim on `window.blur` / `visibilitychange`, restore on `window.focus`.

---

## Known traps

### `{#` Nunjucks trap
Symptom: post renders blank or truncated with no build error. Check for `{#` anywhere in the file — prose, inline code, fenced blocks. All are processed by Nunjucks before Markdown.

### Feed template must have `layout: false`
`feed.njk` lives at the `src/` root. Without `layout: false` in its front matter, XML output gets wrapped in HTML. Always confirm `feed.njk` has `layout: false`.

### CSS specificity: `.page-break` vs `.doc-body hr`
`.doc-body hr` (0-1-1) beats `.page-break` (0-1-0). All `hr` rules in `typography.css` are scoped to `.doc-body hr:not(.page-break)`. The `:not` is load-bearing.

### Page-break width
`.page-break` uses `width: calc(100% + var(--page-pad-h) * 2)` to bleed to page edges. Only works when `.doc-layout` is `grid-template-columns: 1fr`. A second column breaks the bleed.

### Zoom and sticky chrome
CSS `zoom` applies to `.app-canvas` only. Sticky chrome (titlebar, menubar, toolbar, ruler, statusbar) is outside `.app-canvas`. Moving chrome inside the canvas breaks sticky positioning.

### `scroll-margin-top` on headings
Headings use `scroll-margin-top: calc(var(--chrome-h) + var(--space-6))`. `--chrome-h` must equal `--titlebar-h + --menubar-h + --toolbar-h + --ruler-h` (34 + 26 + 32 + 22 = **114px**). Update this if any chrome height changes.

### Feed
`/feed.xml` — combined Atom feed (ideas + notes + snaps), 15 most recent posts. Uses `atomDate` (full UTC ISO 8601) and `layout: false`.

---

## Pre-push checklist

### Build
- [ ] `npm run build` — zero errors, zero warnings
- [ ] `_site/` not committed
- [ ] Browser console clean on dev server — no JS errors, no 404s
- [ ] `version` in `package.json` and `package-lock.json` matches the release tag — update with `npm version <tag> --no-git-tag-version`
- [ ] CLAUDE.md updated — file structure, passthrough copies, release history, any changed behaviour
- [ ] README.md updated — stack details, content types, shortcodes, CSS line count
- [ ] Inline comments reviewed — stale comments removed or updated; new non-obvious logic commented

### Content
- [ ] All new posts have `title`, `date`, correct tags
- [ ] Dates in filenames match `date:` in front matter
- [ ] No `{#` in any `.md` file
- [ ] Post renders fully — no truncation (scroll to bottom in dev)
- [ ] All links resolve; images exist in `src/images/`
- [ ] Shortcodes render correctly — callouts, margin notes, page breaks
- [ ] Feed counts correct (home page)

### Behaviour
- [ ] Font dropdown switches document text, not chrome
- [ ] Zoom dropdown and Cmd/Ctrl +/-/0 keyboard shortcuts work in sync
- [ ] Font and zoom survive page navigation (sessionStorage), reset on fresh tab
- [ ] Stoplight dots dim on tab switch, restore on return
- [ ] Custom dropdowns close on outside click

### Visual
- [ ] Home, one idea, one note, one shot, about — all load correctly
- [ ] No layout breakage at 768px
- [ ] Anchor links land below sticky chrome
- [ ] Print (`Cmd+P`): chrome hidden, URLs shown after external links, page breaks work

### Infrastructure
- [ ] `site.url` in `site.json` — no trailing slash
- [ ] Canonical and OG tags correct in built HTML
- [ ] `_site/feed.xml` is valid XML — open in browser
- [ ] `feed.njk` has `layout: false`
- [ ] `_site/favicon.ico`, `_site/favicon.svg`, `_site/apple-touch-icon.png`, `_site/manifest.json` all present

---

## Post-push checklist

### Deployment
- [ ] Deploy completes in Actions tab
- [ ] Live URL shows latest change; hard refresh if needed (`Cmd+Shift+R`)
- [ ] Canonical URL in `<head>` matches actual URL
- [ ] Feed at `/feed.xml` parses in browser
- [ ] Validate feed at [validator.w3.org/feed](https://validator.w3.org/feed) after any template change

### Spot checks
- [ ] Home page sigils correct — `→` ideas, `·` notes, `○` snaps
- [ ] One idea, one note, one shot — content renders correctly
- [ ] Font and zoom easter eggs work on live domain
- [ ] Chrome inactive state triggers on tab switch
- [ ] OG preview at [opengraph.xyz](https://www.opengraph.xyz) — title and description correct

### If broken on live but not in dev
1. **Case-sensitive paths** — macOS is case-insensitive, Linux is not. `Sample.svg` vs `sample.svg` 404s on the server.
2. **Passthrough copy missed** — check `addPassthroughCopy` in `.eleventy.js`.
3. **URL mismatch** — `site.url` must exactly match the live domain.
4. **Feed wrapped in HTML** — `feed.njk` missing `layout: false`.
5. **Unescaped `&` in feed** — `&` in titles/descriptions must be `&amp;` in XML.

---

## Code review guide

### Eleventy config (`.eleventy.js`)
- Collections use `getFilteredByGlob` — verify glob paths match directory structure
- `markdownTemplateEngine: "njk"` — Nunjucks runs on all `.md` files; `{#` trap applies
- `isoDate` returns `YYYY-MM-DD` in IST (`Asia/Kolkata`); `readableDate` returns human-readable in IST — both use `en-CA` / `en-GB` locale with `timeZone: "Asia/Kolkata"`
- `atomDate` returns full UTC ISO 8601 — correct for Atom feed RFC 3339; do not apply IST to this filter
- `buildTime` global data available for feed fallback
- `sortPosts` shared function handles all four collection sorts — date desc, then `updated` desc, undated last
- `{type}.11tydata.js` files in ideas/notes/snaps compute a custom permalink when `slug` is set in front matter
- `pagebreak` is non-paired (returns `<div>`); `callout` and `marginnote` are paired and call `md.render()`

### Templates
- `base.njk` — chrome HTML and inline `<script>` live here; changes affect every page
- `doc.njk` — element order: title → nav → description (if present) → meta → body → post-nav; prev/next uses `findIndex` against the correct collection by tag; tag links use `class="post-tag"` for yellow highlight with black text
- `home.njk` — uses `collections.feed`; sigil by tag: `→` ideas, `○` snaps, `·` notes (fallback)
- `feed.njk` — must have `layout: false`; uses `atomDate` not `isoDate`

### Inline JS (`base.njk` script block)
- All code in an IIFE — no globals leaked
- `initDropdown` returns `{ setValue }` — used by zoom to sync label with keyboard shortcuts
- `sessionStorage` keys: `musings-font`, `musings-zoom`
- `setActive` called on `blur`, `focus`, and `visibilitychange` — all three needed

### CSS
Load order: `tokens.css` → `reset.css` → `doc-chrome.css` → `typography.css` → `components.css` → `print.css`

- `--chrome-h` uses `calc(--titlebar-h + --menubar-h + --toolbar-h + --ruler-h)` = 34 + 26 + 32 + 22 = **114px** — update individual tokens if any chrome height changes; `--chrome-h` updates automatically
- `.doc-body hr:not(.page-break)` — `:not` is load-bearing
- `.doc-layout` must stay `grid-template-columns: 1fr` — second column breaks page-break bleed
- Spacing: `--space-{n}` tokens only, no raw `px` in `typography.css` or `components.css`
- Colour: `--color-*` tokens in content CSS; `doc-chrome.css` is the only file permitted hardcoded hex

---

## Infrastructure

### Deployment
- `deploy.yml` triggers on push to `main` — builds with `npm ci && npm run build`, deploys `_site/` to GitHub Pages
- `src/CNAME` is passthrough-copied to `_site/CNAME` — required for the custom domain to survive deploys

### Passthrough copies
Directories: `src/fonts/`, `src/css/`, `src/images/`.
Individual files: `src/favicon.svg`, `src/favicon.ico`, `src/apple-touch-icon.png`, `src/manifest.json`, `src/CNAME`.
Any new asset type needs a corresponding `addPassthroughCopy` in `.eleventy.js`.

### Dependencies
All are `devDependencies` — build-time only, nothing shipped to the browser.

| Package | Notes |
|---|---|
| `@11ty/eleventy` | SSG |
| `markdown-it-anchor` | Heading anchors |
| `markdown-it-attrs` | Custom attributes |
| `markdown-it-footnote` | Footnotes |

```sh
npm audit       # Check for vulnerabilities
npm outdated    # List available updates
```

---

## Sveltia CMS

Content is authored via [Sveltia CMS](https://sveltiacms.app) — a Git-based headless CMS. Every save is a commit to `main`, which triggers `deploy.yml`.

### Access

`https://musings.thedataareclean.com/admin/` — sign in with GitHub (OAuth via Cloudflare Worker).

### How it works

1. Author opens `/admin/`, authenticates with GitHub via the Cloudflare Worker OAuth proxy
2. Sveltia reads `src/admin/config.yml` to discover collections (`ideas`, `notes`, `snaps`)
3. Each save writes a Markdown file to the correct folder and commits to `main`
4. `deploy.yml` triggers automatically — live within ~1 minute

### Slug behaviour

- **Filename** is always `YYYY-MM-DD-{auto-from-title}.md` — Sveltia derives this from the title
- **URL slug** defaults to the filename slug. Set the optional `slug` field to override — `{type}.11tydata.js` builds the URL as `/{type}/{date}-{slug}/`
- Leave the slug field blank to let the title drive the URL

### OAuth infrastructure

Cloudflare Worker deployed at `https://sveltia-cms-auth.thedataareclean.workers.dev` — proxies GitHub OAuth flow. GitHub OAuth App callback URL must match.

### Images

Upload via Sveltia's media button — files land in `src/images/uploads/` and are served from `/images/uploads/`.

### Setup checklist (new environment)

- [ ] GitHub OAuth App created with callback `https://sveltia-cms-auth.thedataareclean.workers.dev/callback`
- [ ] Cloudflare Worker deployed with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` secrets set
- [ ] `src/admin/config.yml` `base_url` matches Worker URL
- [ ] Open `/admin/` and sign in to verify end-to-end

---

## Release tagging standard

### Version format

| Part | When to increment |
|---|---|
| MAJOR | Complete visual redesign or change in site concept |
| MINOR | New feature, new section, new page type |
| PATCH | Bug fix, design tweak, content push |

### When to tag

| Change type | Tag? |
|---|---|
| New post (routine) | Optional — `posts/slug` lightweight tag |
| Bug fix | Yes — PATCH |
| Design tweak | Yes — PATCH |
| New feature | Yes — MINOR |
| Full redesign | Yes — MAJOR |

### Workflow

```sh
git tag -a v2.3.0 -m "Brief description"
git push origin v2.3.0
```

Use annotated tags (`-a`) for design and infrastructure. Lightweight tags are fine for content milestones.

### Rollback

```sh
git tag -n                          # list all tags with messages
git diff v2.1.0 v2.2.0 -- src/css/ # diff between releases
git checkout -b hotfix v2.1.0       # branch from a past release
```

---

## Release history

| Tag | Commit | Description |
|---|---|---|
| `v0.1.0` | `fdac81c` | Initial build — brutalist living-document concept |
| `v0.2.0` | `3264e75` | Redesign — word-processor chrome, unformatted doc aesthetic |
| `v0.2.1` | `6f0881b` | Fix — app chrome five targeted improvements |
| `v1.0.0` | `fd6e9e6` | **Site reaches definitive form** — nav inside document, full typographic flattening |
| `v1.1.0` | `cd79212` | Add — ideas, notes, snaps, tag pages, mobile layout, GitHub Pages deployment |
| `v1.1.1` | `766923b` | Docs — README and CLAUDE.md updated for snaps and current state |
| `v1.1.2` | `7e04895` | Docs — add release history to CLAUDE.md |
| `v2.0.0` | `ecec5a4` | **Notion becomes the canonical authoring layer** — CMS sync, daily Action, idempotent pipeline |
| `v2.0.1` | `bc2e3fd` | Fix — codebase review: bugs, dead tokens, docs gaps |
| `v2.1.0` | `98c762e` | Add — auto-download Notion images to src/images/notion/ on sync |
| `v2.1.1` | `2ed7951` | Add — og:url, og:site_name, twitter:card, theme-color meta tags |
| `v2.1.2` | `97d65eb` | Fix — pre-push review: typos, feed RFC 3339 datetime, package.json version sync |
| `v2.1.3` | `a01d12b` | Update — sync script reads manual Date property instead of page created_time |
| `v2.2.0` | `b8fdc43` | Add — article description display, Slug override property, local test content convention |
| `v2.2.1` | `4b32d7d` | Fix — tag URL normalisation, version sync, checklist update |
| `v2.2.2` | `5f4196c` | Add — image optimisation via sharp, slug rename on change |
| `v2.2.3` | `e9ba14c` | Fix — three-tier sort order, IST display dates, updated stored as full datetime |
| `v2.2.4` | `1a58904` | Fix — favicon mobile support (ICO, apple-touch-icon, manifest), tag highlight on article pages, CLAUDE.md refresh |
| `v2.2.5` | `4c7b340` | Fix — scale down favicon, fix post-tag colour override |
| `v2.3.0` | `afb1bbb` | Add — combined Atom feed at /feed.xml (ideas + notes + snaps), site.title as single source of truth |
| `v2.3.1` | `469bb58` | Fix — browser tab uses shortTitle "Musings", full title retained for feed and OG |
| `v2.4.0` | `428c148` | Add — RSS link in doc nav, feed category tags, shortTitle token, og:title home fix |
| `v2.5.0` | `f57aaba` | Add — Sveltia CMS, Cloudflare Worker OAuth, optional slug override |
| `v3.0.0` | TBD | **Notion pipeline removed** — Git-based authoring via Sveltia CMS is the canonical layer |

Current release: **v3.0.0** (pending tag). The v3 era is defined by Sveltia CMS replacing Notion. The v1 word-processor visual identity is unchanged. v4.0.0 requires a complete visual overhaul.

---

## Commit message convention

```
{Type}: {short description}

Optional body — why, not what.
```

| Type | Use for |
|---|---|
| `Add` | New file, feature, or post |
| `Fix` | Bug fix |
| `Update` | Change to existing feature or content |
| `Redesign` | Visual overhaul |
| `Refactor` | Code restructure, no behaviour change |
| `Docs` | CLAUDE.md, README, comments only |
| `Chore` | Dependencies, `.gitignore`, build config |
