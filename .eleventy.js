const markdownIt = require("markdown-it");
const markdownItFootnote = require("markdown-it-footnote");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItAttrs = require("markdown-it-attrs");

module.exports = function (eleventyConfig) {
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
    .use(markdownItAttrs);

  eleventyConfig.setLibrary("md", md);

  // Passthrough copies
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/apple-touch-icon.png");
  eleventyConfig.addPassthroughCopy("src/favicon-512.png");
  eleventyConfig.addPassthroughCopy("src/manifest.json");

  // Filters
  eleventyConfig.addFilter("wordcount", function (content) {
    if (!content) return 0;
    const text = content.replace(/<[^>]*>/g, " ");
    return text.split(/\s+/).filter(Boolean).length;
  });

  eleventyConfig.addFilter("readtime", function (content) {
    if (!content) return 1;
    const text = content.replace(/<[^>]*>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  eleventyConfig.addFilter("readableDate", function (date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });
  });

  eleventyConfig.addFilter("isoDate", function (date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  });

  eleventyConfig.addFilter("atomDate", function (date) {
    if (!date) return "";
    return new Date(date).toISOString();
  });

  eleventyConfig.addGlobalData("buildTime", () => new Date());

  eleventyConfig.addFilter("groupByYear", function (posts) {
    const groups = {};
    posts.forEach((post) => {
      const year = new Date(post.data.date).getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year].push(post);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b - a)
      .map(([year, items]) => ({ year, items }));
  });

  eleventyConfig.addFilter("excerpt", function (content) {
    if (!content) return "";
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text.slice(0, 200) + (text.length > 200 ? "…" : "");
  });

  eleventyConfig.addFilter("limit", function (arr, n) {
    return arr.slice(0, n);
  });

  eleventyConfig.addFilter("offset", function (arr, n) {
    return arr.slice(n);
  });

  eleventyConfig.addFilter("findIndex", function (arr, page) {
    return arr.findIndex((p) => p.url === page.url);
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
    return sortPosts(collectionApi.getFilteredByGlob("src/ideas/**/*.md"));
  });

  eleventyConfig.addCollection("notes", function (collectionApi) {
    return sortPosts(collectionApi.getFilteredByGlob("src/notes/**/*.md"));
  });

  eleventyConfig.addCollection("snaps", function (collectionApi) {
    return sortPosts(collectionApi.getFilteredByGlob("src/snaps/**/*.md"));
  });

  eleventyConfig.addCollection("feed", function (collectionApi) {
    return sortPosts([
      ...collectionApi.getFilteredByGlob("src/ideas/**/*.md"),
      ...collectionApi.getFilteredByGlob("src/notes/**/*.md"),
      ...collectionApi.getFilteredByGlob("src/snaps/**/*.md"),
    ]);
  });

  // Shortcodes
  eleventyConfig.addShortcode("pagebreak", function () {
    return `<div class="page-break" role="separator"></div>`;
  });

  eleventyConfig.addPairedShortcode("marginnote", function (content) {
    return `<aside class="margin-note">${md.render(content)}</aside>`;
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
