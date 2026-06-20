import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('src');

const REPLACEMENTS = [
  ['bg-white', 'bg-white dark:bg-gray-800'],
  ['bg-gray-50', 'bg-gray-50 dark:bg-gray-900'],
  ['bg-gray-100', 'bg-gray-100 dark:bg-gray-900'],
  ['bg-gray-200', 'bg-gray-200 dark:bg-gray-700'],
  ['bg-gray-300', 'bg-gray-300 dark:bg-gray-600'],
  ['text-gray-900', 'text-gray-900 dark:text-gray-100'],
  ['text-gray-800', 'text-gray-800 dark:text-gray-200'],
  ['text-gray-700', 'text-gray-700 dark:text-gray-300'],
  ['text-gray-600', 'text-gray-600 dark:text-gray-400'],
  ['text-gray-500', 'text-gray-500 dark:text-gray-400'],
  ['border-gray-200', 'border-gray-200 dark:border-gray-700'],
  ['border-gray-300', 'border-gray-300 dark:border-gray-700'],
  ['border-gray-100', 'border-gray-100 dark:border-gray-800'],
  ['hover:bg-gray-50', 'hover:bg-gray-50 dark:hover:bg-gray-800'],
  ['hover:bg-gray-100', 'hover:bg-gray-100 dark:hover:bg-gray-800'],
  ['hover:bg-gray-200', 'hover:bg-gray-200 dark:hover:bg-gray-700'],
  ['hover:text-gray-900', 'hover:text-gray-900 dark:hover:text-gray-100'],
  ['hover:text-gray-700', 'hover:text-gray-700 dark:hover:text-gray-300'],
  ['divide-gray-200', 'divide-gray-200 dark:divide-gray-700'],
  ['ring-gray-200', 'ring-gray-200 dark:ring-gray-700'],
  ['shadow-sm', 'shadow-sm dark:shadow-none'],
];

const DARK_PREFIX = {
  'bg-white': 'dark:bg-',
  'bg-gray-50': 'dark:bg-',
  'bg-gray-100': 'dark:bg-',
  'bg-gray-200': 'dark:bg-',
  'bg-gray-300': 'dark:bg-',
  'text-gray-900': 'dark:text-',
  'text-gray-800': 'dark:text-',
  'text-gray-700': 'dark:text-',
  'text-gray-600': 'dark:text-',
  'text-gray-500': 'dark:text-',
  'border-gray-200': 'dark:border-',
  'border-gray-300': 'dark:border-',
  'border-gray-100': 'dark:border-',
  'hover:bg-gray-50': 'dark:hover:bg-',
  'hover:bg-gray-100': 'dark:hover:bg-',
  'hover:bg-gray-200': 'dark:hover:bg-',
  'hover:text-gray-900': 'dark:hover:text-',
  'hover:text-gray-700': 'dark:hover:text-',
  'divide-gray-200': 'dark:divide-',
  'ring-gray-200': 'dark:ring-',
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function patchLine(line) {
  let next = line;
  for (const [from, to] of REPLACEMENTS) {
    const darkPrefix = DARK_PREFIX[from];
    if (darkPrefix && next.includes(darkPrefix)) continue;
    if (!next.includes(from)) continue;
    next = next.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to);
  }
  return next;
}

function dedupeDarkClasses(content) {
  return content.replace(
    /\b(dark:(?:bg|text|border|hover|divide|ring)-[^\s"'`]+)\s+\1\b/g,
    '$1'
  );
}

function patchFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const patched = dedupeDarkClasses(
    original
      .split('\n')
      .map(patchLine)
      .join('\n')
  );
  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    return true;
  }
  return false;
}

const files = walk(ROOT);
let changed = 0;
for (const file of files) {
  if (patchFile(file)) changed += 1;
}
console.log(`Updated ${changed} files`);
