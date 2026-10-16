// Post versions: freezes each earlier version of a post into its own file.
//
// The author bumps `version:` on a post (in Sveltia or by hand). On the next
// build this script finds, in the file's git history, the last commit where
// the post was still at each earlier version, and writes that copy to
// src/versions/{section}/{post-file-stem}/v{n}.md. Once written, a snapshot
// is never regenerated, so it stops depending on git history. Git history
// alone can't be the version store: Sveltia commits on every save.
//
// It also stamps `versionDate:` on the live post (when the bump was first
// committed, or now if it isn't committed yet) and keeps each snapshot's
// permalink in step with its post's URL, like backfill-permalink.js.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const SECTIONS = ["ideas", "notes", "snaps"];
const VERSIONS_DIR = path.join(ROOT, "src/versions");

const versionOf = (text) => {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const m = fm && fm[1].match(/^version:\s*(\d+)\s*$/m);
  return m ? Number(m[1]) : 1;
};

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

// Every commit that touched the file, newest first: { sha, date, path, text }
function history(relPath) {
  let log;
  try {
    log = git(["log", "--follow", "--format=%x00%H%x09%aI", "--name-only", "--", relPath]);
  } catch {
    return [];
  }
  return log
    .split("\0")
    .filter(Boolean)
    .map((chunk) => {
      const [head, ...rest] = chunk.trim().split("\n");
      const [sha, date] = head.split("\t");
      const filePath = rest.map((l) => l.trim()).filter(Boolean).pop();
      let text = null;
      try {
        text = git(["show", `${sha}:${filePath}`]);
      } catch {}
      return { sha, date, path: filePath, text };
    })
    .filter((c) => c.text !== null);
}

function postUrl(section, file, data) {
  return data.permalink || `/${section}/${file.replace(/\.md$/, "")}/`;
}

function setFrontMatterLine(text, key, value, after) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, "m");
  let body = fm[1];
  if (re.test(body)) body = body.replace(re, line);
  else if (after && new RegExp(`^${after}:.*$`, "m").test(body)) body = body.replace(new RegExp(`^(${after}:.*)$`, "m"), `$1${eol}${line}`);
  else body = `${body}${eol}${line}`;
  return text.replace(fm[0], `---${eol}${body}${eol}---`);
}

for (const section of SECTIONS) {
  const dir = path.join(ROOT, "src", section);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const relPath = `src/${section}/${file}`;
    const filePath = path.join(ROOT, relPath);
    let text = fs.readFileSync(filePath, "utf8");
    const latest = versionOf(text);
    if (latest < 2) continue;

    const { data } = matter(text);
    const url = postUrl(section, file, data);
    const snapDir = path.join(VERSIONS_DIR, section, file.replace(/\.md$/, ""));
    let commits = null;

    for (let n = 1; n < latest; n++) {
      const snapPath = path.join(snapDir, `v${n}.md`);
      const permalink = `${url}v${n}/`;

      if (fs.existsSync(snapPath)) {
        const snap = fs.readFileSync(snapPath, "utf8");
        const fixed = setFrontMatterLine(snap, "permalink", permalink);
        if (fixed !== snap) {
          fs.writeFileSync(snapPath, fixed, "utf8");
          console.log(`versions: ${path.relative(ROOT, snapPath)}  → ${permalink}`);
        }
        continue;
      }

      commits = commits || history(relPath);
      const atN = commits.filter((c) => versionOf(c.text) === n);
      if (!atN.length) {
        console.warn(`versions: no commit of ${relPath} at version ${n} — v${n} not saved`);
        continue;
      }

      const old = matter(atN[0].text);
      const fm = {
        title: old.data.title,
        ...(old.data.description && { description: old.data.description }),
        date: old.data.date,
        ...(old.data.tags && { postTags: old.data.tags }),
        version: n,
        versionDate: n === 1 ? old.data.date : old.data.versionDate || atN[atN.length - 1].date,
        ...(n > 1 && old.data.versionNote && { versionNote: old.data.versionNote }),
        versionOf: relPath,
        permalink,
      };
      fs.mkdirSync(snapDir, { recursive: true });
      fs.writeFileSync(snapPath, matter.stringify(old.content, fm), "utf8");
      console.log(`versions: saved ${path.relative(ROOT, snapPath)} from ${atN[0].sha.slice(0, 7)}`);
    }

    // versionDate on the live post must be later than the previous version's
    // date — when it isn't (missing, or left over from the last bump), stamp
    // the time this version was first committed.
    const prevPath = path.join(snapDir, `v${latest - 1}.md`);
    const prevDate = fs.existsSync(prevPath) ? new Date(matter(fs.readFileSync(prevPath, "utf8")).data.versionDate) : null;
    const current = data.versionDate ? new Date(data.versionDate) : null;
    if (!current || (prevDate && current <= prevDate)) {
      commits = commits || history(relPath);
      const atLatest = commits.filter((c) => versionOf(c.text) === latest);
      const stamp = atLatest.length ? atLatest[atLatest.length - 1].date : new Date().toISOString();
      text = setFrontMatterLine(text, "versionDate", stamp, "version");
      fs.writeFileSync(filePath, text, "utf8");
      console.log(`versions: ${relPath}  versionDate → ${stamp}`);
    }
  }
}
