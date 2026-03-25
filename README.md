# Musings

A personal blog that looks like a living document. Brutalist, plain, static.

## Design Principles

- **Document aesthetic** — the site is a document. Ruler, margins, section numbers, page breaks, footnotes. All doc-software chrome.
- **Brutalist touch** — raw browser-default link colors, `1px solid black` borders, nothing softened.
- **No runtime JavaScript** — all interactivity is CSS-only (`<details>`, `:target`, sticky positioning, counters).
- **Content first** — works and ideas on the homepage. No decoration between you and the words.

## Stack

| Concern | Choice |
|---|---|
| Generator | [Eleventy (11ty)](https://www.11ty.dev/) |
| Templates | Nunjucks + Markdown |
| Fonts | iA Writer Quattro + Mono (self-hosted WOFF2, optional) |
| CSS | Vanilla CSS, ~800 lines across 5 files |
| JavaScript | None at runtime |

## Getting Started

```sh
npm install
npm run dev      # start dev server at localhost:8080
npm run build    # build to _site/
```

## Adding Content

### New idea (post/essay)

Create `src/ideas/YYYY-MM-DD-slug.md`:

```markdown
---
title: Your Title
date: 2025-04-01
description: One-line description for the index.
tags:
  - tag-name
---

Your content here.
```

The layout, section numbering, word count, read time, footnote handling, and TOC are all automatic.

### New work (project)

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

Full description and case study here.
```

## Shortcodes

### Page break

Insert a manual page break (rendered as a dashed divider with page number):

```
{% pagebreak %}
```

### Callout

```
{% callout "note" %}
This is a note. Supports **markdown**.
{% endcallout %}
```

Types: `note` (default), `warning`.

### Margin note

For asides that live in the margin on desktop, inline on mobile:

```
{% marginnote %}
A short aside.
{% endmarginnote %}
```

## CSS Architecture

```
src/css/
├── tokens.css      # All custom properties (color, type, spacing, layout)
├── reset.css       # Minimal opinionated reset
├── doc-chrome.css  # Ruler, header, metadata strip, counters, page breaks, left border
├── typography.css  # Prose typesetting, headings, lists, code, tables
├── components.css  # TOC, footnotes, callouts, post list, archive, works list
├── print.css       # Print stylesheet
└── main.css        # @import aggregator
```

## Doc-Software Quirks

All implemented in CSS, no JavaScript:

| Quirk | CSS technique |
|---|---|
| Ruler with tick marks | `repeating-linear-gradient` with `cm` units, `position: sticky` |
| Section numbering | `counter-increment` on `h2`/`h3` with `::before` |
| Page numbers | `counter-increment` on `.page-break` via `{% pagebreak %}` shortcode |
| Footnotes | `markdown-it-footnote` plugin + `:target` highlight |
| Sticky TOC | `position: sticky` in grid sidebar column |
| Footnote highlight on click | `:target { background: yellow }` |
| Section highlight on deep link | `h2:target { background: yellow }` |
| Selection color | `::selection { background: #ffff00 }` |
| Mobile TOC toggle | `<details>`/`<summary>` |
| Archive collapse | `<details>`/`<summary>` |
| Cursor on title | `cursor: text` — looks editable, isn't (the brutalist joke) |

## Customization

Edit `src/_data/site.json` to set your name, title, and URL:

```json
{
  "title": "Musings",
  "author": "Your Name",
  "description": "Works and ideas, in document form.",
  "url": "https://yourdomain.com",
  "lang": "en"
}
```

## Fonts

The site works fine with system monospace fonts. To get iA Writer Quattro and Mono:

1. Download from [github.com/iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts) (open source)
2. Convert to WOFF2 if needed
3. Place in `src/fonts/`
4. Add `@font-face` declarations to `src/css/tokens.css`

## Deployment

The `_site/` directory is pure static HTML + CSS. Deploy to:

- **Cloudflare Pages**: connect git repo, build command `npm run build`, output `_site`
- **GitHub Pages**: push `_site/` or use GitHub Actions
- **Netlify**: connect git repo, same settings as Cloudflare Pages
- **Anywhere**: it's just files. `rsync -av _site/ user@server:/var/www/`

## What It Doesn't Do

- No analytics
- No comments
- No dark mode (the document is white)
- No JavaScript
- No cookies
- No external font loading
