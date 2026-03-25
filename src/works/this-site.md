---
title: This Site
date: 2025-01-01
year: 2025
role: Design, Development
status: Ongoing
description: A personal site that looks like a living document. Brutalist, plain, static.
tags:
  - web
  - design
---

## What It Is

A personal blog built on the premise that the best interface for reading is a document. Not a dashboard. Not a feed. A document — with all the attendant chrome: rulers, margins, section numbers, page breaks, footnotes.

The aesthetic is part Google Docs, part typewriter, part brutalist architecture. White background. Black text. Monospace where the content is metadata. No JavaScript at runtime. One HTML file and one CSS file per page.

## Why

Most personal sites are performing something. The choice of typeface, the hover animations, the custom cursor — these are declarations of taste, aimed at an imagined audience.

I wanted a site where the only declaration is: here is the work. Read it or don't.

The document metaphor earns this. A document is not trying to impress you. It is trying to communicate with you. There is a difference.

## How It's Built

**Generator:** Eleventy (11ty)
**Fonts:** iA Writer Quattro + Mono (self-hosted WOFF2, open source)
**JavaScript:** None at runtime
**CSS:** ~800 lines across five files
**Hosting:** Static files

The CSS does the aesthetic work:

- `repeating-linear-gradient` for the ruler tick marks
- CSS `counter-increment` for section numbering and page numbers
- `position: sticky` for the ruler and sidebar TOC
- `:target` pseudo-class for footnote and section highlighting
- `<details>`/`<summary>` for the mobile TOC and archive collapse
- `::selection` for the yellow Google Docs highlight

No framework. No component system. No build step beyond Eleventy's template rendering.

## The Brutalist Part

Brutalism in architecture meant: expose the material. Don't hide the concrete behind plaster. Let the structure be visible.

Here the material is HTML. The links are browser-default blue. The visited links are browser-default purple. The font is monospace in the places where monospace makes sense. The borders are `1px solid black`, not `1px solid rgba(0,0,0,0.12)`.

This is not laziness. It is a position.

## What It Doesn't Do

- No analytics
- No comments
- No dark mode (the document is white)
- No infinite scroll
- No JavaScript
- No cookies
- No web fonts loaded from external servers
