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
  versions/       Saved earlier versions of revised posts (script-written, never edit)
  css/            All stylesheets (main.css imports the other 6)
  js/             comments.js (margin notes)
  tags/           Tag pages
  _includes/      Nunjucks layouts and partials
  _data/          Global data (site.json, tokens.js, versions.js)
  images/         Static images (symlink → top-level images/, see APP.md)
  admin/          Sveltia CMS entry point + config
scripts/          Prebuild scripts — dates, WebP, permalinks, version snapshots, og:images
.eleventy.js      Eleventy config — collections, filters, shortcodes
scripts/          Prebuild scripts (dates, WebP, permalinks, og:images)
images/           Uploads (served via the src/images symlink)
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
