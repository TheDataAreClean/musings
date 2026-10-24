const markdownIt = require("markdown-it");
const markdownItFootnote = require("markdown-it-footnote");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItAttrs = require("markdown-it-attrs");
const { tagSlug, ogImageSlug, ogImageExists, readableDate } = require("./scripts/generate-og-images.js");
const { diffArrays } = require("diff");

const IST_ISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

function isoDate(date) {
  if (!date) return "";
  return IST_ISO.format(new Date(date));
}

// Returns a WebP path for convertible uploads (jpg/jpeg/png/heic), otherwise null
function webpSrc(src) {
  if (!src.startsWith("/images/uploads/")) return null;
  const ext = (src.match(/\.[^.]+$/)?.[0] || "").toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".heic"].includes(ext)) return null;
  return src.slice(0, -ext.length) + ".webp";
}

// Word-level diff of two rendered post bodies, for /v{n}/changes/ pages.
// Tags and words are diffed as tokens; the output keeps every tag of the newer
// version (so it stays balanced) with added words in <ins> and removed words in
// <del>. A removed run whose tags balance on their own (a whole paragraph)
// keeps its tags, so it shows as a struck-out block in place. An image counts
// as a word, so an added or removed image is marked too.
const VOID_TAG = /^<(area|br|col|embed|hr|img|input|link|meta|source|wbr)\b/i;

function diffTokens(html) {
  return html.match(/<[^>]+>|[^<\s]+\s*|\s+/g) || [];
}

function isText(tok) {
  return !tok.startsWith("<") || /^<img\b/i.test(tok);
}

function balanced(tokens) {
  const stack = [];
  for (const t of tokens) {
    if (isText(t) || !t.startsWith("<") || VOID_TAG.test(t) || t.startsWith("<!")) continue;
    const close = t.match(/^<\/(\w+)/);
    if (close) {
      if (stack.pop() !== close[1].toLowerCase()) return false;
    } else stack.push(t.match(/^<(\w+)/)[1].toLowerCase());
  }
  return stack.length === 0;
}

function wrapRun(tokens, tag, keepTags) {
  let out = "";
  let open = false;
  // Close the mark before any trailing space, so it doesn't underline the gap
  // (in <pre>, a removed line's newline would push the added text onto the
  // next line, so after a removal the gap is always a single space)
  const close = () => {
    let space = out.match(/\s*$/)[0];
    out = out.slice(0, out.length - space.length) + `</${tag}>`;
    if (space && tag === "del") space = " ";
    out += space;
    open = false;
  };
  for (const t of tokens) {
    if (isText(t)) {
      if (!open && t.trim()) { out += `<${tag}>`; open = true; }
      out += t;
    } else {
      if (open) close();
      if (keepTags) out += t;
    }
  }
  if (open) close();
  return out;
}

function htmlDiff(oldHtml, newHtml) {
  const parts = diffArrays(diffTokens(oldHtml || ""), diffTokens(newHtml || ""), {
    comparator: (a, b) => a.trim() === b.trim(),
  });
  return parts
    .map((part) => {
      if (part.added) return wrapRun(part.value, "ins", true);
      if (part.removed) return wrapRun(part.value, "del", balanced(part.value));
      return part.value.join("");
    })
    .join("");
}

// Wraps an img tag in a <picture> with a WebP source when available
function pictureTag(src, alt, title) {
  const webp = webpSrc(src);
  let img = `<img src="${src}" alt="${alt}"`;
  if (title) img += ` title="${title}"`;
  img += `>`;
  if (!webp) return img;
  return `<picture>\n<source srcset="${webp}" type="image/webp">\n${img}\n</picture>`;
}

// Wraps lone images in <figure>; uses title attribute as <figcaption>; serves WebP via <picture>
function markdownItFigures(md) {
  // Lone images → <figure> with optional <figcaption>
  md.core.ruler.push("implicit_figures", (state) => {
    for (let i = 1; i < state.tokens.length - 1; i++) {
      const tok = state.tokens[i];
      if (tok.type !== "inline") continue;
      if (!tok.children || tok.children.length !== 1) continue;
      if (tok.children[0].type !== "image") continue;
      if (state.tokens[i - 1].type !== "paragraph_open") continue;
      if (state.tokens[i + 1].type !== "paragraph_close") continue;

      const img = tok.children[0];
      const src = img.attrGet("src") || "";
      const alt = img.children ? img.children.map((t) => t.content).join("") : "";
      const title = img.attrGet("title") || "";

      let html = `<figure>\n${pictureTag(src, alt, title)}\n`;
      if (title) html += `<figcaption>${title}</figcaption>\n`;
      html += `</figure>`;

      state.tokens[i - 1] = Object.assign(new state.Token("html_block", "", 0), { content: "" });
      state.tokens[i] = Object.assign(new state.Token("html_block", "", 0), { content: html });
      state.tokens[i + 1] = Object.assign(new state.Token("html_block", "", 0), { content: "" });
    }
  });

  // Inline images (not lone in a paragraph) → <picture>
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src") || "";
    const alt = self.renderInlineAsText(token.children, options, env);
    const title = token.attrGet("title") || "";
    return pictureTag(src, alt, title);
  };
}

module.exports = function (eleventyConfig) {
  const isDev = process.env.ELEVENTY_RUN_MODE !== "build";
  function filterDrafts(posts) {
    return isDev ? posts : posts.filter((p) => !p.data.draft);
  }

  // Markdown configuration
  const md = markdownIt({
    html: true,
    breaks: false,
    linkify: true,
    typographer: true,
  })
    .use(markdownItFootnote)
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink(),
      slugify: (s) =>
        s
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-"),
    })
    .use(markdownItAttrs)
    .use(markdownItFigures);

  // Inside a quote, a single line break is a line break (lyrics, verse), as
  // the CMS editor shows it; elsewhere it stays a space (breaks: false)
  md.core.ruler.push("quote_breaks", (state) => {
    let depth = 0;
    for (const token of state.tokens) {
      if (token.type === "blockquote_open") depth++;
      else if (token.type === "blockquote_close") depth--;
      else if (depth && token.type === "inline" && token.children) {
        for (const child of token.children) {
          if (child.type === "softbreak") child.type = "hardbreak";
        }
      }
    }
  });

  eleventyConfig.setLibrary("md", md);

  // Passthrough copies
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/js");

  // /style/ is built from tokens.css (src/_data/tokens.js), so a token edit
  // must rebuild it under `eleventy --serve`
  eleventyConfig.addWatchTarget("src/css/tokens.css");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/apple-touch-icon.png");
  eleventyConfig.addPassthroughCopy("src/favicon-512.png");
  eleventyConfig.addPassthroughCopy("src/manifest.json");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Filters
  function stripHtml(content) {
    return content ? content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
  }

  eleventyConfig.addFilter("wordcount", function (content) {
    return stripHtml(content).split(/\s+/).filter(Boolean).length;
  });

  eleventyConfig.addFilter("readtime", function (content) {
    const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  const COLLECTION_TAGS = ["ideas", "notes", "snaps"];

  eleventyConfig.addFilter("collectionTags", function (tags) {
    return (tags || []).filter((t) => !COLLECTION_TAGS.includes(t));
  });

  // Shared with scripts/generate-og-images.js (required directly above) so
  // the og:image filename this filter builds and the one that script writes
  // can never drift apart.
  eleventyConfig.addFilter("ogImageSlug", ogImageSlug);
  eleventyConfig.addFilter("ogImageExists", ogImageExists);
  // Tag URL segment — use for every /tags/ link and the tag page permalink
  eleventyConfig.addFilter("tagSlug", tagSlug);

  eleventyConfig.addFilter("postSigil", function (tags) {
    if (!tags) return "·";
    if (tags.includes("ideas")) return "→";
    if (tags.includes("snaps")) return "○";
    return "·";
  });

  eleventyConfig.addFilter("readableDate", readableDate);

  eleventyConfig.addFilter("isoDate", isoDate);

  eleventyConfig.addFilter("atomDate", function (date) {
    if (!date) return "";
    return new Date(date).toISOString();
  });

  // Feed readers ignore main.css, so bake in the post-photo spacing inline
  eleventyConfig.addFilter("rssContent", function (content) {
    if (!content) return content;
    return content
      .replace(/<figure>/g, '<figure style="margin: 2rem 0 3rem;">')
      // Margin notes: feed readers drop the site CSS, so the card header (avatar
      // letter, author, date) would run into one line ("AArpit16 Oct"). Drop
      // it and keep the note's own label, styled inline as a quote.
      .replace(
        /<blockquote class="margin-note" role="note"[^>]*><p class="margin-note__label">([\s\S]*?)<\/p><header class="margin-note__meta"[\s\S]*?<\/header>([\s\S]*?)<\/blockquote>/g,
        (m, label, body) =>
          `<blockquote style="margin:1em 0 1.5em;padding:0.5em 1em;border-left:3px solid #dddddd;color:#444444;font-size:0.9375em;"><p style="margin:0;color:#6b7280;font-size:0.875em;">${label}</p>${body.trim().replace(/<p>/g, '<p style="margin:0.5em 0 0;">')}</blockquote>`
      );
  });

  // Post versions — see scripts/snapshot-versions.js and src/_data/versions.js
  eleventyConfig.addFilter("htmlDiff", htmlDiff);

  // The version after a snapshot: the next snapshot that exists (a number can
  // be skipped), or the live post
  eleventyConfig.addFilter("newerVersion", function (snap, all) {
    const later = all
      .filter((p) => p.data.versionOf === snap.data.versionOf && p.data.version > snap.data.version)
      .sort((a, b) => a.data.version - b.data.version);
    return later[0] || all.find((p) => p.inputPath === "./" + snap.data.versionOf);
  });

  // The version footnote (doc.njk) joins the post's own footnotes as the last
  // item, or starts a footnotes section, using markdown-it-footnote's own markup
  const fnOpen = md.renderer.rules.footnote_block_open([], 0, md.options);
  const fnClose = md.renderer.rules.footnote_block_close();
  eleventyConfig.addFilter("withVersionFootnote", function (html, item) {
    const end = html.lastIndexOf(fnClose);
    return end === -1 ? html + fnOpen + item + fnClose : html.slice(0, end) + item + html.slice(end);
  });

  // A version note as a sentence: adds a full stop unless it already ends in one
  const sentence = (text) => (/[.!?]$/.test(text) ? text : text + ".");
  eleventyConfig.addFilter("sentence", sentence);

  // Changes page: what the title, description or tags used to be, in one
  // sentence. parts is [[label, verb, oldValue]] for each that changed; only
  // the first takes the verb ("Before, the title was ~…~ and the tags ~…~.")
  eleventyConfig.addFilter("beforeSentence", function (parts) {
    const esc = (t) => String(t).replace(/[&"'<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[c]);
    const items = parts.map(([label, verb, old], i) => `${label} ${i === 0 ? verb + " " : ""}${old ? `<del>${esc(old)}</del>` : "(none)"}`);
    const list = items.length > 1 ? items.slice(0, -1).join(", ") + " and " + items[items.length - 1] : items[0];
    const last = parts[parts.length - 1][2];
    return `Before, ${list}${last && /[.!?]$/.test(last) ? "" : "."}`;
  });

  // `npm run build` runs scripts/snapshot-versions.js as a prebuild step; the
  // dev server doesn't, so run it before each dev rebuild too. A bump saved in
  // the CMS (local repository mode) then gets its snapshot straight away.
  if (isDev) {
    eleventyConfig.on("eleventy.before", () => {
      require("child_process").execFileSync("node", ["scripts/snapshot-versions.js"], { stdio: "inherit" });
    });
  }

  eleventyConfig.addGlobalData("buildTime", () => new Date());

  // Cache-busting: each build stamps CSS/JS URLs with a new ?v=, so a deploy
  // never pairs fresh HTML with a stale script or stylesheet from the
  // browser cache (GitHub Pages caches assets for 10 minutes).
  const assetVersion = Date.now().toString(36);
  eleventyConfig.addGlobalData("assetVersion", assetVersion);
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const fs = require("fs");
    const main = `${dir.output}/css/main.css`;
    if (!fs.existsSync(main)) return; // dev server serves passthrough from memory
    const css = fs.readFileSync(main, "utf8");
    fs.writeFileSync(main, css.replace(/@import "([^"?]+\.css)";/g, `@import "$1?v=${assetVersion}";`));
  });

  eleventyConfig.addFilter("limit", function (arr, n) {
    return arr.slice(0, n);
  });

  // Collections
  // Sort: dated posts newest first, tie-break by updated desc, undated posts at end
  function sortPosts(posts) {
    return posts.sort((a, b) => {
      const aHasDate = !!a.date;
      const bHasDate = !!b.date;
      if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
      if (aHasDate && bHasDate) {
        const dateDiff = b.date - a.date;
        if (dateDiff !== 0) return dateDiff;
      }
      const aUpdated = a.data.updated ? new Date(a.data.updated) : null;
      const bUpdated = b.data.updated ? new Date(b.data.updated) : null;
      if (aUpdated && bUpdated) {
        const updatedDiff = bUpdated - aUpdated;
        if (updatedDiff !== 0) return updatedDiff;
      } else if (aUpdated) return -1;
      else if (bUpdated) return 1;
      return 0;
    });
  }

  eleventyConfig.addCollection("ideas", function (collectionApi) {
    return sortPosts(filterDrafts(collectionApi.getFilteredByGlob("src/ideas/**/*.md")));
  });

  eleventyConfig.addCollection("notes", function (collectionApi) {
    return sortPosts(filterDrafts(collectionApi.getFilteredByGlob("src/notes/**/*.md")));
  });

  eleventyConfig.addCollection("snaps", function (collectionApi) {
    return sortPosts(filterDrafts(collectionApi.getFilteredByGlob("src/snaps/**/*.md")));
  });

  // Tag pages (src/tags/index.njk) page over this list and render
  // `collections[tag] | published`, so a draft never shows on a tag page and
  // a tag used only by drafts gets no page at all (outside `npm run dev`).
  eleventyConfig.addFilter("published", (posts) => filterDrafts(posts || []));

  eleventyConfig.addCollection("tagList", function (collectionApi) {
    const tags = new Set();
    for (const post of filterDrafts(collectionApi.getAll())) {
      for (const t of post.data.tags || []) if (!COLLECTION_TAGS.includes(t)) tags.add(t);
    }
    return [...tags].sort();
  });

  eleventyConfig.addCollection("feed", function (collectionApi) {
    return sortPosts(filterDrafts([
      ...collectionApi.getFilteredByGlob("src/ideas/**/*.md"),
      ...collectionApi.getFilteredByGlob("src/notes/**/*.md"),
      ...collectionApi.getFilteredByGlob("src/snaps/**/*.md"),
    ]));
  });

  // Frozen earlier versions of posts — not in listings, tags or the feed
  eleventyConfig.addCollection("versions", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/versions/**/*.md");
  });

  // Shortcodes
  eleventyConfig.addShortcode("pagebreak", function () {
    return `<div class="page-break" role="separator"></div>`;
  });

  // Margin note → document comment. Renders a plain note block (readable with
  // no JS, in print, and in feed readers); src/js/comments.js upgrades it into a
  // comment card on the desk (wide screens) or a bottom sheet (narrow ones).
  // Optional first argument is the phrase to highlight in the block right before
  // the note — without it, the whole previous block is the anchor. The card shows
  // the post's date; an optional second argument (any date string) overrides it.
  // To date a note that has no phrase, pass an empty first argument: "", "2026-03-01".
  // Reader views (Readability, Reeder) strip every <aside> and ignore the site
  // CSS, so the note is a <blockquote role="note"> that reads like the feed's
  // version: a "Note on “phrase” · date" label (visually hidden on the site,
  // where the card header shows instead), then the body. The card header is
  // aria-hidden, which also makes reader views drop it.
  const noteLabel = (anchor, when) => ["Note" + (anchor ? ` on “${anchor}”` : ""), when].filter(Boolean).join(" · ");
  const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  eleventyConfig.addPairedShortcode("marginnote", function (content, anchor, written) {
    const commentAuthor = this.ctx.site.author;
    const date = written ? new Date(written) : this.page && this.page.date ? new Date(this.page.date) : null;
    const when = date && !isNaN(date)
      ? `<time datetime="${isoDate(date)}">${readableDate(date)}</time>`
      : "";
    const attr = anchor ? ` data-anchor="${escAttr(anchor)}"` : "";
    const label = noteLabel(anchor && escAttr(anchor), date && !isNaN(date) ? readableDate(date) : "");
    return `<blockquote class="margin-note" role="note"${attr}><p class="margin-note__label"><em>${label}</em></p><header class="margin-note__meta" aria-hidden="true"><span class="margin-note__av" aria-hidden="true">${escAttr(commentAuthor.charAt(0))}</span><b>${escAttr(commentAuthor)}</b>${when}</header>${md.render(content)}</blockquote>`;
  });

  eleventyConfig.addPairedShortcode("callout", function (content, type = "note") {
    return `<div class="callout callout--${type}">${md.render(content)}</div>`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
