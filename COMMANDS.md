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
| Run the unit tests | `npm test` |
| Convert HEIC uploads to WebP | `npm run heic` |
| Generate every og:image | `npm run ogimages` |
| Save earlier versions of revised posts | `npm run versions` |
| Check the built site: feed, links, drafts, old URLs (runs after every build) | `npm run check:site` |
| …and record today's URLs as the ones that must keep working | `node scripts/check-site.js --update-urls` |
| Check how posts read in reader apps (runs after every build) | `npm run check:readers` |
| …and list the expected gaps too | `npm run check:readers -- --verbose` |
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
- Node 24 (`.nvmrc`; `nvm use` picks it up)
- `npm ci` is used in CI (`deploy.yml`, `check.yml`); prefer `npm install` locally
- `npm run build` runs `prebuild` first (convert-heic + snapshot-versions + generate-og-images) and `postbuild` last (`check-site.js`, then `check-readers.js`); either check failing fails the build, and so the deploy. See `APP.md` → Deployment and Reader views
- The first build resizes every image (about 30s); later ones reuse `_site/img/`. `npm run clean` clears that too
