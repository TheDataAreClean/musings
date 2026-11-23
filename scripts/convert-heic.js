// HEIC uploads → WebP. The CMS converts JPEG and PNG to WebP in the browser
// (media_libraries in src/admin/config.yml), and Eleventy Image (.eleventy.js)
// resizes every image at build time without touching the repo. HEIC is the
// one format neither can read (browsers outside Safari can't decode it, and
// sharp's prebuilt binaries have no HEVC), so a HEIC upload is decoded here by
// libheif (heic-decode, WebAssembly), saved as a WebP with the same name, and
// the posts and snapshots that use it are pointed at the new file. The deploy
// commits that change, so this is the one upload that causes a bot commit.
const sharp = require("sharp");
const decodeHeic = require("heic-decode");
const fs = require("fs");
const path = require("path");
const { ROOT, postFiles, snapshotFiles } = require("./content.js");

const uploadsDir = path.join(ROOT, "images", "uploads");

async function main() {
  const heics = fs.readdirSync(uploadsDir).filter((f) => path.extname(f).toLowerCase() === ".heic");
  if (!heics.length) return;

  const mdFiles = [...postFiles().map((p) => p.path), ...snapshotFiles()];
  const texts = new Map(mdFiles.map((f) => [f, fs.readFileSync(f, "utf8")]));

  for (const file of heics) {
    const src = path.join(uploadsDir, file);
    let base = path.basename(file, path.extname(file));
    while (fs.existsSync(path.join(uploadsDir, base + ".webp"))) base += "-1";
    try {
      const { width, height, data } = await decodeHeic({ buffer: fs.readFileSync(src) });
      const webp = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      fs.writeFileSync(path.join(uploadsDir, base + ".webp"), webp);
    } catch (err) {
      throw new Error(`convert-heic: could not convert ${file} (${err.message}). Re-upload it as a JPEG or PNG.`);
    }
    fs.unlinkSync(src);
    for (const [f, text] of texts) {
      if (text.includes(file)) texts.set(f, text.split(file).join(base + ".webp"));
    }
    console.log(`converted: ${file} → ${base}.webp`);
  }

  for (const [f, text] of texts) {
    if (text !== fs.readFileSync(f, "utf8")) fs.writeFileSync(f, text, "utf8");
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
