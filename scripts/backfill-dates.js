const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const contentDirs = ["src/ideas", "src/notes", "src/snaps"];
const dateOnlyRe = /^(date: )(\d{4}-\d{2}-\d{2})$/m;

for (const dir of contentDirs) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filepath = path.join(dir, file);
    const content = fs.readFileSync(filepath, "utf8");
    const match = content.match(dateOnlyRe);
    if (!match) continue;

    const userDate = match[2];

    let gitTimestamp;
    try {
      gitTimestamp = execSync(
        `git log --follow --diff-filter=A --format="%aI" -- "${filepath}"`,
        { encoding: "utf8" }
      ).trim();
    } catch {
      console.warn(`skip (git error): ${filepath}`);
      continue;
    }

    if (!gitTimestamp) {
      console.warn(`skip (no git history): ${filepath}`);
      continue;
    }

    const newDate = `${userDate}${gitTimestamp.substring(10)}`; // keep user date, take time+tz from git
    fs.writeFileSync(filepath, content.replace(dateOnlyRe, `$1${newDate}`), "utf8");
    console.log(`backfill: ${filepath}  ${userDate} → ${newDate}`);
  }
}
