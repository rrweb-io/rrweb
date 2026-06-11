const fs = require('fs');

const packagePath = require.resolve('@changesets/get-github-info', {
  paths: [process.cwd()],
});

function patchSource(source) {
  if (/maxBatchSize\s*:/.test(source)) {
    return source;
  }

  const loaderStart =
    'const GHDataLoader = new DataLoader__default["default"](async requests => {';
  const startIndex = source.indexOf(loaderStart);

  if (startIndex === -1) {
    throw new Error('Could not find Changesets GitHub info DataLoader');
  }

  const loaderEndPattern = /\n}\);\n((?:async\s+)?function getInfo)/;
  const endMatch = loaderEndPattern.exec(source.slice(startIndex));

  if (!endMatch) {
    throw new Error('Could not find Changesets GitHub info DataLoader end');
  }

  const endIndex = startIndex + endMatch.index;
  const getInfoStart = endMatch[1];
  const restIndex = endIndex + endMatch[0].length;

  return `${source.slice(
    0,
    endIndex,
  )}\n}, { maxBatchSize: 20 });\n${getInfoStart}${source.slice(restIndex)}`;
}

function main() {
  const source = fs.readFileSync(packagePath, 'utf8');
  const patched = patchSource(source);

  if (patched === source) {
    console.log('@changesets/get-github-info already limits GitHub batches');
    return;
  }

  fs.writeFileSync(packagePath, patched);
  console.log('Patched @changesets/get-github-info GitHub batch size');
}

if (require.main === module) {
  main();
}

module.exports = { patchSource };
