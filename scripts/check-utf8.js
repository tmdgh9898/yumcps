const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'uploads']);
const TEXT_EXT = new Set(['.js', '.jsx', '.json', '.css', '.html', '.yml', '.yaml', '.md', '.env', '.example']);

function isTextFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (TEXT_EXT.has(ext)) return true;
  const base = path.basename(file);
  return base.startsWith('.env');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else {
      const fullPath = path.join(dir, entry.name);
      if (isTextFile(fullPath)) out.push(fullPath);
    }
  }
  return out;
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

let failed = false;
const files = walk(ROOT);
for (const file of files) {
  const buf = fs.readFileSync(file);
  if (hasUtf8Bom(buf)) {
    failed = true;
    console.error(`BOM detected: ${path.relative(ROOT, file)}`);
  }
  try {
    buf.toString('utf8');
  } catch (error) {
    failed = true;
    console.error(`Invalid UTF-8: ${path.relative(ROOT, file)} (${error.message})`);
  }
}

if (failed) {
  console.error('UTF-8 check failed');
  process.exit(1);
}

console.log(`UTF-8 check passed (${files.length} files)`);
