#!/usr/bin/env node
/**
 * Export Cursor agent transcripts for this repo to a readable Markdown file.
 * Transcripts live in: ~/.cursor/projects/<project>/agent-transcripts/
 */
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const TRANSCRIPTS_DIR = join(
  process.env.HOME || process.env.USERPROFILE,
  '.cursor/projects/Users-andre-Documents-Code-speakeasy-frontend-test-agiron123/agent-transcripts'
);
const OUTPUT_PATH = join(process.cwd(), 'cursor-chats-export.md');

function extractText(msg) {
  if (!msg?.content) return '';
  return msg.content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n');
}

function stripUserQueryTag(text) {
  return text.replace(/^<user_query>\s*/i, '').replace(/\s*<\/user_query>$/i, '').trim();
}

async function main() {
  const dirs = await readdir(TRANSCRIPTS_DIR, { withFileTypes: true });
  const transcriptDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

  const allChats = [];

  for (const id of transcriptDirs) {
    const jsonlPath = join(TRANSCRIPTS_DIR, id, `${id}.jsonl`);
    let content;
    try {
      content = await readFile(jsonlPath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n').filter(Boolean);
    const messages = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const text = extractText(entry.message);
        if (!text) continue;
        const isUser = entry.role === 'user';
        messages.push({
          role: entry.role,
          text: isUser ? stripUserQueryTag(text) : text,
        });
      } catch {
        // skip malformed lines
      }
    }

    const title =
      messages.find((m) => m.role === 'user')?.text?.slice(0, 80)?.replace(/\n/g, ' ') || id;

    allChats.push({ id, title, messages });
  }

  // Sort by first message (rough chronological order - folder names are UUIDs, so use file mtime would be better but we'll keep it simple)
  const md = ['# Cursor Chats Export\n', `Exported: ${new Date().toISOString()}\n`];

  for (const chat of allChats) {
    md.push(`\n---\n\n## Chat: ${chat.title}\n`);
    md.push(`*ID: \`${chat.id}\`*\n`);

    for (const m of chat.messages) {
      const label = m.role === 'user' ? '**You**' : '**Assistant**';
      md.push(`\n### ${label}\n\n`);
      md.push(m.text);
      md.push('\n');
    }
  }

  await writeFile(OUTPUT_PATH, md.join(''), 'utf-8');
  console.log(`Exported ${allChats.length} chats to ${OUTPUT_PATH}`);
}

main().catch(console.error);
