# CLAUDE.md — Musings

Operating manual for Claude. Architecture lives in [APP.md](APP.md). Commands live in [COMMANDS.md](COMMANDS.md).

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

## Constraints and guardrails

- `--font-ui` is always Arial — do not change
- `--font-doc` is the only font the JS easter egg touches
- All chrome is `aria-hidden="true"`
- `doc-chrome.css` is the only file permitted to hardcode hex colours
- No Nunjucks tags (`{% %}`) in content `.md` files except the paired shortcodes (`callout`, `marginnote`)
- No `{#` anywhere in `.md` files
- `atomDate` uses UTC ISO 8601 — do not apply IST to feed timestamps
- `site.url` in `site.json` must have no trailing slash

---

## Shipping a release

Before pushing or cutting a release, use the `release` skill (`.claude/skills/release/SKILL.md`) — pre-push checklist, version-bump policy, tagging, and commit convention.
