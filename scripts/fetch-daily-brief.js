#!/usr/bin/env node
// Fetches the latest Daily Brief from Notion and saves it as a dated Markdown file
// under src/content/daily-brief/YYYY-MM-DD.md
//
// Required env: NOTION_TOKEN
// Run: node scripts/fetch-daily-brief.js

import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// The parent "DailyBriefs" page that contains all daily brief child pages
const DAILY_BRIEFS_PARENT_ID = "32cbf6223c3980d6a854c2789e6d7d27";

async function getLatestBriefPage() {
  const response = await notion.blocks.children.list({
    block_id: DAILY_BRIEFS_PARENT_ID,
    page_size: 100,
  });

  const pages = response.results
    .filter((block) => block.type === "child_page")
    .filter((block) => !block.child_page.title.toLowerCase().includes("delete"));

  if (pages.length === 0) {
    throw new Error("No child pages found in DailyBriefs");
  }

  return pages[pages.length - 1];
}

async function fetchBriefContent(pageId) {
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const { parent: content } = n2m.toMarkdownString(mdBlocks);

  // Strip the personal "Your Day" section and everything after it
  const cutoff = content.indexOf("# 📅 Your Day");
  return cutoff !== -1 ? content.substring(0, cutoff).trim() : content.trim();
}

function extractDate(content) {
  // Try "📅 Weekday, Month DD, YYYY" pattern from the brief header
  const match = content.match(/📅\s+\w+,\s+(\w+\s+\d+,\s+\d{4})/);
  if (match) {
    const d = new Date(match[1]);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }
  // Fallback: today's date
  return new Date().toISOString().split("T")[0];
}

function formatDate(isoDate) {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    console.error("NOTION_TOKEN env variable is required");
    process.exit(1);
  }

  const latestPage = await getLatestBriefPage();
  console.log(`Found: "${latestPage.child_page.title}" (${latestPage.id})`);

  const content = await fetchBriefContent(latestPage.id);
  const date = extractDate(content);
  const dateFormatted = formatDate(date);

  const outDir = join(__dirname, "../src/content/daily-brief");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, `${date}.md`);

  if (existsSync(outPath)) {
    console.log(`Already exists: ${outPath} — overwriting with latest content`);
  }

  const frontmatter = [
    "---",
    `title: "Daily Brief — ${dateFormatted}"`,
    `date: "${date}"`,
    `dateFormatted: "${dateFormatted}"`,
    "---",
    "",
    "",
  ].join("\n");

  writeFileSync(outPath, frontmatter + content + "\n");
  console.log(`Saved: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
