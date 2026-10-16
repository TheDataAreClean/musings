---
name: release
description: Pre-push checklist (build/content/behaviour/infrastructure) and release workflow (version bump, tagging, changelog) for the Musings blog. Use before pushing or shipping a release.
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
- [ ] Font, size and zoom dropdowns work; persist across page navigation; reset on fresh tab
- [ ] Margin notes: cards on desktop, bottom sheet on mobile, inline asides with JS off and in print preview
- [ ] Stoplight dims on tab switch, restores on return
- [ ] Anchor links land below sticky chrome
- [ ] Revised posts: the edit note line and `[*]` footnote show on the latest, an earlier version and a changes page; File → Version history lists the versions

### Infrastructure
- [ ] `site.url` in `site.json` — no trailing slash
- [ ] `feed.njk` has `layout: false`
- [ ] `_site/feed.xml` is valid XML — open in browser
- [ ] No draft appears on the home page, section lists, any `/tags/` page or the feed
- [ ] `/reference/` and `/style/` build; `images/og/` has a PNG for new posts
- [ ] `_site/favicon.ico`, `_site/favicon.svg`, `_site/apple-touch-icon.png`, `_site/manifest.json` present

## Release workflow

Bump `package.json` and move the CHANGELOG entries inside the change's own PR. After it merges, cube tags `main` from their Mac:

```sh
git tag -a v3.1.0 -m "Brief description"
git push origin v3.1.0
```

| Part | When to increment |
|---|---|
| MAJOR | Complete visual redesign, change in site concept, or a change in how posts work |
| MINOR | New feature, new section, new page type |
| PATCH | Bug fix, design tweak, content or docs update |

Move UNRELEASED entries in [CHANGELOG.md](../../../CHANGELOG.md) to a dated version block on each release.
Update `version` in `package.json` with `npm version <tag> --no-git-tag-version`.

**Commit convention:** `{Type}: {description}` — types: `Add` `Fix` `Update` `Redesign` `Refactor` `Docs` `Chore`
