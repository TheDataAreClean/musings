module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      if (!data.slug) return undefined;
      const fileSlug = data.page?.fileSlug || "";
      const dateMatch = fileSlug.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return undefined;
      return `/snaps/${dateMatch[1]}-${data.slug}/`;
    },
  },
};
