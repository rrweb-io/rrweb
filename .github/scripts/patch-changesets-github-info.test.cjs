const assert = require('assert');

const { patchSource } = require('./patch-changesets-github-info.cjs');

const source = `
const GHDataLoader = new DataLoader__default["default"](async requests => {
  return requests;
});
async function getInfo(request) {
  return request;
}
`;

const patched = patchSource(source);

assert.match(patched, /}, \{ maxBatchSize: 20 \}\);/);
assert.strictEqual(patchSource(patched), patched);
assert.strictEqual(
  patchSource(source.replace('});', '}, { maxBatchSize : 50 });')),
  source.replace('});', '}, { maxBatchSize : 50 });'),
);

const nonAsyncSource = source.replace(
  'async function getInfo',
  'function getInfo',
);
assert.match(patchSource(nonAsyncSource), /\nfunction getInfo/);

assert.throws(
  () => patchSource('const GHDataLoader = new DataLoader(async () => {});'),
  /Could not find/,
);
