// Generates a per-post og:image — a real screenshot of the site's own
// doc-chrome (titlebar showing the site domain, title, description, tags),
// not a generic redesigned social card. Runs at build time, as part of
// `prebuild`, after backfill-permalink.js (so each post's final URL is
// already resolved before this reads it).
//
// Reused elsewhere: `ogImageSlug` is required directly by .eleventy.js so the
// og:image URL emitted in base.njk is computed by the exact same function
// that names the file here — one function, not two copies that can drift.
//
// Skips regenerating a post's image if the PNG is already newer than its
// source .md file — same caching pattern as convert-webp.js.

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const satori = require("satori").default;
const { Resvg } = require("@resvg/resvg-js");

const ROOT = path.join(__dirname, "..");
const FONT_DIR = path.join(__dirname, "og-fonts");
const OUT_DIR = path.join(ROOT, "images", "og");
const TOKENS_PATH = path.join(ROOT, "src", "css", "tokens.css");

const SECTIONS = [
  { dir: path.join(ROOT, "src", "ideas"), name: "ideas" },
  { dir: path.join(ROOT, "src", "notes"), name: "notes" },
  { dir: path.join(ROOT, "src", "snaps"), name: "snaps" },
];

const SITE_DOMAIN = "musings.thedataareclean.com"; // real value, src/_data/site.json's "url"
const COLLECTION_TAGS = new Set(["ideas", "notes", "snaps"]); // mirrors .eleventy.js's collectionTags filter

const W = 1200;
const H = 630;
const Z = 2; // content zoom — one of the site's own zoom-dropdown rungs (200%)
const CHROME_FONT_SIZE = 17; // real .app-titlebar__doc size (--text-sm) nudged up for legibility at this scale
const CHROME_SAVE_STATE_FONT_SIZE = 13; // real .app-titlebar__saved size (--text-xs), same nudge
const TITLEBAR_H = 34; // real, unzoomed — chrome never scales with content zoom (CLAUDE.md: zoom applies to .app-canvas only)

// real token values, src/css/tokens.css, unzoomed
const TXT_BASE = 16;
const SP = { 2: 8, 4: 16, 6: 24, 8: 32, 10: 40 };

const colors = {
  appBg: "#c8c8c8",
  chromeGradientTop: "#f8f8f8",
  chromeGradientBottom: "#efefef",
  chromeBorderTitlebar: "#e0e0e0",
  pageBg: "#ffffff",
  text: "#000000",
  muted: "#666666",
  mark: "#ffff00",
};

// ---- URL / filename ---------------------------------------------------------

/**
 * Turns a page URL into an og:image path, preserving the URL's own
 * hierarchy rather than flattening it — /ideas/2026-08-15-grandmother/
 * becomes ideas/2026-08-15-grandmother, so posts/tags naturally land in
 * their own subfolder (images/og/ideas/, images/og/tags/, …) instead of
 * one flat directory. Shared with .eleventy.js (required directly, not
 * reimplemented) so the path this script writes and the URL base.njk
 * points at can never drift apart.
 */
function ogImageSlug(url) {
  const trimmed = url.replace(/^\/|\/$/g, "");
  return trimmed === "" ? "home" : trimmed;
}

/**
 * True if generate-og-images.js actually wrote a PNG for this slug. Shared
 * with .eleventy.js the same way ogImageSlug is — base.njk gates its
 * og:image tags on this instead of on page type, so any page this script
 * covers (now or later) gets the tags automatically, and a page it doesn't
 * cover never emits a broken reference.
 */
function ogImageExists(slug) {
  return fs.existsSync(path.join(OUT_DIR, `${slug}.png`));
}

function computePostUrl(section, filename, data) {
  if (data.permalink) return data.permalink;
  const stem = filename.replace(/\.md$/, "");
  return `/${section}/${stem}/`;
}

// ---- font ------------------------------------------------------------------

// Real Arial/Georgia can't be embedded on CI (GitHub Actions runners don't
// have them installed, and neither is redistributable) — Arimo/Gelasio are
// their OFL metric-compatible substitutes, see CLAUDE.md's trap entry for
// why. But a local machine (this one included) often has the real fonts
// installed system-wide; using them there gets a pixel-perfect card instead
// of a close approximation, with zero risk since nothing gets committed or
// shipped from these paths — only used to embed glyph outlines at render time.
const REAL_FONT_PATHS = {
  Arial: ["/System/Library/Fonts/Supplemental/Arial.ttf"],
  Georgia: ["/System/Library/Fonts/Supplemental/Georgia.ttf"],
};

function resolveFont(realName, substituteName, substitutePath) {
  const realPath = (REAL_FONT_PATHS[realName] || []).find((p) => fs.existsSync(p));
  return realPath ? { name: realName, path: realPath } : { name: substituteName, path: substitutePath };
}

/**
 * Reads --font-doc's real current value so this generator can't silently
 * drift from whatever the site actually ships (Georgia today; Arial if that
 * default ever changes back).
 */
function resolveDocFont() {
  const css = fs.readFileSync(TOKENS_PATH, "utf8");
  const match = css.match(/--font-doc:\s*([^;]+);/);
  const isGeorgia = match && /georgia/i.test(match[1]);
  return isGeorgia
    ? resolveFont("Georgia", "Gelasio", path.join(FONT_DIR, "Gelasio.ttf"))
    : resolveFont("Arial", "Arimo", path.join(FONT_DIR, "Arimo.ttf"));
}

// Chrome (the titlebar) is always --font-ui, i.e. always Arial — never
// affected by the doc-font toggle above.
function resolveChromeFont() {
  return resolveFont("Arial", "Arimo", path.join(FONT_DIR, "Arimo.ttf"));
}

// ---- card layout -------------------------------------------------------------

function h(type, props, ...children) {
  return { type, props: { ...props, children } };
}

function stoplight() {
  const dot = (color) => h("div", { style: { width: 14, height: 14, borderRadius: 7, background: color, display: "flex" } });
  return h("div", { style: { display: "flex", gap: 10 } }, dot("#ff5f57"), dot("#febc2e"), dot("#28c840"));
}

// Real postSigil filter: → ideas, ○ snaps, · notes (default). Drawn as vector
// icons, not text glyphs — Arial/Arimo don't cover U+2192 (→), and unlike a
// browser (which silently substitutes another installed font) satori has no
// OS font fallback to lean on.
function sigilIcon(sigil, color, size) {
  if (sigil === "→") {
    return h(
      "svg",
      { width: size, height: size, viewBox: "0 0 24 24", style: { display: "flex" } },
      h("line", { x1: 4, y1: 12, x2: 18, y2: 12, stroke: color, "stroke-width": 2 }),
      h("polyline", { points: "12 6 18 12 12 18", stroke: color, "stroke-width": 2, fill: "none" })
    );
  }
  if (sigil === "○") {
    return h(
      "svg",
      { width: size, height: size, viewBox: "0 0 24 24", style: { display: "flex" } },
      h("circle", { cx: 12, cy: 12, r: 8, stroke: color, "stroke-width": 2, fill: "none" })
    );
  }
  return h("span", { style: { display: "flex", color } }, sigil);
}

function tagPill(text, fontSize) {
  return h(
    "span",
    { style: { background: colors.mark, color: colors.text, fontSize, padding: "2px 8px", marginRight: 10, display: "flex" } },
    text
  );
}

function titlebar() {
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        height: TITLEBAR_H,
        backgroundImage: `linear-gradient(180deg, ${colors.chromeGradientTop} 0%, ${colors.chromeGradientBottom} 100%)`,
        borderBottom: `1px solid ${colors.chromeBorderTitlebar}`,
        padding: "0 16px",
      },
    },
    stoplight(),
    h(
      "div",
      { style: { flex: 1, display: "flex", justifyContent: "center", fontSize: CHROME_FONT_SIZE, fontWeight: 700, color: colors.text } },
      SITE_DOMAIN
    ),
    h(
      "div",
      { style: { width: 140, display: "flex", justifyContent: "flex-end", fontSize: CHROME_SAVE_STATE_FONT_SIZE, color: colors.muted } },
      "All changes saved" // real value, src/_data/site.json's chrome.saveState
    )
  );
}

// Real CSS: .doc-page { font-family: var(--font-doc); } — everything inside
// the page inherits the doc font; only the titlebar above uses --font-ui
// (always Arimo/Arial, never overridden). .doc-title/.doc-description are
// both --text-base — one uniform content size, not a headline/body split.
// Gap above tags mirrors .doc-description's real margin-bottom (space-2).
function pageContent({ title, description, tags, highlightTitle, sigil }, docFontName) {
  const contentSize = TXT_BASE * Z;
  // Tag pages render their real doc-title as <mark>{{ tag }}</mark> (see
  // components.css's `mark` rule) — highlightTitle mirrors that exact
  // treatment here instead of inventing a new title style for this one case.
  const titleStyle = highlightTitle
    ? { fontWeight: 400, color: colors.text, background: colors.mark, padding: `0 ${4 * Z}px`, alignSelf: "flex-start", display: "flex" }
    : { fontWeight: 400, color: colors.text, display: "flex" };
  const titleRow = sigil
    ? h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: SP[2] * Z } },
        sigilIcon(sigil, colors.text, contentSize * 0.75),
        h("div", { style: titleStyle }, title)
      )
    : h("div", { style: titleStyle }, title);
  return h(
    "div",
    {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: `${SP[6] * Z}px ${SP[10] * Z}px`,
        fontFamily: docFontName,
        fontSize: contentSize,
      },
    },
    titleRow,
    description && h("div", { style: { color: colors.muted, marginTop: SP[2] * Z, display: "flex" } }, description),
    tags.length > 0 && h("div", { style: { display: "flex", marginTop: SP[8] * Z } }, ...tags.map((t) => tagPill(t, contentSize)))
  );
}

function buildCard(content, docFontName, chromeFontName) {
  const page = h(
    "div",
    { style: { flex: 1, display: "flex", flexDirection: "column", background: colors.pageBg, border: `1px solid ${colors.text}` } },
    titlebar(),
    pageContent(content, docFontName)
  );
  return h(
    "div",
    { style: { width: W, height: H, display: "flex", flexDirection: "column", background: colors.appBg, fontFamily: chromeFontName, padding: 16 } },
    page
  );
}

// ---- render + file walk ------------------------------------------------------

async function renderPng(card, fonts) {
  const svg = await satori(card, { width: W, height: H, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

const SIGILS = { ideas: "→", notes: "·", snaps: "○" }; // mirrors .eleventy.js's postSigil filter
const SITE_DATA_PATH = path.join(ROOT, "src", "_data", "site.json");

async function main() {
  const docFont = resolveDocFont();
  const chromeFont = resolveChromeFont();
  const fontSet = new Map([[chromeFont.name, chromeFont], [docFont.name, docFont]]); // dedupe if both resolve the same
  const fonts = [...fontSet.values()].map((f) => ({ name: f.name, data: fs.readFileSync(f.path), weight: 400, style: "normal" }));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;

  // Renders and writes one card unless its PNG is already newer than srcPath
  // (same caching pattern as convert-webp.js). Returns without writing when
  // srcPath is null — used for the tag pages below, whose content depends on
  // every tagged post rather than one source file.
  async function renderIfStale(url, srcPath, content) {
    const slug = ogImageSlug(url);
    const outPath = path.join(OUT_DIR, `${slug}.png`);
    if (srcPath && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(srcPath).mtimeMs) {
      skipped++;
      return;
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const png = await renderPng(buildCard(content, docFont.name, chromeFont.name), fonts);
    fs.writeFileSync(outPath, png);
    generated++;
    console.log(`og:image  ${url}  ->  images/og/${slug}.png`);
  }

  // ---- posts --------------------------------------------------------------
  for (const { dir, name } of SECTIONS) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const srcPath = path.join(dir, file);
      const { data } = matter(fs.readFileSync(srcPath, "utf8"));
      const url = computePostUrl(name, file, data);
      const tags = (data.tags || []).filter((t) => !COLLECTION_TAGS.has(t));
      await renderIfStale(url, srcPath, { title: data.title, description: data.description, tags });
    }
  }

  // ---- home -----------------------------------------------------------------
  const homeSrcPath = path.join(ROOT, "src", "index.md");
  const homeData = matter(fs.readFileSync(homeSrcPath, "utf8")).data;
  const siteData = JSON.parse(fs.readFileSync(SITE_DATA_PATH, "utf8"));
  await renderIfStale("/", homeSrcPath, { title: siteData.shortTitle, description: homeData.description, tags: [] });

  // ---- section indices --------------------------------------------------
  for (const { name } of SECTIONS) {
    const srcPath = path.join(ROOT, "src", name, "index.njk");
    const { data } = matter(fs.readFileSync(srcPath, "utf8"));
    await renderIfStale(`/${name}/`, srcPath, { title: data.title, description: data.description, tags: [], sigil: SIGILS[name] });
  }

  // ---- about ----------------------------------------------------------------
  const aboutSrcPath = path.join(ROOT, "src", "about.md");
  const aboutData = matter(fs.readFileSync(aboutSrcPath, "utf8")).data;
  await renderIfStale("/about/", aboutSrcPath, { title: aboutData.title, description: aboutData.description, tags: [] });

  // ---- tag pages --------------------------------------------------------
  // No single source file — a tag's card depends on every post carrying it —
  // so these always regenerate rather than trying to cache against one mtime.
  const tagCounts = {};
  for (const { dir } of SECTIONS) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const { data } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      for (const t of data.tags || []) {
        if (COLLECTION_TAGS.has(t)) continue;
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }
  }
  for (const [tag, count] of Object.entries(tagCounts)) {
    const description = `${count} post${count !== 1 ? "s" : ""} tagged as ${tag}.`;
    await renderIfStale(`/tags/${tag}/`, null, { title: tag, description, tags: [], highlightTitle: true });
  }

  console.log(`Done — ${generated} generated, ${skipped} up to date.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ogImageSlug, ogImageExists, buildCard, renderPng, resolveDocFont, resolveChromeFont };
