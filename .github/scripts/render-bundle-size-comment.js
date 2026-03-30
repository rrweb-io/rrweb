const fs = require('fs');

const prPath = process.argv[2];
const basePath = process.argv[3];

if (!prPath || !basePath) {
  console.error(
    'Usage: node .github/scripts/render-bundle-size-comment.js <pr-sizes.json> <base-sizes.json>',
  );
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatSize(bytes) {
  if (bytes == null) {
    return '-';
  }

  if (Math.abs(bytes) < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(2)} kB`;
}

function formatSignedSize(bytes) {
  const absoluteBytes = Math.abs(bytes);

  if (absoluteBytes < 1024) {
    return `${bytes >= 0 ? '+' : '-'}${absoluteBytes} B`;
  }

  return `${bytes >= 0 ? '+' : '-'}${(absoluteBytes / 1024).toFixed(2)} kB`;
}

function formatDiff(diff, baseValue) {
  if (diff === 0) {
    return '-';
  }

  const percentage =
    baseValue > 0
      ? ` (${diff > 0 ? '+' : ''}${((diff / baseValue) * 100).toFixed(2)}%)`
      : '';

  return `${formatSignedSize(diff)}${percentage}`;
}

const BUNDLE_SIZE_BADGES = {
  deleted: ' 🗑️',
  new: ' 🆕',
  improved: ' 🎉',
  investigate: ' 🔍',
};

function getChangeBadge(prValue, baseValue) {
  if (prValue == null) {
    return BUNDLE_SIZE_BADGES.deleted;
  }

  if (baseValue == null) {
    return BUNDLE_SIZE_BADGES.new;
  }

  if (baseValue <= 0) {
    return '';
  }

  const percentage = ((prValue - baseValue) / baseValue) * 100;

  if (percentage <= -10) {
    return BUNDLE_SIZE_BADGES.improved;
  }

  if (percentage >= 5) {
    return BUNDLE_SIZE_BADGES.investigate;
  }

  return '';
}

function getPackageBadge(prTotal, baseTotal) {
  if (baseTotal === 0 && prTotal > 0) {
    return BUNDLE_SIZE_BADGES.new;
  }

  if (baseTotal <= 0) {
    return '';
  }

  const percentage = ((prTotal - baseTotal) / baseTotal) * 100;

  if (percentage <= -10) {
    return BUNDLE_SIZE_BADGES.improved;
  }

  if (percentage >= 5) {
    return BUNDLE_SIZE_BADGES.investigate;
  }

  return '';
}

function getPackageName(filePath) {
  const match = filePath.match(/^packages\/([^/]+)\//);
  return match ? match[1] : '(root)';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;')
    .replace(/\r?\n/g, ' ');
}

function formatCode(value) {
  return `<code>${escapeHtml(String(value))}</code>`;
}

function getFileLabel(filePath, packageName) {
  const packagePrefix = `packages/${packageName}/dist/`;

  if (packageName !== '(root)' && filePath.startsWith(packagePrefix)) {
    return filePath.slice(packagePrefix.length);
  }

  return filePath;
}

const prSizes = readJson(prPath);
const baseSizes = readJson(basePath);

const allFiles = [
  ...new Set([...Object.keys(prSizes), ...Object.keys(baseSizes)]),
].sort();
const changedFiles = allFiles.filter(
  (filePath) => prSizes[filePath] !== baseSizes[filePath],
);

if (changedFiles.length === 0) {
  process.stdout.write('## Bundle Size Changes\n\nNo bundle size changes.\n');
  process.exit(0);
}

const totalPrSize = allFiles.reduce(
  (sum, filePath) => sum + (prSizes[filePath] ?? 0),
  0,
);
const totalBaseSize = allFiles.reduce(
  (sum, filePath) => sum + (baseSizes[filePath] ?? 0),
  0,
);
const totalDiff = totalPrSize - totalBaseSize;

const filesByPackage = new Map();

for (const filePath of changedFiles) {
  const packageName = getPackageName(filePath);
  const files = filesByPackage.get(packageName) ?? [];
  files.push(filePath);
  filesByPackage.set(packageName, files);
}

const sections = [...filesByPackage.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([packageName, files]) => {
    const packagePrSize = files.reduce(
      (sum, filePath) => sum + (prSizes[filePath] ?? 0),
      0,
    );
    const packageBaseSize = files.reduce(
      (sum, filePath) => sum + (baseSizes[filePath] ?? 0),
      0,
    );
    const packageDiff = packagePrSize - packageBaseSize;
    const packageBadge = getPackageBadge(packagePrSize, packageBaseSize);

    const rows = files
      .map((filePath) => {
        const prSize = prSizes[filePath];
        const baseSize = baseSizes[filePath];
        const fileDiff = (prSizes[filePath] ?? 0) - (baseSizes[filePath] ?? 0);

        return `| ${formatCode(
          getFileLabel(filePath, packageName),
        )} | ${formatSize(baseSize)} | ${formatSize(prSize)} | ${formatDiff(
          fileDiff,
          baseSize ?? 0,
        )}${getChangeBadge(prSize, baseSize)} |`;
      })
      .join('\n');

    return [
      '<details>',
      `<summary>${formatCode(packageName)}${packageBadge} - ${formatSize(
        packageBaseSize,
      )} -> ${formatSize(packagePrSize)} (${formatDiff(
        packageDiff,
        packageBaseSize,
      )})</summary>`,
      '',
      '| File | Base | PR | Diff |',
      '|------|------|----|------|',
      rows,
      '',
      '</details>',
    ].join('\n');
  });

const body = [
  '## Bundle Size Changes',
  '',
  `**Size change:** ${formatDiff(
    totalDiff,
    totalBaseSize,
  )} | **Total size:** ${formatSize(totalPrSize)}`,
  '',
  sections.join('\n\n'),
  '',
].join('\n');

process.stdout.write(body);
