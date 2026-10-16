// Version history per post, keyed by the post's inputPath ("./src/ideas/x.md").
// Snapshots of earlier versions are written to src/versions/ by
// scripts/snapshot-versions.js; the latest version is the post itself.
//
// Each entry: { latest, all, newestFirst } where all is oldest-first and every version is
// { version, date, note, url, changesUrl } — changesUrl is the page showing
// what changed in that version, so version 1 has none.
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
      all.forEach((v) => {
        const prev = all.find((p) => p.version === v.version - 1);
        v.changesUrl = prev ? `${prev.url}changes/` : null;
      });

      out[`./src/${section}/${stem}.md`] = { latest: all[all.length - 1], all, newestFirst: all.slice().reverse() };
    }
  }
  return out;
};
