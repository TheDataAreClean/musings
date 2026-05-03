const sharp = require("sharp");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const uploadsDir = path.join(__dirname, "../src/images/uploads");
const contentDirs = [
  path.join(__dirname, "../src/ideas"),
  path.join(__dirname, "../src/notes"),
  path.join(__dirname, "../src/snaps"),
];
const convertExts = new Set([".jpg", ".jpeg", ".png", ".heic"]);

function getMdFiles() {
  return contentDirs.flatMap((dir) => {
    try {
      return fs.readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => path.join(dir, f));
    } catch {
      return [];
    }
  });
}

async function convertAll() {
  const files = fs.readdirSync(uploadsDir);
  const mdFiles = getMdFiles();

  // Read all md contents once — used for post map and ref updates
  const original = new Map(mdFiles.map((f) => [f, fs.readFileSync(f, "utf8")]));

  // Build image filename → post file map from md contents
  const imagePostMap = new Map();
  for (const [mdFile, content] of original) {
    for (const match of content.matchAll(/\(\/images\/uploads\/([^)"\s]+)/g)) {
      const name = path.basename(match[1]);
      if (!imagePostMap.has(name)) imagePostMap.set(name, mdFile);
    }
  }

  // Convert originals, naming output after the referencing post
  const toConvert = files.filter((f) => convertExts.has(path.extname(f).toLowerCase()));
  const renames = new Map(); // old filename → new webp filename

  await Promise.all(
    toConvert.map(async (file) => {
      const src = path.join(uploadsDir, file);
      const buf = fs.readFileSync(src);
      const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 8);

      const postFile = imagePostMap.get(file);
      const base = postFile
        ? `${path.basename(postFile, ".md")}-${hash}`
        : `${path.basename(file, path.extname(file))}-${hash}`;

      const dest = path.join(uploadsDir, base + ".webp");
      if (fs.existsSync(dest)) return;
      await sharp(src).rotate().webp({ quality: 82 }).toFile(dest);
      fs.unlinkSync(src);
      renames.set(file, base + ".webp");
      console.log(`converted: ${file} → ${base}.webp`);
    })
  );

  // Update markdown refs in one pass — newly renamed + stale extension refs
  const updated = new Map(original);

  for (const [oldName, newName] of renames) {
    for (const mdFile of mdFiles) {
      const content = updated.get(mdFile);
      if (content.includes(oldName)) {
        updated.set(mdFile, content.split(oldName).join(newName));
      }
    }
  }

  const allWebp = new Set([
    ...files.filter((f) => f.endsWith(".webp")),
    ...renames.values(),
  ]);
  for (const webpFile of allWebp) {
    const base = path.basename(webpFile, ".webp");
    for (const mdFile of mdFiles) {
      let content = updated.get(mdFile);
      for (const ext of convertExts) {
        if (content.includes(base + ext)) {
          content = content.split(base + ext).join(webpFile);
        }
      }
      updated.set(mdFile, content);
    }
  }

  for (const mdFile of mdFiles) {
    if (updated.get(mdFile) !== original.get(mdFile)) {
      fs.writeFileSync(mdFile, updated.get(mdFile), "utf8");
    }
  }
}

convertAll().catch((err) => { console.error(err); process.exit(1); });
