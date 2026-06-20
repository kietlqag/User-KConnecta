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
  ['min-h-screen bg-gray-50 dark:bg-gray-900', 'min-h-screen bg-gray-50 dark:bg-background'],
  ['bg-gray-100 dark:bg-gray-900 flex min-h-0', 'bg-gray-100 dark:bg-background flex min-h-0'],
  ['bg-gray-100 dark:bg-gray-900">', 'bg-gray-100 dark:bg-background">'],
  ['fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm', 'fixed top-0 left-0 right-0 bg-background shadow-sm'],
  ['<h2 className="text-2xl font-bold mb-3">Menu</h2>', '<h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Menu</h2>'],
  ['className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-full text-sm outline-none focus:bg-gray-200 transition-colors"', 'className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 text-foreground placeholder:text-muted-foreground rounded-full text-sm outline-none focus:bg-gray-200 dark:focus:bg-gray-700 transition-colors"'],
  ['<h2 className="text-xl font-bold mb-4">Lựa chọn hôm nay</h2>', '<h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Lựa chọn hôm nay</h2>'],
  ['<p className="text-gray-400 text-lg">', '<p className="text-gray-400 dark:text-gray-500 text-lg">'],
  ['mainSection === \'dashboard\' ? \'bg-blue-50 text-gray-900 dark:text-gray-100\' : \'hover:bg-gray-100 dark:hover:bg-gray-800', "mainSection === 'dashboard' ? 'bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100' : 'hover:bg-gray-100 dark:hover:bg-gray-800"],
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
console.log(`Patched ${changed} files`);
