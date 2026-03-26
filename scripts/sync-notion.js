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
 * Env vars required:
 *   NOTION_TOKEN       — Notion integration token
 *   NOTION_DATABASE_ID — ID of the database to sync from
 */

const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const VALID_DIRS = ['src/ideas', 'src/notes', 'src/shots'];

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
        const body     = sanitiseBody(rawBody).trim();

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
