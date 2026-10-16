// Version history per post, keyed by the post's inputPath ("./src/ideas/x.md").
// Snapshots of earlier versions are written to src/versions/ by
// scripts/snapshot-versions.js; the latest version is the post itself.
//
// Each entry: { latest, all, newestFirst, byVersion } where all is
// oldest-first (all[0] is the original), and every version
// is { version, date, note, url, changesUrl, original, nextVersion } —
// changesUrl is the page showing what changed in that version, so the first
// has none; nextVersion is the next version that exists.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "../..");
const VERSIONS_DIR = path.join(ROOT, "src/versions");

module.exports = function () {
  const out = {};
  if (!fs.existsSync(VERSIONS_DIR)) return out;

  for (const section of fs.readdirSync(VERSIONS_DIR)) {
    const sectionDir = path.join(VERSIONS_DIR, section);
    if (!fs.statSync(sectionDir).isDirectory()) continue;
    for (const stem of fs.readdirSync(sectionDir)) {
      const livePath = path.join(ROOT, "src", section, `${stem}.md`);
      if (!fs.existsSync(livePath)) continue;
      const live = matter(fs.readFileSync(livePath, "utf8")).data;
      const url = live.permalink || `/${section}/${stem}/`;
      const latest = Number(live.version) || 1;

      const all = fs
        .readdirSync(path.join(sectionDir, stem))
        .filter((f) => /^v\d+\.md$/.test(f))
        .map((f) => matter(fs.readFileSync(path.join(sectionDir, stem, f), "utf8")).data)
        .filter((d) => d.version < latest)
        .map((d) => ({ version: d.version, date: d.versionDate, note: d.versionNote || "", url: d.permalink }));
      if (!all.length) continue;

      all.push({ version: latest, date: live.versionDate || live.date, note: live.versionNote || "", url, latest: true });
      all.sort((a, b) => a.version - b.version);
      // Versions can skip a number (bumped 1 → 3), so byVersion["2"] looks a
      // version up by number rather than by position.
      const byVersion = {};
      all.forEach((v, i) => {
        v.original = i === 0;
        v.nextVersion = all[i + 1] || null;
        v.changesUrl = i > 0 ? `${all[i - 1].url}changes/` : null;
        byVersion[v.version] = v;
      });

      out[`./src/${section}/${stem}.md`] = { latest: all[all.length - 1], all, newestFirst: all.slice().reverse(), byVersion };
    }
  }
  return out;
};
