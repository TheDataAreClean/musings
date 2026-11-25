// Move posts between sections (ideas, notes, snaps), driven by the CMS.
//
// Sveltia can't move an entry to another collection, so every collection has an
// optional `moveTo` field. Pick a section there and save; the next build (this
// runs first in `prebuild`, and before each dev-server rebuild) does the move:
//   - the post file goes to src/{section}/ under the same file name
//   - its snapshots folder src/versions/{section}/{stem}/ goes with it, and each
//     snapshot's `versionOf` is pointed at the new path
//   - the `moveTo` line is removed
// The post's URL follows from its new folder (scripts/content.js), and the old
// URL stops working: no redirect is written. The deploy's commit step saves the
// result to main, as it does for version snapshots.
// A blank `moveTo`, or one naming the post's own section, is left alone, so a
// normal save never makes the build write anything.
const fs = require("fs");
const path = require("path");

const { ROOT, SECTIONS, postFiles, snapshotFiles } = require("./content.js");

const LINE = /^moveTo:[ \t]*(.*?)[ \t]*\r?$/m;

// The section a post asks to move to, or "" when it doesn't ask for a move.
function requestedSection(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const m = fm && fm[1].match(LINE);
  return m ? m[1].replace(/^["']|["']$/g, "") : "";
}

// The post's text with its moveTo line gone.
function withoutMoveTo(text) {
  return text.replace(/^(---\r?\n[\s\S]*?)^moveTo:.*\r?\n/m, "$1");
}

function movePosts() {
  const moved = [];
  for (const { section, file, path: from } of postFiles()) {
    const text = fs.readFileSync(from, "utf8");
    const to = requestedSection(text);
    if (!to || to === section) continue;
    if (!SECTIONS.includes(to)) {
      console.warn(`move-posts: ${section}/${file}: "${to}" is not a section (${SECTIONS.join(", ")}); left in place`);
      continue;
    }
    const dest = path.join(ROOT, "src", to, file);
    if (fs.existsSync(dest)) {
      console.warn(`move-posts: ${section}/${file}: src/${to}/${file} already exists; left in place`);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, withoutMoveTo(text));
    fs.unlinkSync(from);

    const stem = path.basename(file, ".md");
    const oldDir = path.join(ROOT, "src/versions", section, stem);
    if (fs.existsSync(oldDir)) {
      const newDir = path.join(ROOT, "src/versions", to, stem);
      fs.mkdirSync(path.dirname(newDir), { recursive: true });
      fs.renameSync(oldDir, newDir);
      for (const snap of snapshotFiles().filter((f) => f.startsWith(newDir + path.sep))) {
        const s = fs.readFileSync(snap, "utf8");
        fs.writeFileSync(snap, s.replace(/^versionOf:.*$/m, `versionOf: src/${to}/${file}`));
      }
    }
    moved.push(`${section}/${file} → ${to}/`);
    console.log(`move-posts: ${section}/${file} → ${to}/`);
  }
  return moved;
}

if (require.main === module) movePosts();

module.exports = { requestedSection, withoutMoveTo, movePosts };
