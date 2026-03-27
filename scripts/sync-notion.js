#!/usr/bin/env node

/**
 * Sync content from a Notion database into src/{ideas,notes,shots}/.
 *
 * Notion database properties expected:
 *   Title       — Title
 *   Type        — Select     "ideas" | "notes" | "shots"
 *   Tags        — Multi-select (optional)
 *   Description — Text       (optional — used for OG description on ideas)
 *   Status      — Select     only pages with Status = "Ready" are synced
 *
 *   Publication date is taken from the page's built-in "Created time".
 *   Updated date is taken from the page's built-in "Last edited time".
 *
 * Images:
 *   Notion image URLs are signed S3 links that expire in ~1 hour. This script
 *   downloads every image found in the page body to src/images/notion/ and
 *   rewrites the markdown URL to the local path, so images are permanent.
 *
 * Env vars required:
 *   NOTION_TOKEN       — Notion integration token
 *   NOTION_DATABASE_ID — ID of the database to sync from
 */

const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');
const crypto = require('crypto');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const VALID_DIRS  = ['src/ideas', 'src/notes', 'src/shots'];
const IMAGE_DIR   = 'src/images/notion';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Wrap in quotes if value contains YAML special characters
function yamlStr(value) {
  if (!value) return '';
  if (/[:#{}\[\]&*!|>'",%@`]/.test(value) || value.includes('\n')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

// Sanitise body: {# is a Nunjucks comment delimiter — must have a space after {
function sanitiseBody(body) {
  return body.replace(/\{#/g, '{ #');
}

// Build a map of notion_id → filepath by scanning existing synced files
function buildNotionIndex() {
  const index = {};
  for (const dir of VALID_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const filepath = path.join(dir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const match = content.match(/^notion_id:\s*(.+)$/m);
      if (match) index[match[1].trim()] = filepath;
    }
  }
  return index;
}

// Download a single image URL → src/images/notion/{hash}{ext}
// Returns the local web path (/images/notion/...) or null on failure.
// Skips download if the file already exists (idempotent across runs).
function downloadImage(url, redirectCount) {
  if ((redirectCount || 0) > 5) return Promise.resolve(null);

  return new Promise((resolve) => {
    let urlObj;
    try { urlObj = new URL(url); } catch (_) { return resolve(null); }

    // Derive extension from the URL path (strip query string first)
    const rawName = urlObj.pathname.split('/').pop() || '';
    const ext = path.extname(rawName.split('?')[0]).toLowerCase() || '.jpg';
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    const safeExt = allowedExts.includes(ext) ? ext : '.jpg';

    // Stable filename: MD5 of the URL origin+path (query params change on each fetch)
    const stableKey = urlObj.origin + urlObj.pathname;
    const hash = crypto.createHash('md5').update(stableKey).digest('hex').slice(0, 12);
    const filename = `${hash}${safeExt}`;
    const filepath = path.join(IMAGE_DIR, filename);
    const webPath  = `/images/notion/${filename}`;

    // Already downloaded — skip
    if (fs.existsSync(filepath)) return resolve(webPath);

    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    const req = protocol.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close();
        fs.unlink(filepath, () => {});
        return downloadImage(res.headers.location, (redirectCount || 0) + 1).then(resolve);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        return resolve(null);
      }

      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(webPath); });
    });

    req.on('error', () => {
      file.close();
      fs.unlink(filepath, () => {});
      resolve(null);
    });
  });
}

// Find all external image URLs in markdown, download them, rewrite to local paths
async function localiseImages(body) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  // Match ![alt](https://...) — capture alt and url separately
  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  const matches = [];
  let m;
  while ((m = imageRegex.exec(body)) !== null) {
    matches.push({ full: m[0], alt: m[1], url: m[2] });
  }

  for (const item of matches) {
    try {
      const localPath = await downloadImage(item.url);
      if (localPath) {
        body = body.replace(item.full, `![${item.alt}](${localPath})`);
        console.log(`    image  ${localPath}`);
      } else {
        console.warn(`    warn   could not download image: ${item.url.slice(0, 80)}`);
      }
    } catch (err) {
      console.warn(`    warn   image error: ${err.message}`);
    }
  }

  return body;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function sync() {
  if (!process.env.NOTION_TOKEN) {
    console.error('Error: NOTION_TOKEN is not set');
    process.exit(1);
  }
  if (!process.env.NOTION_DATABASE_ID) {
    console.error('Error: NOTION_DATABASE_ID is not set');
    process.exit(1);
  }

  const databaseId = process.env.NOTION_DATABASE_ID;
  const notionIndex = buildNotionIndex();

  let created = 0, updated = 0, skipped = 0;
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: { property: 'Status', select: { equals: 'Ready' } },
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of response.results) {
      try {
        // ── Read properties ──
        const title       = page.properties.Title?.title?.[0]?.plain_text?.trim();
        const date        = page.created_time.split('T')[0];
        const type        = page.properties.Type?.select?.name?.toLowerCase().trim();
        const tags        = (page.properties.Tags?.multi_select || []).map(t => t.name);
        const description = page.properties.Description?.rich_text?.[0]?.plain_text?.trim() || '';
        const updatedDate = page.last_edited_time.split('T')[0];
        const lastEdited  = page.last_edited_time;

        // ── Validate ──
        if (!title || !type) {
          console.log(`  skip  ${page.id} — missing title or type`);
          skipped++; continue;
        }

        const dir = `src/${type}`;
        if (!VALID_DIRS.includes(dir)) {
          console.log(`  skip  "${title}" — unknown type "${type}"`);
          skipped++; continue;
        }

        // ── Check if already synced and unchanged ──
        const existingPath = notionIndex[page.id];
        if (existingPath) {
          const existing = fs.readFileSync(existingPath, 'utf8');
          const lastEditedMatch = existing.match(/^notion_last_edited:\s*(.+)$/m);
          if (lastEditedMatch && lastEditedMatch[1].trim() === lastEdited) {
            skipped++; continue;
          }
        }

        // ── Convert Notion blocks → markdown ──
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const mdResult = n2m.toMarkdownString(mdBlocks);
        const rawBody  = typeof mdResult === 'string' ? mdResult : (mdResult?.parent || '');

        // ── Download images and rewrite URLs to local paths ──
        const body = await localiseImages(sanitiseBody(rawBody).trim());

        // ── Build front matter ──
        const fm = [
          '---',
          `title: ${yamlStr(title)}`,
          `date: ${date}`,
        ];
        if (updatedDate)  fm.push(`updated: ${updatedDate}`);
        if (description)  fm.push(`description: ${yamlStr(description)}`);
        if (tags.length) {
          fm.push('tags:');
          tags.forEach(t => fm.push(`  - ${t}`));
        }
        fm.push(`notion_id: ${page.id}`);
        fm.push(`notion_last_edited: ${lastEdited}`);
        fm.push('---');

        const fileContent = fm.join('\n') + '\n\n' + body + '\n';

        // ── Write file ──
        let filepath;
        if (existingPath) {
          filepath = existingPath;
        } else {
          const slug     = slugify(title);
          const filename = `${date}-${slug}.md`;
          fs.mkdirSync(dir, { recursive: true });
          filepath = path.join(dir, filename);
        }

        fs.writeFileSync(filepath, fileContent);

        if (existingPath) {
          console.log(`  update  ${filepath}`);
          updated++;
        } else {
          notionIndex[page.id] = filepath;
          console.log(`  create  ${filepath}`);
          created++;
        }

      } catch (err) {
        console.error(`  error   page ${page.id}: ${err.message}`);
      }
    }

    cursor = response.next_cursor;
  } while (cursor);

  console.log(`\nDone — ${created} created, ${updated} updated, ${skipped} skipped`);
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
