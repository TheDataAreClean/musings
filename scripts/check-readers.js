// Reader-view check: how each post reads in apps that pull it from its page
// instead of the feed (Reeder via a blogroll, Safari Reader, IndieWeb readers).
//
// Runs after every build (`postbuild`), so CI won't deploy a change that
// breaks it. For each post page in _site/{ideas,notes,snaps} it runs the
// extraction engines those apps are built on and fails if:
//   • page chrome leaks into the extracted text: the site nav, the meta line
//     ("… words · … min read"), the "More …" / "All posts" links, the page URL
//   • the title shows up again at the top of the body
//   • a margin note is dropped, or loses its "Note on … · date" label
//   • a margin note's card header runs into one line ("AArpit16 Oct")
//   • a post with prose extracts to nothing (Readability, Mercury, h-entry)
//   • the h-entry or the BlogPosting JSON-LD is missing a field
// article-extractor skips posts under its length threshold by design, so an
// empty result there is a note, not a failure. A photo-only snap, or one whose
// only text is a link, has nothing for any engine to hold onto; a note too.
//
// Run on its own with `npm run check:readers` (needs a built _site).

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const Mercury = require("@postlight/parser");
const { mf2 } = require("microformats-parser");

const SITE = path.join(__dirname, "..", "_site");
const site = require("../src/_data/site.json");
const SECTIONS = ["ideas", "notes", "snaps"];

const quiet = new VirtualConsole(); // jsdom: no CSS parse noise in the build log
const textOf = (html) => {
  if (!html) return "";
  const doc = new JSDOM(`<body>${html}</body>`, { virtualConsole: quiet }).window.document;
  return doc.body.textContent.replace(/\s+/g, " ").trim();
};

const LEAKS = [
  [/Home · Ideas · Notes/, "site nav"],
  [/\d[\d,]* words · \d+ min read/, "meta line"],
  [/← More (ideas|notes|snaps)|All posts →/, "post nav"],
  [new RegExp(site.url.replace(/^https:\/\//, "").replace(/\./g, "\\.") + "/"), "page URL"],
  [new RegExp(`\\b${site.author}\\d`), "note header run together"],
];

function pages() {
  const out = [];
  for (const section of SECTIONS) {
    const dir = path.join(SITE, section);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const file = path.join(dir, slug, "index.html");
      if (fs.existsSync(file)) out.push({ url: `/${section}/${slug}/`, file });
    }
  }
  return out;
}

async function check({ url, file }) {
  const html = fs.readFileSync(file, "utf8");
  const abs = site.url + url;
  const doc = new JSDOM(html, { url: abs, virtualConsole: quiet }).window.document;
  const title = doc.querySelector("h1.doc-title")?.textContent.trim() || "";
  const body = doc.querySelector(".doc-body");
  // Words outside links: engines discard a block that is mostly links, so a
  // snap whose only text is a URL has nothing for them to keep either
  let prose = "";
  if (body) {
    const copy = body.cloneNode(true);
    copy.querySelectorAll("a").forEach((a) => a.remove());
    prose = copy.textContent.replace(/[\s\p{P}]+/gu, "");
  }
  const hasText = prose.length >= 10;
  const notes = doc.querySelectorAll(".doc-body .margin-note").length;
  const fail = [];
  const note = [];

  const readability = new Readability(doc.cloneNode(true)).parse();
  let mercury = null;
  try {
    mercury = await Mercury.parse(abs, { html, fetchAllPages: false });
  } catch (e) {
    fail.push(`mercury: threw ${e.message}`);
  }
  let extractus = null;
  try {
    const { extractFromHtml } = await import("@extractus/article-extractor");
    extractus = await extractFromHtml(html, abs);
  } catch (e) {
    fail.push(`article-extractor: threw ${e.message}`);
  }
  const entry = mf2(html, { baseUrl: abs }).items.find((i) => i.type.includes("h-entry"));

  const outputs = {
    readability: readability?.content,
    mercury: mercury?.content,
    "article-extractor": extractus?.content,
    "h-entry": entry?.properties.content?.[0]?.html,
  };

  for (const [engine, content] of Object.entries(outputs)) {
    const text = textOf(content);
    if (!text && /<img\b/.test(content || "")) continue; // a photo, no words: nothing to misread
    if (!text) {
      if (!hasText) note.push(`${engine}: nothing to extract (little or no text outside links)`);
      else if (engine === "article-extractor") note.push(`${engine}: skipped (under its length threshold)`);
      else fail.push(`${engine}: extracted nothing`);
      continue;
    }
    for (const [re, what] of LEAKS) if (re.test(text)) fail.push(`${engine}: ${what} in the text`);
    if (title && text.startsWith(title)) fail.push(`${engine}: title repeated at the top`);
    if (notes) {
      const labels = (text.match(/Note( on “[^”]*”)? · /g) || []).length;
      if (labels < notes) fail.push(`${engine}: ${notes - labels} of ${notes} margin notes dropped or unlabelled`);
    }
  }

  // h-entry: what IndieWeb readers and blogrolls read
  if (!entry) fail.push("h-entry: missing");
  else {
    const p = entry.properties;
    for (const k of ["name", "published", "author", "url", "content"]) if (!p[k]) fail.push(`h-entry: no ${k}`);
    if (p.name && p.name[0] !== title) fail.push(`h-entry: name is "${p.name[0]}", not the title`);
    if (p.author && !p.author[0].properties?.name?.[0]) fail.push("h-entry: author has no name");
  }

  // JSON-LD: what Readability and others take the title, byline and date from
  const ld = doc.querySelector('script[type="application/ld+json"]');
  if (!ld) fail.push("JSON-LD: missing");
  else {
    try {
      const data = JSON.parse(ld.textContent);
      for (const k of ["headline", "datePublished", "author", "url"]) if (!data[k]) fail.push(`JSON-LD: no ${k}`);
    } catch (e) {
      fail.push(`JSON-LD: invalid (${e.message})`);
    }
  }
  if (readability && readability.byline !== site.author) fail.push(`readability: byline is "${readability.byline}"`);

  return { url, fail, note };
}

(async () => {
  const list = pages();
  if (!list.length) {
    console.error("check-readers: no post pages in _site — run the build first");
    process.exit(1);
  }
  let failed = 0;
  const notes = [];
  for (const page of list) {
    const r = await check(page);
    if (r.fail.length) {
      failed++;
      console.error(`✗ ${r.url}\n  ${r.fail.join("\n  ")}`);
    }
    for (const n of r.note) notes.push(`${r.url} ${n}`);
  }
  if (notes.length && process.argv.includes("--verbose")) console.log(`check-readers notes:\n  ${notes.join("\n  ")}`);
  else if (notes.length) console.log(`check-readers: ${notes.length} expected gaps (photo-only snaps, posts too short for article-extractor); --verbose lists them`);
  if (failed) {
    console.error(`check-readers: ${failed} of ${list.length} posts would read wrong in reader apps (see above)`);
    process.exit(1);
  }
  console.log(`check-readers: ${list.length} posts read cleanly in Readability, Mercury, article-extractor and h-entry`);
})();
