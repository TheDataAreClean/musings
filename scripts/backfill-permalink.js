const fs = require("fs");
const path = require("path");

const sections = [
  { dir: path.join(__dirname, "../src/ideas"), name: "ideas" },
  { dir: path.join(__dirname, "../src/notes"), name: "notes" },
  { dir: path.join(__dirname, "../src/snaps"), name: "snaps" },
];

for (const { dir, name } of sections) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filepath = path.join(dir, file);
    const content = fs.readFileSync(filepath, "utf8");

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;

    const fm = fmMatch[1];
    const eol = content.includes("\r\n") ? "\r\n" : "\n";

    const slugMatch = fm.match(/^slug:\s*(.+)$/m);
    if (!slugMatch) continue;
    const slug = slugMatch[1].trim().replace(/^["']|["']$/g, "");

    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})-/);
    const datePrefix = dateMatch ? `${dateMatch[1]}-` : "";
    const expected = `/${name}/${datePrefix}${slug}/`;

    const existingPermalink = fm.match(/^permalink:\s*(.+)$/m);
    if (existingPermalink && existingPermalink[1].trim() === expected) continue;

    let newFm;
    if (existingPermalink) {
      newFm = fm.replace(/^permalink:\s*.+$/m, `permalink: ${expected}`);
    } else {
      newFm = fm.replace(/^(slug:\s*.+)$/m, `$1${eol}permalink: ${expected}`);
    }

    const newContent = content.replace(fmMatch[0], `---${eol}${newFm}${eol}---`);
    fs.writeFileSync(filepath, newContent, "utf8");
    console.log(`permalink: ${filepath}  → ${expected}`);
  }
}
