// Facts about posts that the build scripts, Eleventy's config and the
// templates all need, kept in one place so they can't drift apart:
// which sections exist (from src/_data/site.json), where a post's files live,
// and what URL a post gets.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const site = require("../src/_data/site.json");

const ROOT = path.join(__dirname, "..");
const SECTIONS = site.sections.map((s) => s.name);

// Every post file: [{ section, file, path }] (file is the bare filename)
function postFiles() {
  return SECTIONS.flatMap((section) => {
    const dir = path.join(ROOT, "src", section);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((file) => ({ section, file, path: path.join(dir, file) }));
  });
}

// Snapshot files of earlier versions: src/versions/{section}/{stem}/v{n}.md
function snapshotFiles() {
  const dir = path.join(ROOT, "src", "versions");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => /(^|\/)v\d+\.md$/.test(f))
    .map((f) => path.join(dir, f));
}

// A post's URL. With a slug: /{section}/{date}-{slug}/, the date taken from
// the filename. Without one: /{section}/{file stem}/. The section directory
// data files set this as the permalink (eleventyComputed), and the scripts
// that need a post's URL (og:images, version snapshots) call it too.
function postUrl(section, file, data) {
  const stem = path.basename(file, ".md");
  const slug = data && data.slug != null ? String(data.slug).trim() : "";
  if (!slug) return `/${section}/${stem}/`;
  const date = stem.match(/^(\d{4}-\d{2}-\d{2})-/);
  return `/${section}/${date ? date[1] + "-" : ""}${slug}/`;
}

// The live post a snapshot belongs to, from its versionOf path
// ("src/ideas/x.md"): { section, file, url }
function livePost(versionOf) {
  const [, section, file] = versionOf.split("/");
  const full = path.join(ROOT, versionOf);
  const data = fs.existsSync(full) ? matter(fs.readFileSync(full, "utf8")).data : {};
  return { section, file, data, url: postUrl(section, file, data) };
}

// Directory data for a section folder (src/{section}/{section}.11tydata.js)
function sectionData(section) {
  return {
    layout: "layouts/doc.njk",
    tags: [section],
    section,
    eleventyComputed: {
      permalink: (data) => (data.permalink === false ? false : postUrl(section, data.page.inputPath, data)),
    },
  };
}

module.exports = { ROOT, SECTIONS, postFiles, snapshotFiles, postUrl, livePost, sectionData };
