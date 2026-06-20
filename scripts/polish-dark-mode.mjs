import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

const REPLACEMENTS = [
  // Cards: use semantic surface + subtle border
  [
    'bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-none p-4 mb-4 border border-transparent dark:border-gray-700',
    'bg-card rounded-xl shadow-sm p-4 mb-4 border border-border',
  ],
  [
    'bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 relative border border-transparent dark:border-gray-700',
    'bg-card rounded-xl shadow-sm p-4 mb-4 relative border border-border',
  ],
  [
    'mb-4 rounded-lg bg-white dark:bg-gray-800 p-4 shadow border border-transparent dark:border-gray-700',
    'mb-4 rounded-xl bg-card p-4 shadow-sm border border-border',
  ],
  [
    'rounded-lg bg-white dark:bg-gray-800 p-6 text-center text-sm text-gray-500 dark:text-gray-400 shadow border border-transparent dark:border-gray-700',
    'rounded-xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm border border-border',
  ],
  // Remove wrong static dark bg on interactive rows
  ['hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-700', 'hover:bg-muted'],
  ['hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900', 'hover:bg-muted'],
  ['hover:bg-gray-100 dark:hover:bg-gray-700', 'hover:bg-muted'],
  ['hover:bg-gray-100 dark:hover:bg-gray-800', 'hover:bg-muted'],
  // Inputs
  [
    'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-400',
    'bg-muted hover:bg-muted/80 rounded-full text-muted-foreground',
  ],
  [
    'bg-gray-100 dark:bg-gray-800 rounded-full py-2 pl-9 pr-9 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 outline-none focus:bg-gray-200 dark:focus:bg-gray-700',
    'bg-muted rounded-full py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80',
  ],
  // Account / panels
  [
    'absolute top-full right-0 mt-2 w-[360px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
    'absolute top-full right-0 mt-2 w-[360px] bg-popover rounded-xl shadow-2xl border border-border overflow-hidden',
  ],
  [
    'fixed top-14 right-4 w-[360px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50',
    'fixed top-14 right-4 w-[360px] bg-popover rounded-xl shadow-2xl border border-border z-50',
  ],
  [
    'fixed top-14 right-4 w-[680px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50',
    'fixed top-14 right-4 w-[680px] bg-popover rounded-xl shadow-2xl border border-border z-50',
  ],
  // Notification unread
  [
    "notification.isUnread ? 'bg-blue-50 dark:bg-blue-900/20' : ''",
    "notification.isUnread ? 'bg-accent' : ''",
  ],
];

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (patchFile(file)) changed += 1;
}
console.log(`Polished ${changed} files`);
