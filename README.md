# Musings

Personal blog at [musings.thedataareclean.com](https://musings.thedataareclean.com). Built to look like an open word-processor document in the browser.

---

## Stack

| Concern | Choice |
|---|---|
| Generator | [Eleventy 3.x](https://www.11ty.dev/) |
| Templates | Nunjucks + Markdown |
| Styling | Vanilla CSS (~650 lines across 6 files) |
| JavaScript | Minimal inline script — font switcher, zoom, stoplight easter eggs |
| Fonts | Arial (system font — no loading) |
| Hosting | GitHub Pages + custom domain |

---

## Commands

```sh
npm install
npm run dev      # dev server at localhost:8080
npm run build    # production build → _site/
npm run clean    # delete _site/
```

---

## Content types

Three collections, all under `src/`:

| Type | Directory | Sigil | Use for |
|---|---|---|---|
| Ideas | `src/ideas/` | `→` | Long-form essays |
| Notes | `src/notes/` | `·` | Short observations |
| Shots | `src/shots/` | `○` | Photography |

### Creating a post

**Idea** — `src/ideas/YYYY-MM-DD-slug.md`:
```yaml
---
title: On Something
date: 2026-03-26
description: One sentence for OG tags.
tags:
  - optional-tag
---
```

**Note** — `src/notes/YYYY-MM-DD-slug.md`:
```yaml
---
title: Something noticed
date: 2026-03-26
tags:
  - optional-tag
---
```

**Shot** — `src/shots/YYYY-MM-DD-slug.md`:
```yaml
---
title: Place or subject
date: 2026-03-26
description: One line of context.
tags:
  - optional-tag
---
```

The `ideas`, `notes`, and `shots` collection tags are set by the directory data files — no need to repeat them in front matter. Layout is also automatic.

---

## Shortcodes

```njk
{% pagebreak %}

{% callout "note" %}
Content. Supports **markdown**.
{% endcallout %}

{% callout "warning" %}
A warning callout.
{% endcallout %}

{% marginnote %}
Short aside rendered inline.
{% endmarginnote %}
```

Section break (renders as `* * *`): plain `---` in body.

Page break (renders as grey desk strip): `<hr class="page-break">`.

---

## CSS architecture

```
tokens.css      All custom properties — colours, fonts, spacing, dimensions
reset.css       Minimal reset + hr border: none
doc-chrome.css  App chrome (titlebar, menubar, toolbar, ruler, statusbar)
                Canvas, doc-page, doc-layout, page-break, mobile overrides
typography.css  Document prose — headings, paragraphs, lists, code, tables
components.css  Post list, footnotes, callouts, margin notes, post-nav, archive
print.css       Print stylesheet — strips chrome, shows link URLs
```

---

## The easter eggs

Three interactive elements in the chrome decoration:

| Element | Behaviour |
|---|---|
| Red stoplight dot | `window.close()` — works for script-opened tabs, silent no-op for normal tabs |
| Font dropdown | Switches `--font-doc` between Arial and Georgia; persists in `sessionStorage` |
| Zoom dropdown | Sets canvas CSS zoom 50–200%; Cmd/Ctrl +/-/0 keyboard shortcuts; persists in `sessionStorage` |

Yellow and green dots are non-interactive `<span>` elements. All chrome is `aria-hidden="true"`.

---

## Notion CMS

Content is authored in a Notion database and synced to the repo automatically.

**How it works:** `.github/workflows/sync.yml` runs daily at midnight UTC (and on manual trigger). It calls `scripts/sync-notion.js`, which queries Notion for pages with **Status = Ready**, converts them to markdown, and commits new/changed files to `src/{type}/`. That commit triggers `deploy.yml`, deploying the updated site.

**Required GitHub Secrets:** `NOTION_TOKEN` + `NOTION_DATABASE_ID`

**Run locally:**
```sh
export NOTION_TOKEN=secret_xxx
export NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
node scripts/sync-notion.js
```

**Images:** Notion image URLs are signed S3 links that expire in ~1 hour. The sync script automatically downloads every image to `src/images/notion/` and rewrites the markdown URL to the local path, so images are permanent in the deployed site.

See `CLAUDE.md` for the full Notion database schema and setup checklist.

---

## Deployment

Two GitHub Actions workflows handle deployment:

| Workflow | Trigger | Action |
|---|---|---|
| `deploy.yml` | Push to `main` or manual | Build Eleventy → deploy to GitHub Pages |
| `sync.yml` | Daily midnight UTC or manual | Sync Notion → commit → trigger deploy |

Custom domain: DNS `CNAME musings → thedataareclean.github.io`. The `src/CNAME` file is passthrough-copied into `_site/` at build time.

---

## Developer reference

See `CLAUDE.md` for the full architecture reference, authoring rules, known traps, review checklists, and release standards.
