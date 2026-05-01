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
| Check vulnerabilities | `npm audit` |
| List available updates | `npm outdated` |

---

## Release

```sh
# 1. Pull any remote changes
git pull

# 2. Bump version in package.json (patch / minor / major)
npm version patch --no-git-tag-version

# 3. Move UNRELEASED entries in CHANGELOG.md to a dated version block

# 4. Commit and tag
git add package.json CHANGELOG.md
git commit -m "Chore: bump version to x.y.z"
git tag -a vx.y.z -m "Brief description"

# 5. Push commits and tag
git push && git push origin vx.y.z
```

---

## Notes

- Dev server runs at **http://localhost:8081** with live reload
- Build output → `_site/` (not committed)
- `npm run clean` deletes `_site/` only — safe to run before a fresh build
- `npm ci` is used in CI (`deploy.yml`) — prefer `npm install` locally
- `npm run build` automatically runs `prebuild` first (backfill + webp) — no need to call them separately in CI
