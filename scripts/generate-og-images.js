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
 * Sanitizes a page URL into an og:image filename stem. Shared with
 * .eleventy.js (required directly, not reimplemented) so the file this
 * script writes and the URL base.njk points at can never drift apart.
 */
function ogImageSlug(url) {
  return url.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
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
function pageContent({ title, description, tags }, docFontName) {
  const contentSize = TXT_BASE * Z;
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
    h("div", { style: { fontWeight: 400, color: colors.text, display: "flex" } }, title),
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

async function main() {
  const docFont = resolveDocFont();
  const chromeFont = resolveChromeFont();
  const fontSet = new Map([[chromeFont.name, chromeFont], [docFont.name, docFont]]); // dedupe if both resolve the same
  const fonts = [...fontSet.values()].map((f) => ({ name: f.name, data: fs.readFileSync(f.path), weight: 400, style: "normal" }));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;

  for (const { dir, name } of SECTIONS) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const srcPath = path.join(dir, file);
      const { data } = matter(fs.readFileSync(srcPath, "utf8"));

      const url = computePostUrl(name, file, data);
      const outPath = path.join(OUT_DIR, `${ogImageSlug(url)}.png`);

      if (fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(srcPath).mtimeMs) {
        skipped++;
        continue;
      }

      const tags = (data.tags || []).filter((t) => !COLLECTION_TAGS.has(t));
      const png = await renderPng(buildCard({ title: data.title, description: data.description, tags }, docFont.name, chromeFont.name), fonts);
      fs.writeFileSync(outPath, png);
      generated++;
      console.log(`og:image  ${url}  ->  images/og/${path.basename(outPath)}`);
    }
  }

  console.log(`Done — ${generated} generated, ${skipped} up to date.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ogImageSlug };
