// Earlier versions of posts (written by scripts/snapshot-versions.js). Each
// lives under its post's current URL, so a slug change moves them too.
const { livePost } = require("../../scripts/content.js");

module.exports = {
  layout: "layouts/doc.njk",
  eleventyComputed: {
    permalink: (data) => `${livePost(data.versionOf).url}v${data.version}/`,
  },
};
