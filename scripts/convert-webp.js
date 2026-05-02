const sharp = require("sharp");
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

  // Convert any originals that don't yet have a webp counterpart
  const toConvert = files.filter((f) => convertExts.has(path.extname(f).toLowerCase()));
  await Promise.all(
    toConvert.map(async (file) => {
      const src = path.join(uploadsDir, file);
      const base = path.basename(file, path.extname(file));
      const dest = path.join(uploadsDir, base + ".webp");
      if (fs.existsSync(dest)) return;
      await sharp(src).rotate().webp({ quality: 82 }).toFile(dest);
      fs.unlinkSync(src);
      console.log(`converted: ${file} → ${base}.webp (original removed)`);
    })
  );

  // Fix any markdown still referencing old extensions — read all files once into memory
  const mdFiles = getMdFiles();
  const original = new Map(mdFiles.map((f) => [f, fs.readFileSync(f, "utf8")]));
  const updated = new Map(original);

  const webpFiles = new Set([
    ...files.filter((f) => f.endsWith(".webp")),
    ...toConvert.map((f) => path.basename(f, path.extname(f)) + ".webp"),
  ]);
  for (const webpFile of webpFiles) {
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
