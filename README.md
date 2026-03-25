# Musings

A personal blog built to look and feel like an open word processor document. The application chrome — title bar, menu bar, toolbar, ruler, status bar — is static decoration. The white page card floating on a grey desk is where everything real lives.

---

## Design brief

**The concept:** "docs come alive." Open Google Docs or Microsoft Word on a blank document and start typing. That is the aesthetic. No web conventions, no cards, no hover states, no styled buttons. Just text on a white page inside an application frame.

**Three rules:**

1. The application chrome is decoration. Nothing in the title bar, menu bar, toolbar, or status bar is clickable. Navigation lives inside the document as plain hyperlinks.
2. The document view has no formatting beyond what the words themselves provide. Headings are bigger and bolder. Links are blue and underlined. Everything else is text.
3. No JavaScript at runtime. Every interactive behaviour — collapsing archive, mobile TOC toggle, footnote highlighting, page-break counters — is CSS only.

---

## What it looks like

```
┌─ Title bar ────────────────────────── Musings — On Plainness ── Saved ✓ ─┐
│ File  Edit  View  Insert  Format  Tools  Help                             │  ← static decoration
│ Arial  12  |  B  I  U  |  ←  ↔  →                             100%      │
│ ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓ │  ← ruler
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  grey desk                                                                │
│         Home · Works · Ideas · About          ← plain hyperlinks         │
│    ┌────────────────────────────────────────┐                            │
│    │                                        │                            │
│    │  On Plainness                          │  ← white page card         │
│    │  15 January 2025 · 847 words · 4 min  │                            │
│    │                                        │                            │
│    │  There is a certain kind of web page  │                            │
│    │  that announces itself before you     │                            │
│    │  read it...                           │                            │
│    │                                        │                            │
│    └────────────────────────────────────────┘                            │
│                                                                           │
│ Page 1  |  English (UK)                              Your Name           │  ← static decoration
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Stack

| Concern | Choice |
|---|---|
| Generator | [Eleventy (11ty)](https://www.11ty.dev/) v3 |
| Templates | Nunjucks + Markdown |
| Font | Arial (system font, no loading) |
| CSS | Vanilla, ~600 lines across 6 files |
| JavaScript | None at runtime |
| Hosting | Any static host — Cloudflare Pages, GitHub Pages, Netlify, rsync |

---

## Getting started

```sh
npm install
npm run dev      # dev server at localhost:8080 (or 8081 if port taken)
npm run build    # builds to _site/
```

First thing to do: edit `src/_data/site.json`.

```json
{
  "title": "Your Site Name",
  "author": "Your Name",
  "description": "One sentence about what this is.",
  "url": "https://yourdomain.com",
  "lang": "en"
}
```

---

## Adding content

### An idea (essay, note, post)

Create `src/ideas/YYYY-MM-DD-slug.md`:

```markdown
---
title: On Something
date: 2025-04-01
description: One line for the index page.
tags:
  - writing
---

Your essay here. Footnotes[^1] work out of the box.

[^1]: Rendered at the bottom with a back-link.
```

Word count, read time, and date appear automatically in the metadata line.
The layout, TOC (if the post has more than two headings), and footnotes are automatic.

### A work (project, case study)

Create `src/works/slug.md`:

```markdown
---
title: Project Name
date: 2025-04-01
year: 2025
role: Design, Development
status: Complete
description: What it is, in one sentence.
link: https://example.com
tags:
  - web
---

Full description here.
```

---

## Shortcodes

### Page break

Inserts a visual page gap — grey desk background shows through, with a page number:

```
{% pagebreak %}
```

### Callout

```
{% callout "note" %}
This is a note callout. Supports **markdown** inside.
{% endcallout %}
```

Types: `note` (default, yellow tint), `warning` (orange tint).

### Margin note

Appears in the right sidebar column on desktop, inline on mobile:

```
{% marginnote %}
A short aside rendered in the margin.
{% endmarginnote %}
```

---

## CSS architecture

Six files, loaded in order via `@import` in `main.css`:

```
src/css/
├── tokens.css      Design system — all custom properties.
│                   Colors, fonts, spacing, page dimensions, chrome heights.
│
├── reset.css       Minimal reset. Preserves browser defaults where sensible.
│                   Sets ::selection to yellow (Google Docs style).
│
├── doc-chrome.css  The application frame.
│                   Title bar, menu bar, toolbar, ruler, grey desk canvas,
│                   app-nav (real navigation), white page card, status bar.
│                   Also: doc-title, doc-meta, page-break, :target highlight.
│
├── typography.css  Document prose.
│                   Headings (size + weight only, no decoration).
│                   Paragraphs with first-line indent on consecutive paras.
│                   Blockquote (indented, italic). Code. Tables. hr as * * *.
│
├── components.css  Reusable pieces.
│                   TOC sidebar + mobile toggle. Footnotes. Callouts.
│                   Post list (ideas index). Works list. Archive (details/summary).
│                   Post navigation (prev/next as plain links).
│
└── print.css       Print stylesheet.
                    Strips all chrome. Shows full URLs after links.
                    Page breaks on .page-break elements.
```

### Key token values

```css
--font-ui:       Arial, Helvetica, sans-serif   /* chrome + UI */
--font-doc:      Arial, Helvetica, sans-serif   /* document body */
--font-mono:     'Courier New', Courier, monospace

--color-app-bg:  #c8c8c8    /* the grey desk */
--color-page-bg: #ffffff    /* the white paper */
--color-link:    #0000ee    /* raw browser-default blue */
--color-visited: #551a8b    /* raw browser-default purple */
--color-mark:    #ffff00    /* Google Docs selection yellow */

--page-width:    816px      /* US Letter at 96 dpi */
--page-pad-h:    96px       /* 1 inch side margins */
--page-pad-v:    80px       /* top/bottom page padding */
```

---

## How the application chrome works

The chrome (title bar → menu bar → toolbar → ruler) is built from four sticky `div`s that stack at the top of the viewport. Each is `position: sticky` with increasing `top` values so they stack cleanly:

```
title bar:   top: 0
menu bar:    top: var(--titlebar-h)
toolbar:     top: calc(var(--titlebar-h) + var(--menubar-h))
ruler:       top: calc(var(--titlebar-h) + var(--menubar-h) + var(--toolbar-h))
```

All four have `aria-hidden="true"` and `cursor: default`. They are purely visual.

The ruler uses two `::before`/`::after` pseudo-elements on a grey background:
- `::before` — a white zone centered at `var(--page-width)` with CSS `repeating-linear-gradient` tick marks
- `::after` — overlays grey margin zones at each side of the white zone (`var(--page-pad-h)` wide)

The status bar is `position: fixed; bottom: 0`.

---

## How the document page works

The `.app-canvas` div (grey background) holds two things:

1. `.app-nav` — plain text navigation links (`Home · Works · Ideas · About`), sitting on the grey desk above the page card
2. `<main>` — contains the white `.doc-page` card

The `.doc-page` is a white `div` with `max-width: 816px`, `padding: 80px 96px`, and a `box-shadow` that makes it look like a sheet of paper. It is not a `<body>` background — it is a genuinely floating element on a grey surface.

---

## CSS-only interactions

Nothing uses JavaScript. All interactive behaviour:

| Behaviour | Technique |
|---|---|
| Mobile TOC toggle | `<details>`/`<summary>` — no JS |
| Archive collapse (older posts) | `<details>`/`<summary>` — no JS |
| Footnote highlight on click | `li:target { background: yellow }` |
| Heading highlight on deep-link | `h2:target { background: yellow }` |
| Page-break counter | CSS `counter-increment` on `.page-break` via `{% pagebreak %}` shortcode |
| Sticky chrome and TOC | `position: sticky` with stacked `top` values |
| Yellow text selection | `::selection { background: #ffff00 }` |

---

## Content collections

Eleventy builds two collections from glob patterns in `.eleventy.js`:

- `collections.ideas` — all `.md` files under `src/ideas/`, sorted by date descending
- `collections.works` — all `.md` files under `src/works/`, sorted by date descending

Both are defined explicitly in `.eleventy.js` rather than relying on Eleventy's tag system, for predictable ordering.

Folder-level data files (`ideas.json`, `works.json`) set the default layout and tags for every file in the folder — no per-file front matter required for those fields.

---

## Build-time filters (no client JS)

All computed values are resolved at build time in `.eleventy.js`:

| Filter | What it does |
|---|---|
| `wordcount` | Strips HTML tags, splits on whitespace, counts words |
| `readtime` | `ceil(wordcount / 200)` — 200 wpm reading speed |
| `readableDate` | Formats a date as `15 January 2025` |
| `isoDate` | Formats a date as `2025-01-15` for `datetime` attributes |
| `groupByYear` | Groups a post collection into `{ year, items[] }` for the archive |
| `limit` / `offset` | Slices arrays — used to separate recent posts from the archive |
| `findIndex` | Finds a page's position in a collection — used for prev/next navigation |
| `excerpt` | Strips HTML, returns first 200 characters |

---

## Deployment

Build output is `_site/` — pure HTML and CSS files. No server required.

```sh
npm run build
```

Then deploy `_site/` anywhere:

```sh
# Cloudflare Pages / Netlify / GitHub Pages
# Connect git repo, set build command to: npm run build
# Set output directory to: _site

# Self-hosted
rsync -av _site/ user@yourserver.com:/var/www/html/
```

---

## What this does not do

- No JavaScript (runtime)
- No analytics or tracking
- No comments
- No dark mode
- No cookies
- No external font loading
- No CSS framework
- No build tool beyond Eleventy's template rendering
