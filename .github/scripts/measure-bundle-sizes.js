const fs = require('fs');
const path = require('path');

const outputPath = process.argv[2];

if (!outputPath) {
  console.error(
    'Usage: node .github/scripts/measure-bundle-sizes.js <output-path>',
  );
  process.exit(1);
}

const rootDir = process.cwd();
const sizes = {};

function normalizePath(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function shouldTrack(filePath) {
  const normalizedPath = normalizePath(filePath);

  if (normalizedPath.startsWith('packages/packer/dist/')) {
    return false;
  }

  return /(^|\/)dist\/[^/]+\.(js|cjs|mjs|css)$/.test(normalizedPath);
}

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules') {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }

    if (!shouldTrack(entryPath)) {
      continue;
    }

    sizes[normalizePath(entryPath)] = fs.statSync(entryPath).size;
  }
}

walk(rootDir);
fs.writeFileSync(outputPath, `${JSON.stringify(sizes, null, 2)}\n`);
