# APP.md — Musings

Architecture and technical reference. Claude's operating manual lives in [CLAUDE.md](CLAUDE.md).

**Contents:** [Architecture](#architecture-at-a-glance) · [Stack](#stack) · [Content collections](#content-collections) · [Post versions](#post-versions) · [Eleventy config](#eleventy-config-eleventyjs) · [Templates](#template-hierarchy) · [CSS](#css-architecture) · [Shortcodes](#shortcodes) · [Markdown](#markdown-extensions) · [Inline JS](#inline-js-basenjk-script-block) · [Infrastructure](#infrastructure) · [Dependencies](#dependencies)

---

## Architecture at a glance

Static site generator (Eleventy 3.x) → HTML + CSS + JS → GitHub Pages.

No bundler. Eleventy templates produce static HTML; all CSS and JS are served as-is. Five Node `prebuild` scripts run before each build (dates, WebP, permalinks, version snapshots, og:images — see Deployment).

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
| Styling | Vanilla CSS (~1,800 lines across 7 files, `main.css` imports the rest) |
| JavaScript | Inline script in `base.njk` + `src/js/comments.js` (margin notes) — no bundler |
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

Fields: `title`, `description`, `date`, `tags`, `slug`, `permalink` (script-managed), `draft`, and optional `updated` (tie-break in the sort above). Order doesn't matter; Sveltia CMS writes `title, slug, date, draft, description, tags`. All three sections take the same fields:

```yaml
title: The title                 # snaps: the place or subject
description: One sentence — shown as subtitle and used for OG meta.
date: 2026-03-26                 # a bare date gets its time from git (backfill-dates.js)
tags:
  - design
slug: optional-custom-url-slug   # omit to use the filename
draft: true                      # omit to publish
```

**Drafts.** `draft: true` keeps a post off the home page, section lists, tag pages, the feed and `/posts.json` (`filterDrafts` and the `published` filter in `.eleventy.js`; `generate-og-images.js` leaves drafts out of tag counts). The post page itself is still built, so its URL works once the file is on `main`. Under `npm run dev` drafts show everywhere, so you can preview them in lists.

Optional on any post, once it has been revised (see Post versions below):
```yaml
version: 2                        # bump to publish a new version
versionNote: One line on what changed.
versionDate: 2026-10-20T…         # script-managed, do not set by hand
```

Layout is inherited from directory data files (`src/ideas/ideas.json`, `src/notes/notes.json`, `src/snaps/snaps.json`, and `src/versions/versions.json` for snapshots) — do not repeat it in front matter. `tags` beyond the collection tag (`ideas`/`notes`/`snaps`, also inherited) are freeform, e.g. `personal`, `tech`, `design`.

---

## Post versions

A post can be revised in public: readers land on the latest version at the post's usual URL, can open any earlier version, and can see what changed. Git history can't be the version store, because Sveltia commits on every save; a version is something the author declares with `version:`.

**Authoring.** In the CMS, bump **Version** and fill **What changed** in the same save as the first edit of the new version. Saves publish immediately, so edits saved before the bump become part of the old version.

**Snapshots.** `scripts/snapshot-versions.js` (prebuild, and before each dev-server rebuild) looks at every post with `version: N` (N ≥ 2). For each earlier version without a snapshot it finds, in the file's git history (`git log --follow`), the newest commit where the post was still at that version (no `version:` counts as 1), and writes it to `src/versions/{section}/{post-file-stem}/v{n}.md`. The deploy's auto-commit step saves it; from then on it's never regenerated and no longer depends on history. Snapshot front matter: `title`, `description`, `date`, `postTags` (not `tags`, so snapshots stay out of tag collections), `version`, `versionDate`, `versionNote`, `versionOf` (the live post's path) and `permalink`. The script also keeps each snapshot's `permalink` in step with its post's URL, and stamps `versionDate` on the live post when the bump is first committed (now, if it isn't committed yet).

**URLs.** `{post-url}` is always the latest version. `{post-url}v{n}/` is an earlier version (`src/versions/`, layout from `src/versions/versions.json`). `{post-url}v{n}/changes/` is what changed from version n to the next version that exists (`src/changes.njk`, paginated over the `versions` collection). Numbers can be skipped (1 → 3): the script warns that v2 can't be saved and everything compares 1 with 3. The changes page shows the newer title and description, and notes the old title, description or tags in its version footnote when they changed. Earlier versions and changes pages set `rel=canonical` and `og:image` to the latest version.

**Data.** `src/_data/versions.js` builds `versions[inputPath]` → `{ latest, all, newestFirst, byVersion }` for every post with snapshots (`all` oldest first, so `all[0]` is the original); each version is `{ version, date, note, url, changesUrl, original, nextVersion }`, where `nextVersion` is the next version that exists. Post lists render their date through `src/_includes/post-date.njk`, which reads the same data. Templates look versions up by number through `byVersion`, never by position, since numbers can skip. `doc.njk`, `base.njk` and `feed.njk` look it up by `page.inputPath`, or by `"./" + versionOf` on snapshot and changes pages.

**Reader UI.** Two places, one in the chrome and one in the document:

- **Version history menu** (`base.njk`). On a revised post, from two versions up, the titlebar's right (`.app-titlebar__versions`) shows "Edited [latest date] ▾" in place of the save state ("Version of [date] ▾" on an earlier version; a changes page counts as its newer version) and opens a "Version history" list: every version's date, newest first, the one on screen bold, marked "latest" and "original". Dates only; notes and links live in the footnote. The titlebar's title and the browser tab title are unchanged. Like all chrome it's `aria-hidden` and doesn't print.
- **Edit note** (the document's only version note, so it prints and reaches screen readers). A one-line quote, `.version-line` (styled with `.doc-body blockquote` in `typography.css`, same bar and padding, so every quote looks the same), sits after the tags (after the description on changes pages, which have no meta) and ends in a superscript `[*]` linking to `#fn-version`. That footnote is the last item of the post's footnotes: `withVersionFootnote` adds it to markdown-it-footnote's list, built from the plugin's own markup, or starts a footnotes section. `.footnote-item--version` sets its marker to `*` so its text lines up with the numbered notes; it has the usual ↩ back-link. The macros live in `src/_includes/version-notes.njk`, shared with the feed.

| Page | Line | Footnote |
|---|---|---|
| Latest | This post was edited on 15 Oct, 2026[*] | [note]. What changed · Earlier versions |
| Middle version | This is an older version of this post, from 13 Oct, 2026[*] | [its note]. What changed · Latest version |
| Original | This is the original version of this post, from 10 Oct, 2026[*] | Edited on [next version's date]. What changed · Latest version |
| Changes page | These are the edits made on 15 Oct, 2026[*] | [note]. Red is removed, green is added. Before, the title was ~…~, the description ~…~ and the tags ~…~. Latest version · Previous version |

A missing note reads "Edited on [date].". The "Before, …" sentence lists only what changed (`beforeSentence`). "Previous version" is the diff's "before" side. "Earlier versions" opens the titlebar's version history, however many versions there are (`data-open-versions`; its href, the original, is the no-JS fallback). These are the only link names. Version notes get a full stop unless they end in `.`, `!` or `?` (`sentence`).

**Listings** show a revised post's latest version date, marked "(updated)", in place of its original date; the list stays in original-date order.

**Diff.** The `htmlDiff` filter tokenizes both rendered bodies into tags and words, diffs them with `diff`'s `diffArrays`, and outputs the newer version's tags with added words in `<ins>` and removed words in `<del>`. A removed run that is balanced on its own (a whole paragraph) keeps its tags; images count as words. `--color-ins`/`--color-del` (+ `-bg`) style them.

**Feed.** Same entry and id; `<published>` is the post date, `<updated>` the latest version's date, and the entry carries the same edit note as the page, from the same macros (`src/_includes/version-notes.njk`): the quoted "This post was edited on 15 Oct, 2026[*]" line after the description (inline styles), and the `[*]` footnote added to the post's footnotes with absolute links and an inline `*` marker. "Earlier versions" is a plain link to the original there. The feed's own `<updated>` is the newest of its entries' `<updated>`, so a revision counts as a feed change. Earlier versions never appear in the feed, listings or tag pages.

---

## Eleventy config (`.eleventy.js`)

- `markdownTemplateEngine: "njk"` — Nunjucks runs on all `.md` files before Markdown
- `sortPosts` shared function handles all four collection sorts; `filterDrafts` drops drafts, except under `npm run dev`
- `quote_breaks` core rule keeps single line breaks inside quotes (see Shortcodes → Quotes)
- Under `npm run dev`, `snapshot-versions.js` runs before each rebuild (it's a prebuild step otherwise)
- `assetVersion` global → the per-build `?v=` stamp on CSS/JS links; an `eleventy.after` hook stamps the `@import`s in `main.css`
- `buildTime` global → feed fallback timestamp
- Filters and shortcodes: see the tables below

Global data in `src/_data/`: `site.json` (title, author, URL, chrome labels), `tokens.js` (parses `tokens.css` for `/style/`), `versions.js` (post version history, see Post versions).

---

## Template hierarchy

Layouts (`src/_includes/layouts/`):

```
base.njk      Shell — chrome HTML, inline <script>, affects every page
doc.njk       Single post layout (wraps base.njk)
home.njk      Home/feed listing (wraps base.njk)
```

Generated pages in `src/`:

```
{ideas,notes,snaps}/index.njk   Section lists → /ideas/, /notes/, /snaps/
tags/index.njk                  One page per tag → /tags/{tag | tagSlug}/ (paginates collections.tagList)
feed.njk                        Atom XML → /feed.xml — must have layout: false
posts.njk                       JSON list of post URLs → /posts.json (File → New)
404.md                          Not-found page → /404.html
changes.njk                     A post version's "what changed" page → {post}/v{n}/changes/ (Post versions)
```

Includes: `nav.njk` (site nav), `post-date.njk` (a list item's date, "(updated)" on revised posts), `version-notes.njk` (the edit note line and `[*]` footnote, used by `doc.njk` and `feed.njk`).

`doc.njk` element order: title → nav → description (if present) → meta and tags (omitted if `hideMeta: true`) → edit note line (revised posts, see Post versions) → body → post-nav (omitted if `hidePostNav: true`)

**Page height and post-nav:** `.doc-page` is one screen tall at minimum (`calc(100vh - var(--chrome-h) - var(--statusbar-h) - var(--space-6) * 2)` in `doc-chrome.css`), not A4. When the post-nav is shown, `doc.njk` adds `.doc-page--with-nav`, a flex chain (page → `.doc-layout` → `.doc-layout__content`) in `components.css` that pins `.post-nav` to the bottom of the page with `margin-top: auto`, under a thin rule. On long posts it just follows the body. `print.css` resets both (`display: block; min-height: 0`).

**Standalone pages** (not posts — no collection tag, so not in listings or the feed): `src/about.md` → `/about/`, `src/reference.md` → `/reference/` (every formatting element, and a live test of the shortcodes), `src/style.njk` → `/style/` (design tokens and components). The last two set `hideMeta` and `hidePostNav`.

`src/_data/tokens.js` parses the first `:root` block of `tokens.css` at build time and feeds `/style/` (fonts, type scale, colour groups, spacing, page and chrome dimensions), so the page cannot drift from the real values. The parser expects the existing conventions: a `/* Group title — note */` comment line starts a group, and each token is `--name: value; /* note */` on one line. Add a new token there and it appears on `/style/` automatically if its name starts with `--font-`, `--text-`, `--leading-`, `--space-`, `--color-`, or one of the dimension prefixes (`--page`, `--comment`, `--titlebar`, `--menubar`, `--toolbar`, `--ruler`, `--statusbar`, `--chrome`); any other prefix needs adding to `tokens.js`. A value that is a `calc()` sum of `px` tokens (`--chrome-h`) is shown resolved (114px) with the formula as a note.

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
print.css       Print stylesheet — A4 page like the screen page, no chrome, footer, page address at the end
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
| `--chrome-h` | 114px | Sum of the four sticky bars (34+26+32+22); 92px on mobile, where `--ruler-h` is 0 |
| `--doc-scale` | 1 | Document text size multiplier, set by the toolbar size picker (12 = 1) |
| `--color-ins` / `--color-ins-bg` | #0a6b2d / #e6f4ea | Added text on a changes page |
| `--color-del` / `--color-del-bg` | #b3261e / #fce8e6 | Removed text on a changes page |
| `--comment-w` | 208px | Width of a comment card in the desk rail |
| `--comment-gap` | 14px | Gap between the page edge and the comment rail |
| `--titlebar-h` | 34px | |
| `--menubar-h` | 26px | |
| `--toolbar-h` | 32px | |
| `--ruler-h` | 22px | 0 on mobile (ruler hidden) |
| `--statusbar-h` | 22px | Bottom status bar; not part of `--chrome-h` |

`--chrome-h` is used by `scroll-margin-top` on headings. Must be kept in sync with individual bar heights manually.

---

## Shortcodes

Defined in `.eleventy.js`:

| Shortcode | Type | Output |
|---|---|---|
| `{% callout "note" %}…{% endcallout %}` | Paired | Callout block (type: `note` or `warning`) |
| `{% marginnote %}…{% endmarginnote %}` | Paired | `<aside class="margin-note">` — a document comment, anchored to the paragraph before it |
| `{% marginnote "phrase" %}…{% endmarginnote %}` | Paired | Same, anchored to that phrase (highlighted) in the paragraph before it |
| `{% marginnote "phrase", "2026-03-01" %}…{% endmarginnote %}` | Paired | Same, with the card dated that day instead of the post's date (use `""` for the phrase to anchor the whole paragraph) |
| `{% pagebreak %}` | Non-paired | `<div class="page-break">`: a grey desk gap between pages. On its own line between paragraphs |

`callout` and `marginnote` call `md.render()` — Markdown is supported inside them.

**Quotes.** Inside a blockquote a single line break is kept as a line break (a `quote_breaks` core rule in `.eleventy.js`), so lyrics and verse written line by line in the CMS read the same on the page and in the feed; everywhere else markdown-it's `breaks: false` applies. A blank `>` line still starts a new paragraph.

**Anchor targets.** `main [id]` (`typography.css`) gives every id in the page `scroll-margin-top: calc(var(--chrome-h) + var(--space-6))`, so headings, footnotes and the footnote back-links (`#fnref1`, `#fnref-version`) all land below the sticky chrome.

**Paragraph indent.** In `typography.css`, a paragraph's first line is indented 1.5em only when the element right before it is another paragraph (`.doc-body p + p`), with the gap above tightened to match. After a heading, list, quote, code block, rule, figure or table it starts flush. A margin note the script has hidden counts as invisible (`p + .margin-note[hidden] + p`), so a note never breaks the indent on screen; in print the note shows inline and the next paragraph starts flush.

**Margin notes are document comments.** The shortcode renders a plain `<aside class="margin-note">` (author from `site.json`, date from the post unless a date is passed) and `src/js/comments.js` upgrades it:

- Place the shortcode directly *after* the paragraph it belongs to. The phrase is searched for only in the block right before the note (the block after it, if the note starts the post; curly and straight quotes match). If it isn't found there, the script warns in the console and anchors to the whole block. A whole-block anchor takes the nearest block no other note already holds, so two notes never share one. Notes with no anchor at all stay visible inline.
- **Wide screens** (room on the desk for `--comment-w` + `--comment-gap` right of the page): cards are built into a rail inside `<main>`, each level with its anchor, pushed down when they collide. Hover or focus links anchor and card with a connector line. `<main>` is `position: relative` for this. The rail is measured in the canvas's own coordinates, so it stays aligned under the zoom control.
- **Narrow screens**: one card at a time in a bottom sheet above the status bar (`.comment-sheet`, fixed, outside `.app-canvas`), with prev/next/close and Escape to close. Each note has a numbered badge — a real, focusable `<button>` — after its phrase, or inside its paragraph (on a row of its own before a list, table or rule). A phrase opens the sheet on click; a whole-paragraph note opens from its badge only, and links keep their own click. The mode is chosen on load, resize, zoom change and font change.
- **No flash of the inline note:** on pages that contain a note, `base.njk` puts `html.comments-pending` in the head, which hides `.margin-note` in CSS until the script has run (the script clears it first thing; a 3s timer does too if the script never loads).
- **Accessibility**: in the rail an anchor is focusable text with `aria-describedby` pointing at its card; in the sheet a phrase is a `role="button"` and every note has a real badge `<button>`. The badge is placed outside any link the phrase sits in, and its tap area is enlarged to ~32px.
- **No JS, print, feed readers**: the original `<aside>` shows inline as a boxed card. The script sets `hidden` on each aside it built a card for, numbers it (`data-c`) and moves it after the block it anchors to; `print.css` shows those again after their text, numbered to match the badge on the highlighted phrase, and hides the rail and sheet. Without JS the note stays where the author put it, after its block. In the feed, the `rssContent` filter rewrites each note as a `<blockquote>` with an inline-styled "Note on “phrase” · date" label, since feed readers drop the site CSS.
- Comment cards are built from the aside's HTML, so the aside must contain everything (header + body). Cards live outside `.doc-body`, so lists, inline code and links inside a note are styled by extra `.comment` selectors in `typography.css`. `base.njk` loads the script (with `defer`) only on pages whose rendered content contains a margin note. `--chrome-h` is a `calc()` and can't be read as a number from JS, so the sheet's scroll-into-view measures the sticky toolbar and ruler instead.

Section break: `---` in body renders as `* * *`. Page break: the `pagebreak` shortcode above.

**Template filters (`.eleventy.js`):**

| Filter | Input | Output |
|---|---|---|
| `collectionTags` | `tags` array | Tags with `ideas`, `notes`, `snaps` removed |
| `published` | posts array | Drops drafts (keeps them under `npm run dev`) — used by tag pages |
| `postSigil` | `tags` array | `→` ideas · `○` snaps · `·` notes (default) |
| `wordcount` | HTML string | Word count (strips tags first) |
| `readtime` | HTML string | Minutes to read at 200 wpm |
| `readableDate` | date | "30 Apr, 2026" in IST (September is "Sept") — every date a reader sees: lists, posts, version notes, chrome, margin notes, feed. `<time datetime>` stays ISO (`isoDate`) |
| `isoDate` | date | `YYYY-MM-DD` in IST |
| `atomDate` | date | UTC ISO 8601 for Atom feed |
| `rssContent` | HTML string | Feed-only rewrite: inline figure spacing, margin notes as labelled blockquotes |
| `ogImageSlug` / `ogImageExists` | URL / slug | og:image path and existence check (from `generate-og-images.js`) |
| `tagSlug` | tag | URL segment for a tag (lowercase, spaces → hyphens). Use it for every `/tags/` link and the tag page permalink; `generate-og-images.js` uses the same function |
| `limit` | array, n | First n items (feed) |
| `htmlDiff` | old HTML, new HTML | New HTML with `<ins>`/`<del>` marks (Post versions) |
| `sentence` | text | The text with a full stop added unless it ends in `.`, `!` or `?` (version notes) |
| `beforeSentence` | `[[label, verb, old]]` | "Before, the title was ~…~ and the tags ~…~." for a changes page (Post versions) |
| `withVersionFootnote` | body HTML, footnote `<li>` | Body with the version footnote added to its footnotes (Post versions) |
| `newerVersion` | snapshot, `collections.all` | The version after a snapshot: next snapshot or the live post |

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
| Text size dropdown | 10–18, sets `--doc-scale` (size ÷ 12), which rescales `--text-base`/`--text-sm`/`--text-xs` and the font-size of `.doc-page` only, so body, meta line, tags, captions and post nav all follow; persists `musings-size` |
| Outline dropdown | Lists `.doc-body` `h2`/`h3` (ids from markdown-it-anchor) and jumps via `location.hash`; reads "Normal text" and stays dead on pages without headings |
| ¶ toggle | Adds `html.show-marks` — pilcrow after each paragraph, list item and heading, "Page break" label on breaks; never printed; persists `musings-marks` |
| File menu | New (random post from `/posts.json`, built by `src/posts.njk` from `collections.feed` and fetched on click), Open… (`/`), Copy link (status bar confirms), Subscribe (`/feed.xml`), Print / PDF, Close tab. Shortcut hints are labels only (⌘ becomes Ctrl+ off Mac) |
| Help menu | Zoom in/out/actual size (same as the keys), About |
| Menu bar | Only File and Help open; once one is open, hovering another menu in the same bar switches (never into or out of the titlebar's version menu). Click outside or Escape closes |
| Status bar | "Page x of y" counts `.page-break`s above mid-screen on scroll; words · read time from `data-words`/`data-readtime` on posts (same filters as the meta line); transient messages |
| Stoplight dot | `window.close()` — browser-blocked for normal tabs, silent no-op |
| Titlebar dimming | `setActive` on `blur`, `focus`, `visibilitychange` — all three needed |
| Version history | On revised posts, a menu at the titlebar's right (`.app-titlebar__versions`), the only place the history is listed; the edit note footnote's "Earlier versions" link (`[data-open-versions]`) opens the titlebar menu instead of following its href. Hovering between menus only moves along the menu bar |

`initDropdown` returns `{ setValue }` — used by zoom to sync label with keyboard shortcuts.

Session persistence: `sessionStorage` only, and only within one visit. On load, a fresh arrival (`navigation.type` is `navigate` and the referrer is not this site: typed URL, bookmark, external link) clears `musings-font`, `musings-size`, `musings-zoom` and `musings-marks`. Moving between pages, reload and back/forward keep them; a new tab starts fresh as before. All reads and writes go through a small `store` wrapper that swallows the error `sessionStorage` throws when the browser blocks site data, so the controls still work and simply don't persist.

**Other scripts.** Margin-note comments live in `src/js/comments.js`, not in this block: `base.njk` loads it (`defer`) and adds a small head script that sets `html.comments-pending`, only on pages whose content contains a margin note. See Shortcodes → Margin notes. The comment rail listens for the zoom above by watching `.app-canvas`'s `style` attribute, so the zoom code needs no hook for it.

---

## Infrastructure

### Deployment

`deploy.yml` triggers on push to `main` and runs as a single `build-and-deploy` job on Node 24: `npm ci → npm run build` → commits any files the prebuild scripts generated (`[skip ci]`) → deploys `_site/` to GitHub Pages. Build and deploy share one job so a publish doesn't wait for a second runner to start. Node 24 is preinstalled on `ubuntu-latest`; a version the runner lacks, such as Node 20, gets downloaded on every run, costing 5–11s. Keep the `actions/*` steps on their Node 24 majors (checkout v5, setup-node v5, upload-pages-artifact v5, deploy-pages v5) or every run logs a Node 20 deprecation warning. A typical publish takes about 30–40s from push to live.

`npm run build` runs `prebuild` automatically, which chains five scripts:
1. `backfill-dates.js` — fills git creation time into date-only front matter
2. `convert-webp.js` — converts JPEG/PNG/HEIC in `src/images/uploads/` to WebP (quality 82, auto-rotated), names it `{date}-{slug}-{hash}.webp` after the post that uses it (hash of the WebP's own bytes, so the same image uploaded twice shares one file), deletes the original and rewrites the references. Existing WebP files are renamed when their post's slug changes. References are rewritten in posts and in `src/versions/` snapshots. HEIC is decoded by `heic-decode` (libheif in WebAssembly), since sharp's prebuilt binaries can't read it; a large iPhone photo takes a few seconds. A file that can't be converted stops the build with its name.
3. `backfill-permalink.js` — writes `permalink` to front matter for any post with a `slug` field
4. `snapshot-versions.js` — saves earlier versions of revised posts to `src/versions/` (see Post versions). Must run after step 3, since snapshot URLs follow the post's `permalink`.
5. `generate-og-images.js` — renders each post's `og:image` (see below). Must run after step 3, since it needs the final `permalink`.

`src/CNAME` is passthrough-copied to `_site/CNAME` — required for the custom domain to survive deploys.

### Passthrough copies

Directories: `src/css/`, `src/js/`, `src/images/`, `src/admin/`
Files: `src/favicon.svg`, `src/favicon.ico`, `src/apple-touch-icon.png`, `src/favicon-512.png`, `src/manifest.json`, `src/robots.txt`, `src/CNAME`

Any new asset type needs a corresponding `addPassthroughCopy` in `.eleventy.js`.

`src/images` is a symlink to a top-level `images/` directory, not a real nested folder. Node resolves it transparently for local builds and scripts, so `src/images/uploads/` is a valid filesystem path — but tools that read the repo through GitHub's API (Sveltia CMS) see only `images/uploads/` as a real git path; `src/images/uploads/` 404s there.

### Search engines and crawlers

The site asks not to be indexed, on purpose: `src/robots.txt` disallows every crawler (with explicit entries for AI crawlers), and `base.njk` sets `<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">` on every page. Don't remove either without asking.

### Sveltia CMS

Access: `https://musings.thedataareclean.com/admin/` — sign in with GitHub.

- Cloudflare Worker at `https://sveltia-cms-auth.thedataareclean.workers.dev` proxies the GitHub OAuth flow
- GitHub OAuth App callback URL must point to the Worker
- Every CMS save commits a Markdown file to `main`, which triggers `deploy.yml`
- `media_folder` in `config.yml` is `images/uploads` (the real path, not the `src/images` symlink — see above); served from `/images/uploads/`
- `src/admin/index.html` pins the tab title to "Musings CMS": Sveltia rewrites the title as it loads (CMS name → site URL), so a `MutationObserver` on `<head>` puts the `<title>` text back. It deliberately does not override `document.title`.

### Feed

`/feed.xml` — combined Atom feed (ideas + notes + snaps), 15 most recent posts. Uses `atomDate` (UTC ISO 8601). `feed.njk` must have `layout: false`.

Each entry's `<title>` is the bare post title; the blog name comes from the feed's own `<title>`. Entry content is: description (if present) → rule → edit line (revised posts) → body (a revised post's `[*]` footnote joins its footnotes; see Post versions) → tags → rule → a fixed sign-off ("Congratulations! You have reached the end. You should read more at {site} and subscribe to my RSS.", both linked from `site.url`). Styles are inline because feed readers ignore site CSS.

Post pages' `og:title` is likewise the bare title — the blog name lives in `og:site_name`. Only the browser-tab `<title>` keeps the `| {site.title}` suffix.

### OG images

`scripts/generate-og-images.js` renders an `og:image` at build time for every page type — a 1200×630 screenshot of the site's own doc-chrome (titlebar showing the site domain, and "Edited [date] ▾" on a revised post; title, description, tags), not a generic redesigned social card. It's a real render (Satori → SVG → `@resvg/resvg-js` → PNG), not a screenshot tool — no headless browser dependency.

Covers: every post, the home page, the three section indices (`/ideas/`, `/notes/`, `/snaps/` — with their real `postSigil`), every tag page (`/tags/{tag}/` — title highlighted like the real page's `<mark>{{ tag }}</mark>`, description a live-computed `"N posts tagged as {tag}."`), About, the standalone `/reference/` and `/style/` pages, and 404. Deliberately not covered: the feed (XML, no meta tags). 404's permalink is the one exception to the URL-mirrors-path rule below — its `page.url` is `/404.html`, so `ogImageSlug` strips a trailing `.html` too, or it'd collide with the `.png` this script appends.

- Output: `images/og/<slug>.png`, where `<slug>` comes from `ogImageSlug(page.url)` — mirrors the page's own URL hierarchy rather than flattening it (`/ideas/2026-08-15-grandmother/` → `ideas/2026-08-15-grandmother`, `/tags/family/` → `tags/family`, `/` → `home`), so posts/tags land in their own subfolder (`images/og/ideas/`, `images/og/tags/`, …) instead of one flat directory. A section index (`/ideas/`) sits as `images/og/ideas.png`, right beside its own `images/og/ideas/` subfolder of posts — a file and a directory of the same name coexist fine, no collision. `images/og/` is gitignored — regenerated every build, same as `_site/`.
- `ogImageSlug` and `ogImageExists` are exported from `generate-og-images.js` and required directly by `.eleventy.js` (registered as filters) — `base.njk` gates its `<meta property="og:image">` block on `ogImageExists`, not on page type (`ogType`), so any page this script covers gets the tags automatically and a page it doesn't cover never emits a broken reference. `og:type` itself (`article` vs `website`) is still driven by `ogType` as before — the two are deliberately decoupled.
- Skips regenerating a page's image if its PNG is already newer than that page's one source file (post `.md`, `index.njk`, `about.md`, `reference.md`, `style.njk`). Tag pages have no single source file (their content depends on every post carrying that tag) and always regenerate. The cache doesn't notice changes to the generator, fonts or tokens: after one, delete `images/og/` locally (CI always starts without it).
- Descriptions are pulled from each page's own real content, not invented copy: per-post `description`, each section index's own on-page blurb (`Things felt deeply.` etc., front matter), About's own blurb, and tag pages' live post count.
- Font: reads `--font-doc` from `tokens.css` at generation time, so the card can't silently drift from whichever font the site actually defaults to. Uses the real Arial/Georgia `.ttf` when one is installed locally (pixel-perfect); falls back to the committed OFL substitutes, Arimo/Gelasio, when it isn't (always the case in CI). Satori has no OS font fallback, so it needs a real file; Arial and Georgia have no redistributable one. `resolveFont()` reads a local system copy if present (macOS: `/System/Library/Fonts/Supplemental/`) only to embed glyph outlines at render time; nothing from there is committed. Gelasio is Georgia's metric match; Tinos is a Times New Roman clone and looks wrong here. See `CLAUDE.md`'s trap entry.
- Chrome (the titlebar) is drawn at its real fixed pixel size, never scaled — content (title/description/tags) is scaled uniformly by a zoom factor matching one of the site's own zoom-dropdown rungs (200%). This mirrors the real site: chrome lives outside `.app-canvas` and never zooms with content.

---

## Dependencies

All `devDependencies` — build-time only, nothing shipped to the browser.

| Package | Purpose |
|---|---|
| `@11ty/eleventy` | SSG |
| `@resvg/resvg-js` | Rasterizes the SVG `satori` produces into the final og:image PNG |
| `diff` | Word-level diff for post-version changes pages (`htmlDiff` filter) |
| `gray-matter` | Front-matter parsing in `generate-og-images.js`, `snapshot-versions.js` and `_data/versions.js` |
| `heic-decode` | Decodes HEIC uploads for `convert-webp.js` (sharp can't) |
| `markdown-it` | Markdown parser (configured in `.eleventy.js`) |
| `markdown-it-anchor` | Heading anchors |
| `markdown-it-attrs` | Custom attributes |
| `markdown-it-footnote` | Footnotes |
| `satori` | Lays out each post's og:image (title/description/tags) as SVG |
| `sharp` | Image conversion — JPEG/PNG (and decoded HEIC) → WebP in `convert-webp.js` |
