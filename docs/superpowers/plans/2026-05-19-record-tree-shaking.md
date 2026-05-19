# Record Tree-Shaking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@rrweb/record` without bundling replay-only `postcss` code from `rrweb-snapshot`.

**Architecture:** Keep the public package API unchanged. Add a resolver scoped to `packages/record/vite.config.ts` so the record build sees local source module boundaries for `rrweb`, `rrweb-snapshot`, and `rrdom`; mark `rrweb-snapshot` as side-effect-free so Rollup can drop unused rebuild modules.

**Tech Stack:** Yarn workspaces, Turbo, Vite 6, Rollup plugin hooks, Vitest, TypeScript.

---

## File Structure

- Modify `packages/record/test/record.test.ts`: add build-output assertions for `postcss` absence and `dist/record.js` size.
- Modify `packages/rrweb-snapshot/package.json`: add `"sideEffects": false`.
- Modify `packages/record/vite.config.ts`: add an inline exact-bare-import `resolveId` plugin for record's build.
- Modify `packages/rrweb/src/entries/record.ts`: replace default-import-then-export with direct named re-export.

## Task 1: Confirm The Baseline

**Files:**

- Read: `packages/record/dist/record.js`
- Modify: none

- [ ] **Step 1: Build the current record package before implementation changes**

Run:

```bash
yarn workspace @rrweb/record build
```

Expected: build succeeds and writes `packages/record/dist/record.js`. In this workspace, the measured baseline build succeeded before implementation changes.

- [ ] **Step 2: Record the current ESM bundle size**

Run:

```bash
wc -c packages/record/dist/record.js
```

Expected: output is `397373 packages/record/dist/record.js`. This is the baseline byte count for Task 2's test constant.

- [ ] **Step 3: Confirm the current bundle contains `postcss`**

Run:

```bash
rg -n "postcss" packages/record/dist
```

Expected: at least one match in a built JavaScript artifact. In this workspace, `postcss` appears in `packages/record/dist/record.js` and `packages/record/dist/record.umd.min.cjs` before the fix.

## Task 2: Add Failing Bundle Regression Tests

**Files:**

- Modify: `packages/record/test/record.test.ts`

- [ ] **Step 1: Replace the test file with build-output checks**

```ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { record } from '../src/index';

const distDir = path.resolve(__dirname, '../dist');
const recordJsPath = path.join(distDir, 'record.js');

// Measured before the tree-shaking fix: 397373 bytes.
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
```

- [ ] **Step 2: Run the test and verify it fails for the current implementation**

Run:

```bash
yarn workspace @rrweb/record test
```

Expected: the new `postcss` assertion fails, or the size assertion fails, because the implementation change has not been made yet.

## Task 3: Mark rrweb-snapshot As Side-Effect-Free

**Files:**

- Modify: `packages/rrweb-snapshot/package.json`

- [ ] **Step 1: Add the package metadata**

Insert `"sideEffects": false` after the `"files"` array.

```json
  "files": [
    "umd",
    "dist",
    "package.json"
  ],
  "sideEffects": false,
  "author": "yanzhen@smartx.com",
```

- [ ] **Step 2: Validate JSON syntax**

Run:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('packages/rrweb-snapshot/package.json', 'utf8')); console.log('ok')"
```

Expected: prints `ok`.

## Task 4: Add The Record-Local Source Resolver

**Files:**

- Modify: `packages/record/vite.config.ts`

- [ ] **Step 1: Replace the config with an inline exact-import resolver**

```ts
import path from 'path';
import type { Plugin } from 'vite';
import config from '../../vite.config.default';

const sourceEntryByPackageName = new Map([
  ['rrweb', path.resolve(__dirname, '../rrweb/src/entries/record.ts')],
  ['rrweb-snapshot', path.resolve(__dirname, '../rrweb-snapshot/src/index.ts')],
  ['rrdom', path.resolve(__dirname, '../rrdom/src/index.ts')],
]);

function resolveLocalSourceEntries(): Plugin {
  return {
    name: 'resolve-local-source-entries',
    enforce: 'pre',
    resolveId(source) {
      return sourceEntryByPackageName.get(source) || null;
    },
  };
}

export default config(path.resolve(__dirname, 'src/index.ts'), 'rrwebRecord', {
  plugins: [resolveLocalSourceEntries()],
});
```

- [ ] **Step 2: Run TypeScript checking for the record package**

Run:

```bash
yarn workspace @rrweb/record check-types
```

Expected: TypeScript check succeeds.

## Task 5: Make The rrweb Record Entry A Direct Re-Export

**Files:**

- Modify: `packages/rrweb/src/entries/record.ts`

- [ ] **Step 1: Replace default-import-then-export with a direct named re-export**

```ts
export { default as record } from '../record';
```

- [ ] **Step 2: Type-check rrweb**

Run:

```bash
yarn workspace rrweb check-types
```

Expected: TypeScript check succeeds.

## Task 6: Build And Set The Final Size Threshold

**Files:**

- Modify: `packages/record/test/record.test.ts`

- [ ] **Step 1: Build the fixed record package**

Run:

```bash
yarn workspace @rrweb/record build
```

Expected: build succeeds and writes `packages/record/dist/record.js`.

- [ ] **Step 2: Measure the fixed ESM bundle size**

Run:

```bash
wc -c packages/record/dist/record.js
```

Expected: output is at least `204800` bytes smaller than the baseline from Task 1.

- [ ] **Step 3: Update the test comment with measured before and after sizes**

Use the exact byte count printed in Step 2 in a new comment line above the threshold constants. Keep `BASELINE_RECORD_JS_BYTES` equal to `397373`. For example, if Step 2 prints `180245 packages/record/dist/record.js`, the threshold block becomes:

```ts
// Measured before the tree-shaking fix: 397373 bytes.
// Measured after the tree-shaking fix: 180245 bytes.
// The fixed ESM bundle must stay at least 200 KiB smaller.
const BASELINE_RECORD_JS_BYTES = 397373;
const MAX_RECORD_JS_BYTES = BASELINE_RECORD_JS_BYTES - 200 * 1024;
```

## Task 7: Verify The Regression Tests Pass

**Files:**

- Test: `packages/record/test/record.test.ts`

- [ ] **Step 1: Run the focused record tests**

Run:

```bash
yarn workspace @rrweb/record test
```

Expected: all tests in `packages/record/test/record.test.ts` pass.

- [ ] **Step 2: Confirm `postcss` is absent from emitted record JavaScript**

Run:

```bash
rg -n "postcss" packages/record/dist --glob '*.{js,cjs}'
```

Expected: no matches and exit code `1`.

## Task 8: Run Final Verification

**Files:**

- Test: `packages/rrweb-snapshot/package.json`
- Test: `packages/record/vite.config.ts`
- Test: `packages/rrweb/src/entries/record.ts`
- Test: `packages/record/test/record.test.ts`

- [ ] **Step 1: Check rrweb-snapshot types**

Run:

```bash
yarn workspace rrweb-snapshot check-types
```

Expected: succeeds.

- [ ] **Step 2: Rebuild record**

Run:

```bash
yarn workspace @rrweb/record build
```

Expected: succeeds.

- [ ] **Step 3: Run record tests**

Run:

```bash
yarn workspace @rrweb/record test
```

Expected: succeeds.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git diff -- packages/rrweb-snapshot/package.json packages/record/vite.config.ts packages/rrweb/src/entries/record.ts packages/record/test/record.test.ts
```

Expected: diff only contains the planned implementation and test changes.

## Task 9: Commit The Implementation

**Files:**

- Stage: `packages/rrweb-snapshot/package.json`
- Stage: `packages/record/vite.config.ts`
- Stage: `packages/rrweb/src/entries/record.ts`
- Stage: `packages/record/test/record.test.ts`

- [ ] **Step 1: Stage implementation files only**

Run:

```bash
git add packages/rrweb-snapshot/package.json packages/record/vite.config.ts packages/rrweb/src/entries/record.ts packages/record/test/record.test.ts
```

Expected: staged diff excludes the pre-existing `packages/rrweb-player/.svelte-kit/ambient.d.ts` change.

- [ ] **Step 2: Commit**

Run:

```bash
git commit -m "fix: tree-shake postcss from record bundle"
```

Expected: commit succeeds.
