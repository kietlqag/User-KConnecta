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
  // Wrong static dark bg on hover-only controls
  ['hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900', 'hover:bg-gray-100 dark:hover:bg-gray-800'],
  ['hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900', 'hover:bg-gray-50 dark:hover:bg-gray-800'],
  // Unify page backgrounds
  ['min-h-screen bg-gray-100 dark:bg-gray-900', 'min-h-screen bg-gray-100 dark:bg-background'],
  ['bg-gray-100 dark:bg-gray-900 flex flex-col', 'bg-gray-100 dark:bg-background flex flex-col'],
  // Active nav states
  ["active === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'", "active === item.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ["active === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900'", "active === item.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ["activeCollection === 'all' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900'", "activeCollection === 'all' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ["activeCollection === col.id ? 'bg-blue-50' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900'", "activeCollection === col.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ["index === currentAuthorIndex ? 'bg-blue-50' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900'", "index === currentAuthorIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ["isSelected ? 'bg-blue-50' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900'", "isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ["selected ? 'bg-emerald-50' : 'hover:bg-gray-100'", "selected ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  // Search inputs missing text color
  ['bg-gray-100 dark:bg-gray-900 rounded-full outline-none focus:bg-gray-200', 'bg-gray-100 dark:bg-gray-900 text-foreground placeholder:text-muted-foreground rounded-full outline-none focus:bg-gray-200 dark:focus:bg-gray-700'],
  ['bg-gray-100 dark:bg-gray-900 rounded-full outline-none focus:bg-gray-200 transition-colors', 'bg-gray-100 dark:bg-gray-900 text-foreground placeholder:text-muted-foreground rounded-full outline-none focus:bg-gray-200 dark:focus:bg-gray-700 transition-colors'],
  // Settings sidebar
  ["className=\"w-[300px] bg-white border-r border-gray-200", "className=\"w-[300px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"],
  ["active === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800'", "active === item.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"],
  ['font-medium ${active === item.id ? \'text-blue-600\' : \'text-gray-900 dark:text-gray-100\'}', 'font-medium ${active === item.id ? \'text-blue-600 dark:text-blue-400\' : \'text-gray-900 dark:text-gray-100\'}'],
];

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
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
console.log(`Cleaned ${changed} files`);
