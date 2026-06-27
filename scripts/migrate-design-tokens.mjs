/**
 * Migrates hardcoded Tailwind gray utilities to semantic design tokens.
 * Run: node scripts/migrate-design-tokens.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/** Longest-first so compound patterns win over singles. */
const REPLACEMENTS = [
  // ── Background (light + dark pairs) ──
  ['bg-white dark:bg-gray-800', 'bg-card'],
  ['bg-white dark:bg-gray-900', 'bg-card'],
  ['bg-gray-50 dark:bg-gray-900', 'bg-background'],
  ['bg-gray-100 dark:bg-gray-900', 'bg-background'],
  ['bg-gray-100 dark:bg-background', 'bg-background'],
  ['bg-gray-50 dark:bg-gray-800', 'bg-muted'],
  ['bg-gray-100 dark:bg-gray-800', 'bg-muted'],
  ['bg-gray-200 dark:bg-gray-700', 'bg-muted'],
  ['bg-gray-200 dark:bg-gray-800', 'bg-muted'],
  ['bg-gray-800 dark:bg-gray-700', 'bg-card'],
  ['bg-gray-700 dark:bg-gray-600', 'bg-muted'],

  // ── Text (light + dark pairs) ──
  ['text-gray-900 dark:text-white', 'text-foreground'],
  ['text-gray-900 dark:text-gray-100', 'text-foreground'],
  ['text-gray-900 dark:text-gray-50', 'text-foreground'],
  ['text-gray-800 dark:text-gray-100', 'text-foreground'],
  ['text-gray-800 dark:text-white', 'text-foreground'],
  ['text-gray-700 dark:text-gray-300', 'text-foreground'],
  ['text-gray-700 dark:text-gray-200', 'text-foreground'],
  ['text-gray-600 dark:text-gray-400', 'text-muted-foreground'],
  ['text-gray-600 dark:text-gray-300', 'text-muted-foreground'],
  ['text-gray-500 dark:text-gray-400', 'text-muted-foreground'],
  ['text-gray-500 dark:text-gray-500', 'text-muted-foreground'],
  ['text-gray-400 dark:text-gray-500', 'text-muted-foreground'],
  ['text-gray-400 dark:text-gray-400', 'text-muted-foreground'],

  // ── Border (light + dark pairs) ──
  ['border-gray-200 dark:border-gray-700', 'border-border'],
  ['border-gray-300 dark:border-gray-700', 'border-border'],
  ['border-gray-300 dark:border-gray-600', 'border-border'],
  ['border-gray-100 dark:border-gray-800', 'border-border'],
  ['border-gray-200 dark:border-gray-800', 'border-border'],
  ['border-gray-100 dark:border-gray-700', 'border-border'],
  ['border-white dark:border-gray-800', 'border-border'],
  ['divide-gray-200 dark:divide-gray-700', 'divide-border'],

  // ── Hover (light + dark pairs) ──
  ['hover:bg-gray-100 dark:hover:bg-gray-800', 'hover:bg-muted'],
  ['hover:bg-gray-100 dark:hover:bg-gray-900', 'hover:bg-muted'],
  ['hover:bg-gray-50 dark:hover:bg-gray-800', 'hover:bg-muted'],
  ['hover:bg-gray-200 dark:hover:bg-gray-700', 'hover:bg-muted'],
  ['hover:bg-gray-200 dark:hover:bg-gray-800', 'hover:bg-muted'],
  ['hover:bg-gray-300 dark:hover:bg-gray-600', 'hover:bg-muted'],
  ['hover:text-gray-900 dark:hover:text-gray-300', 'hover:text-foreground'],
  ['hover:text-gray-700 dark:hover:text-gray-300', 'hover:text-foreground'],
  ['hover:text-gray-600 dark:hover:text-gray-300', 'hover:text-muted-foreground'],
  ['hover:text-gray-600 dark:hover:text-gray-400', 'hover:text-muted-foreground'],

  // ── Focus / ring ──
  ['focus:bg-gray-100 dark:focus:bg-gray-800', 'focus:bg-muted'],
  ['focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600', 'focus-visible:ring-ring'],

  // ── Primary CTA (brand consistency) ──
  ['bg-blue-600 hover:bg-blue-700', 'bg-primary hover:bg-primary/90'],
  ['bg-green-600 hover:bg-green-700', 'bg-primary hover:bg-primary/90'],
  ['bg-green-700 hover:bg-green-800', 'bg-primary hover:bg-primary/90'],
  ['text-blue-600 dark:text-blue-400', 'text-primary'],
  ['text-green-600 dark:text-green-400', 'text-primary'],

  // ── Single utilities (semantic tokens) ──
  ['bg-gray-100', 'bg-muted'],
  ['bg-gray-50', 'bg-muted'],
  ['bg-gray-200', 'bg-muted'],
  ['bg-gray-300', 'bg-muted'],
  ['text-gray-900', 'text-foreground'],
  ['text-gray-800', 'text-foreground'],
  ['text-gray-700', 'text-foreground'],
  ['text-gray-600', 'text-muted-foreground'],
  ['text-gray-500', 'text-muted-foreground'],
  ['text-gray-400', 'text-muted-foreground'],
  ['border-gray-300', 'border-border'],
  ['border-gray-200', 'border-border'],
  ['border-gray-100', 'border-border'],
  ['hover:bg-gray-100', 'hover:bg-muted'],
  ['hover:bg-gray-50', 'hover:bg-muted'],
  ['hover:bg-gray-200', 'hover:bg-muted'],
  ['hover:text-gray-900', 'hover:text-foreground'],
  ['hover:text-gray-700', 'hover:text-foreground'],
  ['hover:text-gray-600', 'hover:text-muted-foreground'],

  // ── Redundant dark: overrides (tokens handle theme) ──
  [' dark:bg-gray-900', ''],
  [' dark:bg-gray-800', ''],
  [' dark:bg-gray-700', ''],
  [' dark:hover:bg-gray-900', ''],
  [' dark:hover:bg-gray-800', ''],
  [' dark:hover:bg-gray-700', ''],
  [' dark:text-gray-100', ''],
  [' dark:text-gray-50', ''],
  [' dark:text-gray-400', ''],
  [' dark:text-gray-300', ''],
  [' dark:text-gray-500', ''],
  [' dark:border-gray-700', ''],
  [' dark:border-gray-600', ''],
  [' dark:border-gray-800', ''],
  [' dark:divide-gray-700', ''],

  // ── Pass 2: orphan dark + remaining grays ──
  [' dark:bg-gray-600', ''],
  [' dark:hover:bg-gray-600', ''],
  [' dark:hover:bg-gray-700', ''],
  [' dark:focus:bg-gray-700', ''],
  [' dark:text-gray-200', ''],
  ['text-gray-300', 'text-muted-foreground'],
  ['bg-gray-800/50', 'bg-black/50'],
  ['hover:bg-gray-700/80', 'hover:bg-black/60'],
  ['bg-gray-800/30', 'bg-black/30'],
  ['bg-gray-900', 'bg-black'],
  ['bg-gray-800', 'bg-card'],
  ['hover:bg-gray-800', 'hover:bg-muted'],
  ['hover:bg-gray-700', 'hover:bg-muted'],
  ['focus:bg-gray-800', 'focus:bg-muted'],
  ['border-gray-700', 'border-border'],
  ['border-gray-600', 'border-border'],
  ['border-gray-700/40', 'border-border/40'],
  ['divide-gray-700', 'divide-border'],
  ['bg-white', 'bg-card'],
];

const SKIP_FILES = new Set([
  // Keep legacy gray shim definitions
  join(SRC, 'styles', 'globals.css'),
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (['.tsx', '.ts', '.jsx', '.js'].includes(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function migrate(content) {
  let result = content;
  for (const [from, to] of REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  // Collapse duplicate spaces in className strings
  result = result.replace(/className="([^"]*)"/g, (_, classes) => {
    const cleaned = classes.replace(/\s{2,}/g, ' ').trim();
    return `className="${cleaned}"`;
  });
  result = result.replace(/className=\{`([^`]*)`\}/g, (_, classes) => {
    const cleaned = classes.replace(/\s{2,}/g, ' ').trim();
    return `className={\`${cleaned}\`}`;
  });
  result = result.replace(/className=\{cn\(([^)]*)\)\}/g, (match) =>
    match.replace(/\s{2,}/g, ' '),
  );
  return result;
}

const files = await walk(SRC);
let changed = 0;

for (const file of files) {
  if (SKIP_FILES.has(file)) continue;
  const before = await readFile(file, 'utf8');
  const after = migrate(before);
  if (after !== before) {
    await writeFile(file, after, 'utf8');
    changed += 1;
    console.log('updated:', file.replace(SRC, 'src'));
  }
}

console.log(`\nDone. ${changed} file(s) updated.`);
