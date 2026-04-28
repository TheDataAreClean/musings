# Musings

Personal blog at [musings.thedataareclean.com](https://musings.thedataareclean.com). Built to look like an open word-processor document in the browser.

---

## Quickstart

```sh
npm install
npm run dev      # dev server → http://localhost:8081
```

Full command reference: [COMMANDS.md](COMMANDS.md)

---

## Top-level layout

```
src/              Content, templates, CSS, JS, static assets
  ideas/          Long-form essays
  notes/          Short observations
  snaps/          Photography posts
  css/            All stylesheets (6 files)
  _includes/      Nunjucks layouts
  _data/          Global data (site.json)
  images/         Static images
  fonts/          Static fonts
  admin/          Sveltia CMS entry point + config
.eleventy.js      Eleventy config — collections, filters, shortcodes
.github/          Deploy workflow
```

---

## Docs

| File | Purpose |
|---|---|
| [README.md](README.md) | This file — what it is and how to start |
| [APP.md](APP.md) | Architecture and technical reference |
| [COMMANDS.md](COMMANDS.md) | All commands, copy-paste ready |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [FUTURE.md](FUTURE.md) | Ideas backlog |
| [CLAUDE.md](CLAUDE.md) | Working instructions for Claude |
