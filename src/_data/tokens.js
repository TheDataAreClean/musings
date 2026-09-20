// Design tokens, read straight from src/css/tokens.css at build time so the
// /style/ page can never drift from the real values. Only the first :root
// block is read — the mobile overrides in the media query are documented on
// the page in words.
//
// Conventions this relies on (see APP.md): a `/* Group title — note */`
// comment (one or more lines) starts a group, and each token is
// `--name: value; /* note */` on one line. Anything else in the block
// throws, so a broken tokens.css fails the build instead of mis-grouping.
const fs = require("fs");
const path = require("path");

module.exports = function () {
  const css = fs.readFileSync(path.join(__dirname, "..", "css", "tokens.css"), "utf8");
  const start = css.indexOf(":root {");
  if (start < 0) throw new Error("tokens.js: no :root block found in tokens.css");
  const root = css.slice(start, css.indexOf("}", start));

  const all = [];
  let group = "";
  let comment = ""; // a comment being read across several lines

  for (const raw of root.split("\n")) {
    const line = raw.trim();

    // A comment on its own line(s) starts a group: "/* Title — note */".
    // (Token lines start with "--", so their trailing notes never get here.)
    if (comment || line.startsWith("/*")) {
      comment += " " + line;
      if (!line.includes("*/")) continue;
      group = comment.replace(/\/\*|\*\//g, "").trim().split(" — ")[0].trim();
      comment = "";
      continue;
    }

    if (line === "" || line === ":root {") continue;

    const m = line.match(/^(--[\w-]+):\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?$/);
    if (!m) throw new Error("tokens.js: can't read this line of tokens.css: " + line);
    if (!group) throw new Error("tokens.js: " + m[1] + " appears before any group comment in tokens.css");
    all.push({ name: m[1], value: m[2].trim(), note: m[3] || "", group });
  }
  if (comment) throw new Error("tokens.js: unclosed comment in tokens.css");

  // calc(var(--a) + var(--b) …) of px tokens → show the sum, keep the formula
  const px = Object.fromEntries(all.filter((t) => /^\d+(\.\d+)?px$/.test(t.value)).map((t) => [t.name, parseFloat(t.value)]));
  for (const t of all) {
    const m = t.value.match(/^calc\((.+)\)$/);
    if (!m) continue;
    const parts = m[1].split(" + ").map((p) => (p.match(/^var\((--[\w-]+)\)$/) || [])[1]);
    if (parts.every((n) => n in px)) {
      t.formula = t.value;
      t.value = parts.reduce((sum, n) => sum + px[n], 0) + "px";
    }
  }

  const named = (prefix) => all.filter((t) => t.name.startsWith(prefix));
  const colors = named("--color-");

  return {
    colorGroups: [...new Set(colors.map((t) => t.group))].map((title) => ({
      title,
      tokens: colors.filter((t) => t.group === title),
    })),
    fonts: named("--font-"),
    text: named("--text-"),
    leading: named("--leading-"),
    space: named("--space-"),
    dimensions: all.filter((t) => /^--(page|comment|titlebar|menubar|toolbar|ruler|statusbar|chrome)/.test(t.name)),
  };
};
