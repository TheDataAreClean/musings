// Unit tests for the site's own logic: the markdown rules, the changes-page
// diff, the feed rewrite, the URL rule and the CMS insert menu. Run with
// `npm test` (Node's built-in runner, no dependencies). The Eleventy config is
// loaded against a stand-in that records its filters, shortcodes and markdown
// library, so these test the real code, not a copy.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ---- load .eleventy.js -----------------------------------------------------
const filters = {};
const shortcodes = {};
let md;
const stub = new Proxy(
  {
    addFilter: (name, fn) => (filters[name] = fn),
    addPairedShortcode: (name, fn) => (shortcodes[name] = fn),
    addShortcode: (name, fn) => (shortcodes[name] = fn),
    setLibrary: (_, lib) => (md = lib),
  },
  { get: (target, key) => target[key] || (() => {}) }
);
process.env.ELEVENTY_RUN_MODE = "build";
require("../.eleventy.js")(stub);

// ---- markdown --------------------------------------------------------------
test("a lone image becomes a figure, its title the caption", () => {
  const html = md.render('![a cat](/images/uploads/cat.webp "Our cat")');
  assert.match(html, /<figure>\n<img src="\/images\/uploads\/cat.webp" alt="a cat" title="Our cat"[^>]*>\n<figcaption>Our cat<\/figcaption>\n<\/figure>/);
});

test("a bullet ending in an image shows the image under its text", () => {
  const html = md.render('- Some text.![](/images/uploads/a.webp "Caption")\n- Next');
  assert.match(html, /<li>Some text\.\s*<figure>/s);
  assert.match(html, /<figcaption>Caption<\/figcaption>/);
});

test("only the first image loads eagerly", () => {
  const html = md.render("![](/a.webp)\n\n![](/b.webp)\n\nText ![](/c.webp) inline");
  assert.equal((html.match(/loading="eager"/g) || []).length, 1);
  assert.match(html, /src="\/a.webp"[^>]*loading="eager"/);
});

test("a line break inside a quote is kept; elsewhere it is a space", () => {
  assert.match(md.render("> one\n> two"), /one<br>\ntwo/);
  assert.doesNotMatch(md.render("one\ntwo"), /<br>/);
});

// ---- changes page diff -----------------------------------------------------
test("htmlDiff marks added and removed words", () => {
  const out = filters.htmlDiff("<p>The quick fox</p>", "<p>The slow fox</p>");
  assert.match(out, /<del>quick<\/del>/);
  assert.match(out, /<ins>slow<\/ins>/);
  assert.equal(filters.htmlDiff("<p>Same</p>", "<p>Same</p>"), "<p>Same</p>");
});

test("htmlDiff keeps a removed paragraph as a struck-out block", () => {
  const out = filters.htmlDiff("<p>One</p><p>Two</p>", "<p>One</p>");
  assert.match(out, /<p><del>Two<\/del><\/p>/);
});

test("beforeSentence lists what used to be there", () => {
  assert.equal(filters.beforeSentence([["the title", "was", "Old"]]), "Before, the title was <del>Old</del>.");
  assert.equal(
    filters.beforeSentence([["the title", "was", "A & B"], ["the tags", "were", ""]]),
    "Before, the title was <del>A &amp; B</del> and the tags (none)."
  );
});

// ---- feed ------------------------------------------------------------------
test("rssContent makes links absolute and writes captions as text", () => {
  const out = filters.rssContent('<figure><img src="/images/x.webp" loading="eager"><figcaption>Hi</figcaption></figure><a href="/about/">a</a>', "https://example.com");
  assert.match(out, /src="https:\/\/example.com\/images\/x.webp"/);
  assert.match(out, /href="https:\/\/example.com\/about\/"/);
  assert.match(out, /<p style="[^"]*">Hi<\/p>/);
  assert.doesNotMatch(out, /loading=/);
});

test("the feed drops a margin note's card header (the regex still matches the shortcode)", () => {
  const note = shortcodes.marginnote.call({ ctx: { site: { author: "Arpit" } }, page: { date: new Date("2026-10-16") } }, "A thought.", "phrase");
  assert.match(note, /margin-note__meta/);
  const out = filters.rssContent(note, "https://example.com");
  assert.doesNotMatch(out, /margin-note__meta|data-text/);
  assert.match(out, /Note on “phrase” · 16 Oct, 2026/);
  assert.match(out, /A thought\./);
});

// ---- URLs ------------------------------------------------------------------
test("postUrl uses the slug with the filename's date, else the filename", () => {
  const { postUrl } = require("../scripts/content.js");
  assert.equal(postUrl("notes", "2026-11-23-punjabi-day-9.md", { slug: "pwd-9" }), "/notes/2026-11-23-pwd-9/");
  assert.equal(postUrl("ideas", "2026-08-02-fraands.md", { slug: "" }), "/ideas/2026-08-02-fraands/");
  assert.equal(postUrl("snaps", "./src/snaps/2026-01-01-x.md", {}), "/snaps/2026-01-01-x/");
});

// ---- CMS insert menu -------------------------------------------------------
test("every insert-menu block reopens into its form", () => {
  const components = {};
  const CMS = { registerEditorComponent: (c) => (components[c.id] = c) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/admin/editor-components.js"), "utf8"), { CMS });
  const samples = {
    marginnote: [{ phrase: "a phrase", date: "2026-03-01", text: "Note text" }, { phrase: "", date: "", text: "Plain" }],
    callout: [{ type: "warning", text: "Careful" }],
    pagebreak: [{}],
    "footnote-marker": [{ name: "src" }],
    "footnote-text": [{ name: "src", text: "Where it came from" }],
    "captioned-image": [{ src: "/images/uploads/a.webp", alt: "Alt", caption: "A caption" }],
    "quote-source": [{ quote: "Line one\nLine two", source: "Someone, 2026" }],
  };
  assert.deepEqual(Object.keys(components).sort(), Object.keys(samples).sort(), "a new component needs a sample here");
  for (const [id, cases] of Object.entries(samples)) {
    const c = components[id];
    for (const values of cases) {
      const block = c.toBlock(values);
      const m = block.match(c.pattern);
      assert.ok(m, `${id}: pattern doesn't match its own block:\n${block}`);
      assert.deepEqual({ ...c.fromBlock(m) }, values, `${id}: fields change on reopening`);
    }
  }
});
