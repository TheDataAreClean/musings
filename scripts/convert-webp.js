const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const uploadsDir = path.join(__dirname, "../src/images/uploads");
const exts = new Set([".jpg", ".jpeg", ".png"]);

async function convertAll() {
  const files = fs.readdirSync(uploadsDir).filter((f) => exts.has(path.extname(f).toLowerCase()));
  await Promise.all(
    files.map(async (file) => {
      const src = path.join(uploadsDir, file);
      const dest = path.join(uploadsDir, path.basename(file, path.extname(file)) + ".webp");
      if (fs.existsSync(dest)) return;
      await sharp(src).webp({ quality: 82 }).toFile(dest);
      console.log(`converted: ${file} → ${path.basename(dest)}`);
    })
  );
}

convertAll().catch((err) => { console.error(err); process.exit(1); });
