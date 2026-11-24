// Site check: the rules CLAUDE.md lists that a build can test for itself.
// Runs after every build (`postbuild`, before check-readers.js) and fails it on:
//   • `{#` in a content file (Nunjucks silently drops everything after it)
//   • a post whose date has no time (the CMS always writes one)
//   • site.url ending in a slash, or feed.njk without `layout: false`
//   • a feed that isn't valid XML, or a margin note's card header in it
//   • a draft's URL on the home page, a section or tag page, the feed or
//     /posts.json
//   • a link or image in a built page that points at a file that isn't there
//   • a page listed in test/urls.txt that no longer exists, so old links keep
//     working. On main this only warns (a slug changed on purpose in the CMS
//     shouldn't stop the deploy); the pull request check (URLS_STRICT=1) fails.
//     `node scripts/check-site.js --update-urls` rewrites the list.
// Uploads no post uses are listed as a warning.
//
// Run on its own with `npm run check:site` (needs a built _site).
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { JSDOM } = require("jsdom");
const { ROOT, postFiles, snapshotFiles, postUrl } = require("./content.js");
const site = require("../src/_data/site.json");

const SITE = path.join(ROOT, "_site");
const URLS = path.join(ROOT, "test", "urls.txt");
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );

// ---- source --------------------------------------------------------------
const mdFiles = walk(path.join(ROOT, "src")).filter((f) => f.endsWith(".md"));
for (const f of mdFiles) {
  if (fs.readFileSync(f, "utf8").includes("{#")) fail(`${path.relative(ROOT, f)}: contains "{#"`);
}

const drafts = [];
for (const p of postFiles()) {
  const text = fs.readFileSync(p.path, "utf8");
  const { data } = matter(text);
  const date = text.match(/^date:\s*(.*)$/m);
  if (date && !/T\d\d:\d\d/.test(date[1])) {
    fail(`src/${p.section}/${p.file}: date has no time; write it as 2026-03-01T09:00:00+05:30`);
  }
  if (data.draft) drafts.push(p);
}

if (site.url.endsWith("/")) fail("site.json: url must not end in a slash");
if (!/^layout:\s*false\s*$/m.test(fs.readFileSync(path.join(ROOT, "src/feed.njk"), "utf8").split("---")[1])) {
  fail("feed.njk: front matter needs layout: false");
}

// ---- built site ------------------------------------------------------------
if (!fs.existsSync(SITE)) {
  console.error("check-site: no _site; run npm run build first");
  process.exit(1);
}

const feed = fs.readFileSync(path.join(SITE, "feed.xml"), "utf8");
const feedDoc = new JSDOM(feed, { contentType: "application/xml" }).window.document;
if (feedDoc.querySelector("parsererror")) fail("feed.xml: not valid XML");
if (/margin-note__meta|margin-note__av/.test(feed)) fail("feed.xml: a margin note kept its card header (rssContent no longer matches the shortcode)");

// Built pages, by URL
const htmlFiles = walk(SITE).filter((f) => f.endsWith(".html") && !f.startsWith(path.join(SITE, "admin")));
const urlOf = (f) => "/" + path.relative(SITE, f).replace(/index\.html$/, "").split(path.sep).join("/");
const pages = new Map(htmlFiles.map((f) => [urlOf(f), f]));

// Drafts stay out of every listing
const listings = [
  ["/", "home page"],
  ...site.sections.map((s) => [`/${s.name}/`, `/${s.name}/`]),
  ...[...pages.keys()].filter((u) => u.startsWith("/tags/")).map((u) => [u, u]),
];
for (const d of drafts) {
  const url = postUrl(d.section, d.file, matter(fs.readFileSync(d.path, "utf8")).data);
  const href = `href="${url}"`;
  for (const [u, name] of listings) {
    if (pages.has(u) && fs.readFileSync(pages.get(u), "utf8").includes(href)) fail(`draft ${url} is listed on ${name}`);
  }
  if (feed.includes(`${site.url}${url}"`)) fail(`draft ${url} is in the feed`);
  if (fs.readFileSync(path.join(SITE, "posts.json"), "utf8").includes(`"${url}"`)) fail(`draft ${url} is in posts.json`);
}

// Every root-relative link and image resolves to a built file
const exists = (url) => {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  const file = path.join(SITE, clean);
  if (clean.endsWith("/")) return fs.existsSync(path.join(file, "index.html"));
  return fs.existsSync(file) || fs.existsSync(path.join(file, "index.html"));
};
for (const [url, file] of pages) {
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(/\s(?:href|src|data-href)="(\/[^"/][^"]*|\/)"/g)) {
    if (!exists(m[1])) fail(`${url}: broken link ${m[1]}`);
  }
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const part of m[1].split(",")) {
      const src = part.trim().split(/\s+/)[0];
      if (src.startsWith("/") && !exists(src)) fail(`${url}: broken image ${src}`);
    }
  }
}

// Pages that existed when test/urls.txt was last written still exist
const builtUrls = [...pages.keys()].sort();
if (process.argv.includes("--update-urls")) {
  fs.mkdirSync(path.dirname(URLS), { recursive: true });
  fs.writeFileSync(URLS, builtUrls.join("\n") + "\n");
  console.log(`check-site: wrote ${builtUrls.length} URLs to test/urls.txt`);
} else if (fs.existsSync(URLS)) {
  const missing = fs.readFileSync(URLS, "utf8").split("\n").filter(Boolean).filter((u) => !pages.has(u));
  for (const u of missing) {
    const msg = `${u} no longer exists (listed in test/urls.txt)`;
    if (process.env.URLS_STRICT) fail(msg);
    else warnings.push(msg);
  }
}

// Uploads no post or snapshot uses
const usedText = [...postFiles().map((p) => p.path), ...snapshotFiles(), path.join(ROOT, "src/reference.md")]
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
const uploads = path.join(ROOT, "images", "uploads");
for (const f of fs.readdirSync(uploads)) {
  if (!usedText.includes(f)) warnings.push(`images/uploads/${f} isn't used by any post`);
}

for (const w of warnings) console.warn(`check-site: warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`check-site: ${e}`);
  process.exit(1);
}
console.log(`check-site: ${pages.size} pages, feed, links and drafts OK`);
