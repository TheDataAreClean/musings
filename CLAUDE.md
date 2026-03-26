# CLAUDE.md — Musings

Developer and AI reference for the Musings personal blog. Covers architecture, authoring rules, known traps, review checklists, and release standards.

---

## Project overview

A static blog built with [Eleventy 3.x](https://www.11ty.dev/). The visual conceit is a word-processor application — Google Docs / early macOS aesthetic — sitting in the browser. The document is the site; the chrome is decoration (mostly) with three functional easter eggs.

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
      base.njk         # Shell: chrome, script, all pages wrap this
      doc.njk          # Single post/page layout (ideas + notes + about)
      home.njk         # Home page layout (feed list)
  css/
    main.css           # @import manifest — order is load order
    tokens.css         # All CSS custom properties (design tokens)
    reset.css          # Minimal reset
    doc-chrome.css     # App chrome: titlebar, menubar, toolbar, ruler, statusbar
    typography.css     # Document body typography
    components.css     # Post list, TOC, footnotes, callouts, post-nav, archive
    print.css          # Print media query — strips chrome, shows URLs
  ideas/
    ideas.json         # Directory data: layout + tags for all ideas
    index.njk          # Ideas listing page
    feed.njk           # Atom feed (XML) — must have layout: false
    *.md               # Individual idea posts
  notes/
    notes.json         # Directory data: layout + tags for all notes
    index.njk          # Notes listing page
    *.md               # Individual notes
  images/              # Static images (passthrough copied)
  fonts/               # Static fonts (passthrough copied)
  index.md             # Home page content (uses home.njk layout)
  about.md             # About page (uses doc.njk layout)
.eleventy.js           # Eleventy config: markdown, collections, filters, shortcodes
```

---

## Architecture decisions

### Template engine order
Eleventy processes Nunjucks **before** Markdown. This means any Nunjucks syntax in `.md` files is evaluated first — including syntax in code fences. The critical consequence:

**`{#` is a Nunjucks comment delimiter.** Never write `{#` literally in any `.md` file, even inside backticks or code blocks. The parser will consume everything from `{#` to the next `#}` silently, invisibly truncating the page. Use `{ #id }` (with a space) for `markdown-it-attrs` ID attributes.

### CSS custom properties
All design values live in `tokens.css` as `:root` custom properties. Never hardcode a value that has a token. The exception: chrome-specific border colours (e.g. `#d4d4d4`) are intentionally hardcoded in `doc-chrome.css` — they are chrome-only and do not belong in global tokens.

### Font architecture
Two font roles:
- `--font-ui` — always Arial/Helvetica. Chrome (titlebar, menubar, toolbar, statusbar, dropdowns) always uses this. Never changes.
- `--font-doc` — document body font. Defaults to Arial. User can switch to Georgia via the toolbar dropdown. Set via `document.documentElement.style.setProperty` in JS.

The JS easter egg sets only `--font-doc`. The chrome stays in `--font-ui` regardless.

### Session persistence
Font and zoom selections persist for the browser session via `sessionStorage` (keys: `musings-font`, `musings-zoom`). They do **not** persist across sessions — cleared when the tab is closed. Do not upgrade to `localStorage` without the user asking.

### Page dimensions
A4 at 96dpi: `--page-width: 794px`, `--page-pad-v: 80px`, `--page-pad-h: 96px`, `min-height: 297mm`. Not US Letter.

### Content collections
Three Eleventy collections:
- `ideas` — `src/ideas/**/*.md`, sorted newest first
- `notes` — `src/notes/**/*.md`, sorted newest first
- `feed` — both merged and sorted newest first (used on home page)

---

## Content authoring

### Front matter

**Ideas** (long-form essays):
```yaml
---
title: The title
date: 2026-03-26
description: One sentence for OG and meta.
tags:
  - ideas
  - optional-topic-tag
---
```

**Notes** (short observations):
```yaml
---
title: The title
date: 2026-03-26
tags:
  - notes
  - optional-topic-tag
---
```

The `ideas` and `notes` tags are inherited from the directory data files (`ideas.json` / `notes.json`) — you do not need to repeat them in front matter unless you want additional tags. The layout is also set by the directory data file.

### Markdown extensions

**Footnotes** — `[^1]` inline, `[^1]: text` at the bottom. Numbered automatically.

**Heading anchors** — auto-generated from heading text. Override with `{ #custom-id }` (space before `#` required — see Nunjucks trap above).

**Custom attributes** — `{ .class }` or `{ data-x="y" }` on any block element.

**Shortcodes:**

```njk
{# Section break — renders as * * * #}
---

{# Page break — renders as grey desk gap between pages #}
<hr class="page-break">

{# Callout — type: "note" or "warning" #}
{% callout "note" %}
Content here.
{% endcallout %}

{# Margin note #}
{% marginnote %}
Short aside.
{% endmarginnote %}
```

### What NOT to put in content files
- No `{% %}` Nunjucks tags except the paired shortcodes above
- No `{#` anywhere — not in prose, not in code blocks, not in backticks
- No SSG-specific syntax; content should be portable Markdown

### Filename convention
`YYYY-MM-DD-slug.md` — date prefix is the canonical post date. The slug becomes the URL.

---

## The chrome easter eggs

Three interactive elements hidden in the word-processor UI decoration:

| Element | What it does | Implementation |
|---|---|---|
| Red stoplight dot | Attempts `window.close()` — browsers may block this for non-script-opened tabs | `button.stoplight__red` click handler |
| Font dropdown | Switches `--font-doc` between Arial and Georgia; persists in `sessionStorage` | `.app-toolbar__font` custom dropdown |
| Zoom dropdown | Sets `app-canvas` CSS zoom 50–200%; also responds to Cmd/Ctrl +/-/0; persists in `sessionStorage` | `.app-toolbar__zoom` custom dropdown |

The stoplight yellow and green dots are `<span>` elements (non-interactive). Only red is a `<button>`.

The titlebar and stoplight dots dim when the window loses focus (`window.blur` / `visibilitychange`) and restore on `window.focus`.

All chrome elements carry `aria-hidden="true"` — they are invisible to screen readers.

---

## Known traps and gotchas

### The `{#` Nunjucks trap
The symptom is a post that renders blank or truncated with no build error. Check for `{#` anywhere in the file — in prose, in inline code, in fenced code blocks. All are processed by Nunjucks before markdown runs.

### Feed template must have `layout: false`
`src/ideas/feed.njk` lives inside the `ideas/` directory whose `ideas.json` applies `layout: layouts/doc.njk` to all files. Without `layout: false` in `feed.njk`'s own front matter, the XML output gets wrapped in the full HTML shell, producing an invalid feed. Always ensure `feed.njk` front matter includes `layout: false`.

### CSS specificity: `.page-break` vs `.doc-body hr`
`.doc-body hr` (specificity 0-1-1) beats `.page-break` (0-1-0). All `hr` rules in `typography.css` are scoped to `.doc-body hr:not(.page-break)` to avoid overriding the page-break styles.

### Page-break width calculation
`.page-break` uses `width: calc(100% + var(--page-pad-h) * 2)` to bleed to the page edges. This only works when the parent `.doc-layout` uses `grid-template-columns: 1fr` (single column). If a sidebar column is re-introduced, the bleed calculation will break.

### `window.close()` browser behaviour
Browsers block `window.close()` for tabs not opened by script. The red stoplight will work for popup windows but silently fail for normal tabs. This is expected — keep as-is.

### Zoom and sticky chrome
CSS `zoom` is applied to `.app-canvas` only. Sticky chrome elements (titlebar, menubar, toolbar, ruler, statusbar) are outside `.app-canvas` and are unaffected by zoom. If you ever move chrome inside the canvas, zoom will break the sticky positioning.

### `scroll-margin-top` on headings
Headings have `scroll-margin-top: calc(var(--chrome-h) + var(--space-6))` to account for the sticky chrome height when navigating to anchor links. If chrome heights change in `tokens.css`, update `--chrome-h` accordingly. The current value: `34 + 26 + 32 + 22 = 114px`.

### Feed only includes ideas
The Atom feed at `/ideas/feed.xml` only includes ideas, not notes. This is intentional — notes are too short for feed readers. If this changes, update `src/ideas/feed.njk`.

---

## Pre-push checklist

Run through this before every push to the remote.

### Build
- [ ] `npm run build` completes with zero errors and zero warnings
- [ ] `_site/` is not committed — it is in `.gitignore`
- [ ] Browser console is clean on dev server — no JS errors, no 404s in the network tab

### Content
- [ ] All new posts have correct front matter (`title`, `date`, `tags`)
- [ ] Dates in filenames match `date:` in front matter
- [ ] No `{#` appears in any `.md` file (outside a true Nunjucks template)
- [ ] Post renders fully — no truncation (open it in dev, scroll to bottom)
- [ ] All links in new content resolve (check anchor links manually)
- [ ] Images referenced in content exist in `src/images/`
- [ ] Shortcodes render correctly — callouts, margin notes, and page breaks visually correct in dev
- [ ] `collections.ideas` and `collections.notes` counts are correct (check home page feed)

### Behaviour
- [ ] Font dropdown switches document text (all content inside `.doc-page`) — not the chrome
- [ ] Zoom dropdown changes canvas scale; Cmd/Ctrl +/-/0 keyboard shortcuts work
- [ ] Font and zoom survive page navigation within the same tab (sessionStorage)
- [ ] Font and zoom reset on a fresh tab (not persisted to localStorage)
- [ ] Stoplight dots dim when switching away from the tab and restore on return
- [ ] Red dot click attempts close (may not work in normal tabs — expected)
- [ ] Custom dropdowns close when clicking anywhere outside them

### Visual
- [ ] Check home page, one idea, one note, and about page
- [ ] No layout breakage at 768px viewport width
- [ ] Page-break strip bleeds correctly to the page edges (test on formatting-reference post)
- [ ] Anchor link navigation lands below the sticky chrome (not hidden under it)
- [ ] Print preview (`Cmd+P`): chrome strips, URLs appear after links, page breaks work
- [ ] Stoplight inactive state: switch to another tab and back — dots dim and restore

### Infrastructure
- [ ] `site.url` in `site.json` matches the deployment domain exactly — trailing slash absent
- [ ] Canonical `<link>` and OG tags look correct in `<head>` of built HTML (`view-source:` on any page)
- [ ] Atom feed at `/_site/ideas/feed.xml` is valid XML — open in browser, confirm no parse error
- [ ] `feed.njk` has `layout: false` in front matter — confirm feed is pure XML, not wrapped in HTML

---

## Post-push checklist

### Deployment verification
- [ ] Wait for deployment to complete (check host dashboard or CI status)
- [ ] Open the live URL — confirm the latest post or change is visible
- [ ] Hard refresh (`Cmd+Shift+R`) to bypass CDN cache if needed
- [ ] Check the canonical URL in `<head>` on the live page matches the actual URL
- [ ] Atom feed at `/ideas/feed.xml` loads and parses correctly in the browser
- [ ] Validate the live feed at [validator.w3.org/feed](https://validator.w3.org/feed) after any template or front matter change

### Spot checks on live
- [ ] Home page loads and feed items appear with correct sigils (`→` ideas, `·` notes)
- [ ] Click through to one idea and one note — content renders correctly
- [ ] Font and zoom easter eggs work on the live domain
- [ ] Chrome inactive state triggers when switching tabs
- [ ] `about/` page loads
- [ ] OG preview: paste the live URL into [opengraph.xyz](https://www.opengraph.xyz) — confirm title and description

### If something is broken on live but not in dev
Common causes in this stack:
1. **Case-sensitive paths** — macOS is case-insensitive, Linux (most hosts) is not. A file named `Sample.svg` referenced as `sample.svg` builds fine locally but 404s on the server.
2. **Passthrough copy missed** — check that the asset type is covered in `eleventyConfig.addPassthroughCopy` in `.eleventy.js`.
3. **URL mismatch** — `site.url` in `site.json` must be the exact live URL for canonical and OG tags.
4. **Feed wrapped in HTML** — `feed.njk` is missing `layout: false`. The feed will load but be invalid XML.
5. **Unescaped `&` in feed** — if the Atom feed fails to parse, check for `&` in post titles or descriptions (must be `&amp;` in XML).

---

## Release tagging standard

Every meaningful change to the site — design, infrastructure, or content milestone — should be tagged. Tags are the only reliable way to roll back or compare states of a statically deployed site.

### Version format

```
v{MAJOR}.{MINOR}.{PATCH}
```

| Part | When to increment | Examples |
|---|---|---|
| MAJOR | Complete visual redesign, architectural overhaul, or change in site concept | New aesthetic, switch to different SSG |
| MINOR | New feature, new section, new page type, significant new chrome element | Add notes section, add easter egg, add print styles |
| PATCH | Bug fix, design tweak, content-only push, copy edit | Fix stoplight colour, add a post, fix a broken link |

The current site is **v1.x.x** — the word-processor aesthetic is the first major design identity.

### Tag types

**Release tags** (annotated) — for any change that affects the deployed site:
```sh
git tag -a v1.2.0 -m "Add zoom and font easter eggs to chrome"
git push origin v1.2.0
```

**Content tags** (lightweight) — optional, for notable content milestones:
```sh
git tag posts/against-dark-mode
git push origin posts/against-dark-mode
```

Use annotated tags (`-a`) for design and infrastructure changes so the message is stored. Lightweight tags are fine for content-only pushes.

### When to tag

| Change type | Tag? | Example tag |
|---|---|---|
| New post (routine) | Optional | `posts/slug` |
| New post (first of a new type) | Yes — PATCH | `v1.0.1` |
| Bug fix | Yes — PATCH | `v1.0.2` |
| Design tweak (stoplight, colours) | Yes — PATCH | `v1.0.3` |
| New chrome feature | Yes — MINOR | `v1.1.0` |
| New content section | Yes — MINOR | `v1.2.0` |
| Full visual redesign | Yes — MAJOR | `v2.0.0` |

### Tagging workflow

```sh
# 1. Confirm you are on the correct commit
git log --oneline -5

# 2. Create an annotated tag
git tag -a v1.2.0 -m "Brief description of what this release contains"

# 3. Push the tag separately from the branch
git push origin v1.2.0

# 4. List all tags to confirm
git tag -l
```

### Viewing and rolling back

```sh
# List all tags with messages
git tag -n

# See what changed between two releases
git diff v1.0.0 v1.1.0 -- src/css/

# Roll back locally to a tagged release (creates detached HEAD)
git checkout v1.0.0

# Create a branch from a past release to hotfix it
git checkout -b hotfix/feed-xml v1.1.0
```

---

## Commit message convention

Keep messages consistent so the git log reads as a changelog.

### Format
```
{Type}: {short description}

Optional body — why, not what. What is in the diff.
```

### Types

| Type | Use for |
|---|---|
| `Add` | New file, new feature, new post |
| `Fix` | Bug fix, broken behaviour |
| `Update` | Change to existing feature or content |
| `Redesign` | Visual overhaul of a section |
| `Refactor` | Code restructure with no behaviour change |
| `Docs` | CLAUDE.md, README, comments only |
| `Chore` | Dependency update, `.gitignore`, build config |

### Examples

```
Add: notes section with index and directory data
Fix: feed.njk missing layout: false — XML was wrapped in HTML shell
Update: stoplight dots — muted crescent highlight, less cartoony
Redesign: app chrome borders — consistent soft greys, no black
Docs: CLAUDE.md — add release tagging standard and commit convention
Chore: npm audit — eleventy patch update 3.1.5 → 3.1.6
```

---

## Full code review guide

### Eleventy config (`.eleventy.js`)
- Collections use `getFilteredByGlob` — verify glob paths match actual directory structure
- `markdownTemplateEngine: "njk"` means Nunjucks runs on all `.md` files — remember the `{#` trap
- Filters: `wordcount` and `readtime` strip HTML tags before counting — verify they guard against empty/null content
- Shortcodes: `pagebreak` is a non-paired shortcode returning a `<div>` (not `<hr>`) — `callout` and `marginnote` are paired and call `md.render()` on their content

### Templates (`src/_includes/layouts/`)
- `base.njk` — all chrome HTML and the inline `<script>` live here; every page inherits it; changes here affect everything
- `doc.njk` — prev/next nav uses `findIndex` filter against `collections.notes` or `collections.ideas` depending on the post's tags; verify the tag-based branch logic is correct when adding new content types
- `home.njk` — uses `collections.feed`; sigil (`→` or `·`) determined by `"ideas" in post.data.tags`
- `feed.njk` — must have `layout: false`; the only template that produces non-HTML output

### Inline JavaScript (`base.njk` script block)
- All code is in an IIFE — no globals leaked
- `initDropdown` returns `{ setValue }` — used by zoom to sync the dropdown label when keyboard shortcuts change zoom
- `sessionStorage` keys are namespaced (`musings-font`, `musings-zoom`) — will not collide with browser extensions or other sites
- Font and zoom are restored from `sessionStorage` on every page load, before first paint if possible
- `setActive(false/true)` is called on `window.blur`, `window.focus`, and `document.visibilitychange` — all three are needed to cover tab switching, app switching, and devtools focus

### CSS load order (`main.css`)
`tokens.css` → `reset.css` → `doc-chrome.css` → `typography.css` → `components.css` → `print.css`

Later files override earlier ones at equal specificity. `print.css` is last so `!important` in print rules rarely conflicts with screen rules.

### Specificity hotspots
- `.doc-body hr:not(.page-break)` — the `:not` is load-bearing; removing it lets `hr` margin rules override the page-break bleed
- `.doc-layout` must stay `grid-template-columns: 1fr` — a second column breaks the `width: calc(100% + ...)` page-break bleed
- `--chrome-h` must equal `--titlebar-h + --menubar-h + --toolbar-h + --ruler-h` exactly (currently 34+26+32+22 = 114px); headings and TOC sticky positioning depend on this

### Token usage audit
- Every spacing value must use `--space-{n}` — no raw `px` values for margins/padding outside chrome hardcodes
- Every colour in content must use `--color-*` tokens — no raw hex in `typography.css` or `components.css`
- `doc-chrome.css` is the only file permitted to have hardcoded hex border values (intentionally non-tokenised chrome greys)

---

## Full design review guide

### Per-viewport
- **Desktop (>960px):** Full chrome, TOC sidebar visible if present, ruler numbers visible
- **Tablet (600–960px):** Chrome intact, TOC sidebar hidden (`.doc-layout__sidebar { display: none }`)
- **Mobile (<600px):** Chrome not designed for mobile — titlebar, toolbar wrapping, ruler overflow are known unresolved gaps; do not try to patch them without a proper mobile plan

### Per-page-type
Check all four page types after any chrome or typography change:
1. **Home** (`/`) — feed list, sigils, post tags, dates
2. **Idea** (`/ideas/slug/`) — full prose, footnotes, page breaks, prev/next nav
3. **Note** (`/notes/slug/`) — short content, same layout as ideas
4. **About** (`/about/`) — static page, no date/wordcount in meta

### Font modes
Test both Arial and Georgia:
- [ ] Body text, headings, blockquotes, code (code must stay monospace regardless of font switch)
- [ ] Doc title, doc nav, doc meta — these inherit from `.doc-page { font-family: var(--font-doc) }`
- [ ] Post list on home page — inherits from `.doc-page` and must switch
- [ ] Chrome stays in Arial/Helvetica — toolbar, menubar, statusbar, dropdown labels must not change

### Zoom extremes
- [ ] 50% — content legible, no overflow beyond viewport
- [ ] 200% — page scrolls normally; sticky chrome remains full-width and unaffected
- [ ] Keyboard shortcuts Cmd/Ctrl +, -, 0 update both the canvas zoom and the dropdown label in sync

### Chrome coherence
- All chrome borders use soft greys (`#d4d4d4` range) — no `#000000` borders in the chrome band
- Titlebar has a subtle `#f8f8f8 → #efefef` gradient; menubar and toolbar are flat — three distinct visual layers
- Stoplight dots: muted colours, crescent highlight, not cartoony; inactive state is flat grey with ring only
- Dropdown panel: soft border `#c8c8c8`, light shadow, `✓` for selected item, no bold weight
- Pipe separators in toolbar: `#d0d0d0` — visible but not prominent

### Print
`Cmd+P` in the browser — verify all of:
- All chrome elements hidden (titlebar, menubar, toolbar, ruler, statusbar, post-nav)
- White background, black text
- External links show their URL in parentheses after the link text
- Internal anchor links (`#...`) do not show URLs
- `<hr class="page-break">` triggers an actual page break in the print preview
- Footnotes section starts on a new page

### Colour contrast (WCAG AA minimum — 4.5:1 for normal text)
- Body text `#000` on page `#ffffff` — 21:1 (passes AAA)
- Muted text `#666666` on white — 5.74:1 (passes AA)
- Post tag: `#000` on `#ffff00` — passes AA
- Link `#0000ee` on white — passes AA
- Chrome text `#333` on `#f0f0f0` — 8.8:1 (passes AAA)

---

## Infrastructure review guide

### `src/_data/site.json`
- `url` — must exactly match the live domain, no trailing slash, correct protocol
- `chrome.*` — these are decoration values rendered into the static HTML at build time; they do not update at runtime; changes require a rebuild

### Atom feed
- Generated by `src/ideas/feed.njk`
- Must have `layout: false` in front matter — this is the most common feed breakage cause
- Validate at [validator.w3.org/feed](https://validator.w3.org/feed) after any change to feed template or post front matter shape
- Only includes ideas — intentional; notes are too short for feed readers

### Passthrough copies
Three directories are passthrough-copied as-is: `src/fonts/`, `src/css/`, `src/images/`. Any new static asset type (e.g. videos, PDFs) needs a corresponding `addPassthroughCopy` call in `.eleventy.js`.

### 404 handling
Eleventy does not generate a `404.html` by default. Add `src/404.md` with `permalink: /404.html` if not already present, and configure the host to serve it on 404. Netlify uses a `_redirects` file or `netlify.toml`; GitHub Pages uses a `404.html` at the repo root.

### Build output hygiene
- `_site/` must not be committed — verify `.gitignore` contains `_site`
- `node_modules/` must not be committed — verify `.gitignore` contains `node_modules`
- No `.env` files exist in this project — if one is ever added, add it to `.gitignore` before the first commit

### Dependency audit
```sh
npm audit          # Check for known vulnerabilities in devDependencies
npm outdated       # List available updates
```
All dependencies are `devDependencies` — they run at build time only; nothing is shipped to the browser. The full dependency surface is: Eleventy, `markdown-it-anchor`, `markdown-it-attrs`, `markdown-it-footnote`.

When updating Eleventy, check the [Eleventy changelog](https://www.11ty.dev/docs/changelog/) for breaking changes in collection APIs, filter signatures, and template engine versions before upgrading.
