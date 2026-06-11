import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vite-plus/test';
import { record } from '../src/index';

const distDir = path.resolve(__dirname, '../dist');
const recordJsPath = path.join(distDir, 'record.js');

// Measured before the tree-shaking fix: 397373 bytes.
// Measured after the tree-shaking fix: 161287 bytes.
// The fixed ESM bundle must stay at least 200 KiB smaller.
const BASELINE_RECORD_JS_BYTES = 397373;
const MAX_RECORD_JS_BYTES = BASELINE_RECORD_JS_BYTES - 200 * 1024;

function requireBuiltRecordBundle() {
  if (!existsSync(recordJsPath)) {
    throw new Error(
      'Missing packages/record/dist/record.js. Run `yarn workspace @rrweb/record build` before running this test.',
    );
  }
}

function emittedJavaScriptFiles() {
  if (!existsSync(distDir)) {
    throw new Error(
      'Missing packages/record/dist. Run `yarn workspace @rrweb/record build` before running this test.',
    );
  }
  return readdirSync(distDir)
    .filter((file) => file.endsWith('.js') || file.endsWith('.cjs'))
    .map((file) => path.join(distDir, file));
}

describe('record', () => {
  it('should be a function', () => {
    expect(typeof record).toBe('function');
  });

  it('does not bundle replay-only postcss code', () => {
    requireBuiltRecordBundle();

    for (const file of emittedJavaScriptFiles()) {
      expect(readFileSync(file, 'utf-8')).not.toContain('postcss');
    }
  });

  it('keeps the ESM record bundle at least 200 KiB below the baseline size', () => {
    requireBuiltRecordBundle();

    expect(statSync(recordJsPath).size).toBeLessThanOrEqual(
      MAX_RECORD_JS_BYTES,
    );
  });
});
