# COMMANDS.md — Musings

All runnable commands. Source: `package.json`.

---

## Tasks

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Clean build output | `npm run clean` |
| Convert uploads to WebP | `npm run webp` |
| Backfill post datetimes from git | `npm run backfill` |
| Backfill slug → permalink in front matter | `node scripts/backfill-permalink.js` |
| Generate per-post og:image files | `npm run ogimages` |
| Regenerate every og:image (after changing the generator, fonts or tokens) | `rm -rf images/og && npm run ogimages` |
| Save earlier versions of revised posts | `npm run versions` |
| Check vulnerabilities | `npm audit` |
| List available updates | `npm outdated` |

---

## Release

The version bump ships inside the change's own PR; the tag comes after it merges.

```sh
# In the PR branch: bump package.json (patch / minor / major)
npm version patch --no-git-tag-version
# …and move UNRELEASED entries in CHANGELOG.md to a dated version block

# After the PR merges, on cube's Mac:
git checkout main && git pull
git tag -a vX.Y.Z -m "Brief description"
git push origin vX.Y.Z
```

Full checklist and bump policy: [release skill](.claude/skills/release/SKILL.md).

---

## Notes

- Dev server runs at **http://localhost:8081** with live reload
- Build output → `_site/` (not committed)
- `npm run clean` deletes `_site/` only — safe to run before a fresh build
- `npm ci` is used in CI (`deploy.yml`) — prefer `npm install` locally
- `npm run build` automatically runs `prebuild` first (backfill-dates + convert-webp + backfill-permalink + snapshot-versions + generate-og-images) — no need to call them separately in CI
