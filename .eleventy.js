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
  eleventyConfig.addPassthroughCopy("src/CNAME");

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
    const d = new Date(date);
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("isoDate", function (date) {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  });

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
  eleventyConfig.addCollection("ideas", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/ideas/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("notes", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/notes/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("shots", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/shots/**/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("feed", function (collectionApi) {
    return [
      ...collectionApi.getFilteredByGlob("src/ideas/**/*.md"),
      ...collectionApi.getFilteredByGlob("src/notes/**/*.md"),
      ...collectionApi.getFilteredByGlob("src/shots/**/*.md"),
    ].sort((a, b) => b.date - a.date);
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
