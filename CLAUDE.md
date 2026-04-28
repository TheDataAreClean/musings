# CLAUDE.md — Musings

Operating manual for Claude. Architecture lives in [APP.md](APP.md). Commands live in [COMMANDS.md](COMMANDS.md).

---

## Quick facts

- **Stack:** Eleventy 3.x · Nunjucks · Markdown · vanilla CSS · vanilla JS
- **Author:** Arpit
- **Local dev:** `npm run dev` → http://localhost:8081
- **Entry point:** `.eleventy.js` — collections, filters, shortcodes; `src/` — all content and assets
- **Output:** `_site/` (not committed) → deployed to GitHub Pages via `deploy.yml`

---

## Before you change code

- Run `npm run build` — must exit zero errors, zero warnings
- Check browser console — no JS errors, no 404s
- Test the golden path: home page loads → post opens → font/zoom dropdowns work → anchor links land below chrome

---

## Common traps

**`{#` is a Nunjucks comment delimiter**
Never write `{#` anywhere in a `.md` file — not in prose, not in code blocks, not in backticks. The parser silently consumes everything from `{#` to the next `#}`, truncating the page with no build error. Use `{ #id }` (with a space) for `markdown-it-attrs` ID attributes.

**`feed.njk` must have `layout: false`**
Without it, XML output gets wrapped in the base HTML layout. Always confirm the front matter.

**`.doc-body hr:not(.page-break)` — the `:not` is load-bearing**
`.doc-body hr` (0-1-1) beats `.page-break` (0-1-0). All `hr` rules in `typography.css` are scoped to `hr:not(.page-break)`. Removing it makes page breaks inherit prose `hr` styles.

**`--chrome-h` must equal the sum of its parts**
`--chrome-h` = `--titlebar-h + --menubar-h + --toolbar-h + --ruler-h` = 34 + 26 + 32 + 22 = **114px**. `scroll-margin-top` on headings depends on this. It does not auto-compute — update it manually when any chrome bar height changes.

**Page-break bleed breaks with a second grid column**
`.page-break` uses `width: calc(100% + var(--page-pad-h) * 2)` — only works when `.doc-layout` has `grid-template-columns: 1fr`.

**CSS `zoom` applies to `.app-canvas` only**
Sticky chrome (titlebar, menubar, toolbar, ruler, statusbar) lives outside `.app-canvas`. Moving chrome inside breaks sticky positioning.

**Session persistence is `sessionStorage`, not `localStorage`**
Font and zoom reset on a new tab by design. Do not upgrade to `localStorage` unless explicitly asked.

**Passthrough copies must be registered**
Any new asset directory or file needs a corresponding `addPassthroughCopy` in `.eleventy.js`. Missing entries silently 404 in production.

---

## Review triggers

When adding a **new CSS custom property**: add it to the token table in [APP.md](APP.md). Never hardcode a value that has a token.

When adding a **new shortcode**: document it in [APP.md](APP.md) under Shortcodes.

When adding a **new npm script**: add it to [COMMANDS.md](COMMANDS.md).

When changing **permalink or slug logic**: update [APP.md](APP.md) — these are URL-stability decisions.

When shipping a **new feature**: add an entry to [CHANGELOG.md](CHANGELOG.md) under UNRELEASED.

When changing **any chrome element height**: recalculate `--chrome-h` and update the token.

---

## Brief file map

Key files only. Full map: [README.md](README.md). Architecture: [APP.md](APP.md).

```
.eleventy.js                        Eleventy config — collections, filters, shortcodes
src/_data/site.json                 Global site config (title, shortTitle, url, description)
src/_includes/layouts/base.njk      HTML shell — chrome + inline <script> — affects every page
src/_includes/layouts/doc.njk       Single post layout
src/_includes/layouts/home.njk      Home page / feed list layout
src/feed.njk                        Atom feed → _site/feed.xml (must have layout: false)
src/css/tokens.css                  All CSS custom properties
src/css/main.css                    @import manifest — load order is meaningful
src/admin/config.yml                Sveltia CMS collection definitions
```

---

## Constraints and guardrails

- `_site/` is never committed
- `--font-ui` is always Arial — do not change
- `--font-doc` is the only font the JS easter egg touches
- All chrome is `aria-hidden="true"`
- `doc-chrome.css` is the only file permitted to hardcode hex colours
- No Nunjucks tags (`{% %}`) in content `.md` files except the paired shortcodes (`callout`, `marginnote`)
- No `{#` anywhere in `.md` files
- `atomDate` uses UTC ISO 8601 — do not apply IST to feed timestamps
- `site.url` in `site.json` must have no trailing slash

---

## Pre-push checklist

### Build
- [ ] `npm run build` — zero errors, zero warnings
- [ ] `_site/` not committed
- [ ] Browser console clean — no JS errors, no 404s

### Content
- [ ] All new posts have `title`, `date`, correct layout (via directory data)
- [ ] Dates in filenames match `date:` in front matter
- [ ] No `{#` in any `.md` file
- [ ] Post renders fully — no truncation (scroll to bottom in dev)
- [ ] All links resolve; images exist in `src/images/`

### Behaviour
- [ ] Font and zoom dropdowns work; persist across page navigation; reset on fresh tab
- [ ] Stoplight dims on tab switch, restores on return
- [ ] Anchor links land below sticky chrome

### Infrastructure
- [ ] `site.url` in `site.json` — no trailing slash
- [ ] `feed.njk` has `layout: false`
- [ ] `_site/feed.xml` is valid XML — open in browser
- [ ] `_site/favicon.ico`, `_site/favicon.svg`, `_site/apple-touch-icon.png`, `_site/manifest.json` present

---

## Release workflow

```sh
git tag -a v3.1.0 -m "Brief description"
git push origin v3.1.0
```

| Part | When to increment |
|---|---|
| MAJOR | Complete visual redesign or change in site concept |
| MINOR | New feature, new section, new page type |
| PATCH | Bug fix, design tweak, docs update |

Move UNRELEASED entries in [CHANGELOG.md](CHANGELOG.md) to a dated version block on each release.
Update `version` in `package.json` with `npm version <tag> --no-git-tag-version`.

**Commit convention:** `{Type}: {description}` — types: `Add` `Fix` `Update` `Redesign` `Refactor` `Docs` `Chore`
