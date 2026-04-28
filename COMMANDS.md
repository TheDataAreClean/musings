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
| Check vulnerabilities | `npm audit` |
| List available updates | `npm outdated` |

---

## Notes

- Dev server runs at **http://localhost:8081** with live reload
- Build output → `_site/` (not committed)
- `npm run clean` deletes `_site/` only — safe to run before a fresh build
- `npm ci` is used in CI (`deploy.yml`) — prefer `npm install` locally
