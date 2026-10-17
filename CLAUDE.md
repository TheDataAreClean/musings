# CLAUDE.md — Musings

Operating manual for Claude. Architecture lives in [APP.md](APP.md). Commands live in [COMMANDS.md](COMMANDS.md).

---

## Before you push

- Run `npm run build` on a clean tree — `prebuild` can rewrite content files (dates, permalinks, image paths), so review `git status` after — must exit zero errors, zero warnings
- Check browser console — no JS errors, no 404s
- Test the golden path: home page loads → post opens → font/zoom dropdowns work → anchor links land below chrome

---

## Common traps

**`{#` is a Nunjucks comment delimiter**
Never write `{#` anywhere in a `.md` file — not in prose, not in code blocks, not in backticks. The parser silently consumes everything from `{#` to the next `#}`, truncating the page with no build error. Use `{ #id }` (with a space) for `markdown-it-attrs` ID attributes.

**`feed.njk` must have `layout: false`**
Without it, XML output gets wrapped in the base HTML layout. Always confirm the front matter.

**Page breaks are the `{% pagebreak %}` shortcode**
It renders `<div class="page-break" role="separator">`; write it on its own line between paragraphs. The `hr` rules in `typography.css` stay scoped to `hr:not(.page-break)` so a hand-written `<hr class="page-break">` still works, but don't use that in content.

**`--chrome-h` must equal the sum of its parts**
`--chrome-h` = `--titlebar-h + --menubar-h + --toolbar-h + --ruler-h` = 34 + 26 + 32 + 22 = **114px** (92px on mobile, where `--ruler-h` is 0). `scroll-margin-top` on headings depends on this. It does not auto-compute — update it manually when any chrome bar height changes.

**Page-break bleed breaks with a second grid column**
`.page-break` uses `width: calc(100% + var(--page-pad-h) * 2)` — only works when `.doc-layout` has `grid-template-columns: 1fr`.

**CSS `zoom` applies to `.app-canvas` only**
Sticky chrome (titlebar, menubar, toolbar, ruler, statusbar) lives outside `.app-canvas`. Moving chrome inside breaks sticky positioning.

**Session persistence is `sessionStorage`, not `localStorage`**
Font, text size, zoom and ¶ marks reset on a new tab or a fresh arrival by design. Do not upgrade to `localStorage` unless explicitly asked.

**CSS and JS URLs carry a per-build `?v=` stamp**
`base.njk` links `/css/main.css?v={{ assetVersion }}` and `/js/comments.js?v=…`, and an `eleventy.after` hook in `.eleventy.js` stamps the `@import`s inside `_site/css/main.css`. GitHub Pages caches assets for 10 minutes, so without it a deploy can pair new HTML with an old script. Any new `<script src>` or stylesheet link needs the same `?v={{ assetVersion }}`.

**Passthrough copies must be registered**
Any new asset directory or file needs a corresponding `addPassthroughCopy` in `.eleventy.js`. Missing entries silently 404 in production.

**The CI "Commit generated content changes" step must stage the whole working tree**
Prebuild scripts write through the `src/images` symlink, so their output lands at `images/...`, outside `src/`. Keep `git status --porcelain` / `git add -A` unscoped in `deploy.yml`: a step scoped to `-- src/` once left a converted upload unstaged, and the auto-commit and deploy failed silently.

**New posts default to `draft: false` in Sveltia CMS**
There is no separate draft pipeline — `draft` only hides a post from listings, tag pages and the feed; the URL still resolves once the file is on `main` (see `APP.md` → Drafts). Any new listing must drop drafts too (`filterDrafts` or the `published` filter): Eleventy's own `collections[tag]` includes them. The `draft` field in `src/admin/config.yml` defaults to `false`, so a new post publishes immediately on save unless you tick Draft first.

**Tag URLs always go through `tagSlug`**
Every `/tags/` link, the tag page permalink and the og:image path use the `tagSlug` filter (shared with `generate-og-images.js`). Building a tag URL any other way breaks for a tag with a capital letter or a space.

**Post versions: snapshots live in `src/versions/` and must never be hand-edited or regenerated**
Once `snapshot-versions.js` writes `src/versions/{section}/{stem}/v{n}.md`, that file *is* version n; it is only ever created, never rewritten (apart from its `permalink`, and image paths `convert-webp.js` renames). Snapshots carry `postTags`, not `tags`, so they stay out of tag collections, listings and the feed; keep it that way. Renaming a post file orphans its snapshots (the folder is keyed by file stem), so move `src/versions/{section}/{stem}/` with it. See `APP.md` → Post versions.

**The edit note is built once, for the page and the feed**
`src/_includes/version-notes.njk` holds the edit note's macros (the `[*]` mark, the latest version's line and footnote, the note-or-"Edited on" fallback); `doc.njk` and `feed.njk` both import it, so change wording there, not in either template. The feed passes `site.url` as `base` for absolute links and gets an inline `*` marker, since feed readers drop the site CSS. `withVersionFootnote` builds its markup from markdown-it-footnote's own renderer rules; don't hard-code `<section class="footnotes">` strings. The `#fn-version`/`#fnref-version` ids must stay unique: a post's own footnotes are numbered, so they can't clash.

**`src/images` is a symlink — Sveltia CMS config must use the real path**
See `APP.md`'s Passthrough copies section for why `media_folder` in `src/admin/config.yml` must point at `images/uploads`, never `src/images/uploads`.

**og:image generation never *ships* Arial or Georgia**
Satori needs a real font file and has no fallback. Never commit an Arial or Georgia `.ttf` (proprietary); `scripts/og-fonts/` carries the OFL substitutes Arimo and Gelasio (not Tinos, a Times clone). A local system copy may be read at render time, never committed. Draw any glyph the font lacks (`→`, `▾`) as inline SVG. Background in `APP.md` → OG images.

**The comment rail lives in `<main>`, never inside `.doc-page`**
`.doc-page` has `overflow-x: clip`, so anything positioned past the page edge is cut off. `src/js/comments.js` appends the rail to `<main>` (`position: relative` on `.app-canvas > main` in `doc-chrome.css`) at `left: calc(100% + var(--comment-gap))`. It also works in the canvas's own unzoomed coordinates (it divides by `canvas.style.zoom`), which is why it stays aligned under the zoom dropdown. Moving the rail inside the page, or dropping `position: relative` on `main`, clips or misplaces every comment.

**`eleventyComputed` strings autoescape**
A computed value like `title: "{{ x.data.title }}"` is rendered by Nunjucks, which escapes it, and the template escapes it again: `&` shows as `&amp;`. Add `| safe` inside computed strings (see `changes.njk`, `tags/index.njk`).

**Storage goes through `store` in `base.njk`**
`sessionStorage` throws when the browser blocks site data, and one uncaught throw stops every chrome control. Use `store.get` / `store.set`, never `sessionStorage` directly.

**`--chrome-h` can't be read from JS**
It's a `calc()` of other custom properties, so `getComputedStyle(...).getPropertyValue('--chrome-h')` returns the literal string `calc(34px + …)` and `parseFloat` gives `NaN` (which `|| 0` then hides as zero). `comments.js` measures the bottom of `.app-toolbar` and `.app-ruler` instead. Any new script that needs the sticky-chrome offset should do the same.

**`@page` margin boxes can't read custom properties**
The print footer in `print.css` sets its font and colour on `@page` with literal values (`8pt Arial…`, `dimgray` for `--color-muted`) because margin boxes don't inherit `:root` variables. The three empty `@top-*` boxes are load-bearing: they claim the top margin so Chromium doesn't print its own date and title there when "Headers and footers" is ticked. Safari and Firefox ignore margin boxes and print their own.

**Margin notes go *after* their paragraph, and must not break the indent**
Write `{% marginnote %}` directly after the paragraph it belongs to; `comments.js` looks for the phrase in the block before the note. The hidden `<aside>` stays between paragraphs, so the indent rule in `typography.css` has to see past it (`p + .margin-note[hidden] + p`). Any new element hidden between paragraphs needs the same treatment.

**A margin note must stay readable without the script**
The shortcode renders a plain inline `<aside>`; the script only *hides* the ones it built a card for, via the `hidden` attribute, so a note that couldn't be anchored stays visible. `base.njk` also sets `html.comments-pending` in the head to stop a flash before the script runs — a 3s timer clears it if the script never loads. `print.css` re-shows hidden notes with `.margin-note[hidden] { display: block }`. If you change any of these, keep the guarantee: no JS, print and feed readers all show every note inline.

---

## Review triggers

When adding a **new CSS custom property**: add it to the token table in [APP.md](APP.md). Never hardcode a value that has a token.

When adding a **new shortcode**: document it in [APP.md](APP.md) under Shortcodes.

When adding a **new npm script**: add it to [COMMANDS.md](COMMANDS.md).

When changing **permalink or slug logic**: update [APP.md](APP.md) — these are URL-stability decisions.

When shipping **any change a reader can see** (feature or fix): add an entry to [CHANGELOG.md](CHANGELOG.md) under UNRELEASED.

When changing **any chrome element height**: recalculate `--chrome-h` and update the token.

---

## Constraints and guardrails

- `--font-ui` is always Arial — do not change
- `--font-doc` is the only font the toolbar's font dropdown changes
- All chrome is `aria-hidden="true"`
- `doc-chrome.css` is the only file permitted to hardcode hex colours
- The site is deliberately unindexed (`robots.txt`, `noindex` meta) — don't change it unless asked
- No Nunjucks tags (`{% %}`) in content `.md` files except the shortcodes (`callout`, `marginnote`, `pagebreak`)
- No `{#` anywhere in `.md` files
- `atomDate` uses UTC ISO 8601 — do not apply IST to feed timestamps
- `site.url` in `site.json` must have no trailing slash

---

## Shipping a release

Before pushing or cutting a release, use the `release` skill (`.claude/skills/release/SKILL.md`) — pre-push checklist, version-bump policy, tagging, and commit convention.
