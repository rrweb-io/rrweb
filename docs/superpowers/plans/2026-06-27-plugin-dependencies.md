# Plugin Dependencies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up plugin package dependency metadata so plugins work with the split `rrweb`, `@rrweb/record`, `@rrweb/replay`, and `@rrweb/all` host entrypoints without misleading `rrweb` peer dependencies.

**Architecture:** Move replay plugin typing to a host-neutral structural contract in `@rrweb/types`, keep existing `rrweb` exports as compatibility aliases, and make plugin packages depend on published-artifact imports instead of host peers. Runtime behavior and bundling policy stay unchanged.

**Tech Stack:** Yarn v1 workspaces, TypeScript project references, Vite library builds, Changesets, npm pack smoke tests.

---

## File Structure

- Modify `packages/types/src/index.ts`: add the host-neutral `ReplayPlugin` contract next to `RecordPlugin`.
- Modify `packages/rrweb/src/types.ts`: import the new base replay type and preserve the concrete `rrweb` `ReplayPlugin` alias.
- Modify `packages/replay/src/index.ts`: export `ReplayPlugin` for `@rrweb/replay` users.
- Modify replay plugin sources:
  - `packages/plugins/rrweb-plugin-console-replay/src/index.ts`
  - `packages/plugins/rrweb-plugin-network-replay/src/index.ts`
  - `packages/plugins/rrweb-plugin-sequential-id-replay/src/index.ts`
  - `packages/plugins/rrweb-plugin-canvas-webrtc-replay/src/index.ts`
- Modify canvas record source:
  - `packages/plugins/rrweb-plugin-canvas-webrtc-record/src/index.ts`
- Modify all plugin `package.json` files under `packages/plugins/*`.
- Regenerate TypeScript project references:
  - `tsconfig.json`
  - `packages/plugins/*/tsconfig.json`
- Modify plugin READMEs under `packages/plugins/*/README.md`.
- Modify recipe docs:
  - `docs/recipes/network.md`
  - `docs/recipes/plugin-api.md`
- Create `scripts/check-plugin-host-smoke.mjs`: strict consumer smoke test for split host installs.
- Create `.changeset/plugin-dependency-cleanup.md`: patch changeset for affected published packages.

---

### Task 1: Add Host-Neutral Replay Plugin Types

**Files:**

- Modify: `packages/types/src/index.ts`
- Modify: `packages/rrweb/src/types.ts`
- Modify: `packages/replay/src/index.ts`

- [ ] **Step 1: Add `ReplayPlugin` to `@rrweb/types`**

In `packages/types/src/index.ts`, insert this block immediately after `RecordPlugin`:

```ts
export type ReplayPlugin<
  TReplayer = unknown,
  TNode = Node,
  TMirror = unknown,
> = {
  handler?: (
    event: eventWithTime,
    isSync: boolean,
    context: { replayer: TReplayer },
  ) => void;
  onBuild?: (
    node: Node | TNode,
    context: { id: number; replayer: TReplayer },
  ) => void;
  getMirror?: (mirrors: { nodeMirror: TMirror }) => void;
};
```

- [ ] **Step 2: Run the focused type check**

Run:

```bash
yarn workspace @rrweb/types check-types
```

Expected: PASS. This type is self-contained and should not introduce cycles.

- [ ] **Step 3: Change `rrweb` to use the base replay type**

In `packages/rrweb/src/types.ts`, update the `@rrweb/types` import list to include the aliased base type:

```ts
  ReplayPlugin as BaseReplayPlugin,
```

Replace the existing concrete `ReplayPlugin` definition with:

```ts
export type ReplayPlugin = BaseReplayPlugin<Replayer, RRNode, Mirror>;
```

Keep this existing line:

```ts
export type { Replayer } from './replay';
```

- [ ] **Step 4: Verify the concrete `rrweb` type still builds**

Run:

```bash
yarn workspace rrweb check-types
```

Expected: PASS. `import type { ReplayPlugin } from 'rrweb'` remains a supported public import.

- [ ] **Step 5: Export `ReplayPlugin` from `@rrweb/replay`**

In `packages/replay/src/index.ts`, change the import from `rrweb` to include the type:

```ts
import {
  Replayer,
  type ReplayPlugin,
  type playerConfig,
  type PlayerMachineState,
  type SpeedMachineState,
} from 'rrweb';
```

Change the export block to:

```ts
export {
  Replayer,
  type ReplayPlugin,
  type playerConfig,
  type PlayerMachineState,
  type SpeedMachineState,
};
```

- [ ] **Step 6: Verify the replay package type export**

Run:

```bash
yarn workspace @rrweb/replay check-types
```

Expected: PASS.

- [ ] **Step 7: Commit the shared type surface**

```bash
git add packages/types/src/index.ts packages/rrweb/src/types.ts packages/replay/src/index.ts
git commit -m "fix: add host-neutral replay plugin type"
```

---

### Task 2: Remove Plugin Type Imports From `rrweb`

**Files:**

- Modify: `packages/plugins/rrweb-plugin-console-replay/src/index.ts`
- Modify: `packages/plugins/rrweb-plugin-network-replay/src/index.ts`
- Modify: `packages/plugins/rrweb-plugin-sequential-id-replay/src/index.ts`
- Modify: `packages/plugins/rrweb-plugin-canvas-webrtc-replay/src/index.ts`
- Modify: `packages/plugins/rrweb-plugin-canvas-webrtc-record/src/index.ts`

- [ ] **Step 1: Update console replay imports and context type**

In `packages/plugins/rrweb-plugin-console-replay/src/index.ts`, replace:

```ts
import type { eventWithTime } from '@rrweb/types';
import { EventType, IncrementalSource } from '@rrweb/types';
import type { ReplayPlugin, Replayer } from 'rrweb';
```

with:

```ts
import type { eventWithTime, ReplayPlugin } from '@rrweb/types';
import { EventType, IncrementalSource } from '@rrweb/types';
```

Add this local structural context type after `type LogReplayConfig`:

```ts
type ReplayerWithWarnings = {
  config: {
    showWarning: boolean;
  };
};
```

Change the exported function type to:

```ts
export const getReplayConsolePlugin: (
  options?: LogReplayConfig,
) => ReplayPlugin<ReplayerWithWarnings> = (options) => {
```

Change the handler context type to:

```ts
      context: { replayer: ReplayerWithWarnings },
```

- [ ] **Step 2: Update network replay to use the shared type**

In `packages/plugins/rrweb-plugin-network-replay/src/index.ts`, replace:

```ts
import type { eventWithTime, NetworkData } from '@rrweb/types';
```

with:

```ts
import type { eventWithTime, NetworkData, ReplayPlugin } from '@rrweb/types';
```

Delete the local `type ReplayPlugin` block:

```ts
type ReplayPlugin = {
  handler?: (event: eventWithTime, isSync: boolean, context: unknown) => void;
};
```

- [ ] **Step 3: Update sequential replay to use `@rrweb/types`**

In `packages/plugins/rrweb-plugin-sequential-id-replay/src/index.ts`, replace:

```ts
import type { ReplayPlugin } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
```

with:

```ts
import type { eventWithTime, ReplayPlugin } from '@rrweb/types';
```

- [ ] **Step 4: Update canvas replay to avoid concrete host types**

In `packages/plugins/rrweb-plugin-canvas-webrtc-replay/src/index.ts`, replace the first four imports:

```ts
import type { RRNode } from 'rrdom';
import type { Mirror } from 'rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type { ReplayPlugin, Replayer } from 'rrweb';
```

with:

```ts
import type { ReplayPlugin } from '@rrweb/types';
import SimplePeer from 'simple-peer-light';
```

Add these structural types after the imports:

```ts
type ReplayCanvasNode = Node | { nodeName: string };

type ReplayCanvasContext = {
  id: number;
  replayer: unknown;
};

type ReplayCanvasMirror = {
  getNode(id: number): Node | null;
};
```

Replace the `canvasFoundCallback` field type with:

```ts
  private canvasFoundCallback: (
    node: ReplayCanvasNode,
    context: ReplayCanvasContext,
  ) => void;
```

Replace the `mirror` field type with:

```ts
  private mirror: ReplayCanvasMirror | undefined;
```

Replace `initPlugin()` with:

```ts
  public initPlugin(): ReplayPlugin<
    unknown,
    ReplayCanvasNode,
    ReplayCanvasMirror
  > {
    return {
      onBuild: (
        node: ReplayCanvasNode,
        context: ReplayCanvasContext,
      ) => {
        if (node.nodeName === 'CANVAS') {
          this.canvasFoundCallback(node, context);
        }
      },
      getMirror: (options) => {
        this.mirror = options.nodeMirror;
      },
    };
  }
```

- [ ] **Step 5: Hide `simple-peer-light` from the canvas record public API**

In `packages/plugins/rrweb-plugin-canvas-webrtc-record/src/index.ts`, add this structural type after `CrossOriginIframeMessageEventContent`:

```ts
type WebRTCPeer = {
  signal(signal: RTCSessionDescriptionInit): void;
  send(data: string): void;
  addStream(stream: MediaStream): void;
  on(event: 'error', callback: (err: Error) => void): void;
  on(event: 'close', callback: () => void): void;
  on(
    event: 'signal',
    callback: (data: RTCSessionDescriptionInit) => void,
  ): void;
  on(event: 'connect', callback: () => void): void;
  on(event: 'data', callback: (data: SimplePeer.SimplePeerData) => void): void;
  on(event: 'stream', callback: (stream: MediaStream) => void): void;
};
```

Replace every class-member `SimplePeer.Instance` type in that file with `WebRTCPeer`.

Keep the runtime import:

```ts
import SimplePeer from 'simple-peer-light';
```

- [ ] **Step 6: Run plugin type checks**

Run:

```bash
yarn workspace @rrweb/rrweb-plugin-console-replay check-types
yarn workspace @rrweb/rrweb-plugin-network-replay check-types
yarn workspace @rrweb/rrweb-plugin-sequential-id-replay check-types
yarn workspace @rrweb/rrweb-plugin-canvas-webrtc-replay check-types
yarn workspace @rrweb/rrweb-plugin-canvas-webrtc-record check-types
```

Expected: all commands PASS.

- [ ] **Step 7: Assert plugin source no longer imports types from `rrweb`**

Run:

```bash
rg -n "from 'rrweb'|from \"rrweb\"" packages/plugins -g '*.ts' -g '!test/**'
```

Expected: no matches outside package-local tests.

- [ ] **Step 8: Commit the plugin source cleanup**

```bash
git add packages/plugins/rrweb-plugin-console-replay/src/index.ts \
  packages/plugins/rrweb-plugin-network-replay/src/index.ts \
  packages/plugins/rrweb-plugin-sequential-id-replay/src/index.ts \
  packages/plugins/rrweb-plugin-canvas-webrtc-replay/src/index.ts \
  packages/plugins/rrweb-plugin-canvas-webrtc-record/src/index.ts
git commit -m "fix: remove rrweb type imports from plugins"
```

---

### Task 3: Fix Plugin Manifests and Project References

**Files:**

- Modify: `packages/plugins/*/package.json`
- Modify: `tsconfig.json`
- Modify: `packages/plugins/*/tsconfig.json`

- [ ] **Step 1: Update canvas WebRTC record manifest**

In `packages/plugins/rrweb-plugin-canvas-webrtc-record/package.json`, replace the current `devDependencies` and `peerDependencies` block with:

```json
  "dependencies": {
    "@rrweb/types": "^2.0.1",
    "simple-peer-light": "^9.10.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1"
  }
```

- [ ] **Step 2: Update canvas WebRTC replay manifest**

In `packages/plugins/rrweb-plugin-canvas-webrtc-replay/package.json`, replace the current `devDependencies` and `peerDependencies` block with:

```json
  "dependencies": {
    "@rrweb/types": "^2.0.1",
    "simple-peer-light": "^9.10.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1"
  }
```

- [ ] **Step 3: Update console record manifest**

In `packages/plugins/rrweb-plugin-console-record/package.json`, replace `peerDependencies` with `dependencies`:

```json
  "dependencies": {
    "@rrweb/types": "^2.0.1",
    "@rrweb/utils": "^2.0.1"
  },
```

Keep `rrweb` in `devDependencies` because `test/html/index.ts` imports it.

- [ ] **Step 4: Update console replay manifest**

In `packages/plugins/rrweb-plugin-console-replay/package.json`, replace the current `devDependencies` and `peerDependencies` block with:

```json
  "dependencies": {
    "@rrweb/rrweb-plugin-console-record": "^2.0.1",
    "@rrweb/types": "^2.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1"
  }
```

- [ ] **Step 5: Update network record manifest**

In `packages/plugins/rrweb-plugin-network-record/package.json`, replace the current dependency blocks with:

```json
  "dependencies": {
    "@rrweb/types": "^2.0.1",
    "@rrweb/utils": "^2.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1",
    "vitest": "^1.4.0"
  }
```

- [ ] **Step 6: Update network replay manifest**

In `packages/plugins/rrweb-plugin-network-replay/package.json`, replace the current dependency blocks with:

```json
  "dependencies": {
    "@rrweb/rrweb-plugin-network-record": "^2.0.1",
    "@rrweb/types": "^2.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1"
  }
```

- [ ] **Step 7: Update sequential ID record manifest**

In `packages/plugins/rrweb-plugin-sequential-id-record/package.json`, replace the current dependency blocks with:

```json
  "dependencies": {
    "@rrweb/types": "^2.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1"
  }
```

- [ ] **Step 8: Update sequential ID replay manifest**

In `packages/plugins/rrweb-plugin-sequential-id-replay/package.json`, replace the current dependency blocks with:

```json
  "dependencies": {
    "@rrweb/rrweb-plugin-sequential-id-record": "^2.0.1",
    "@rrweb/types": "^2.0.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1"
  }
```

- [ ] **Step 9: Regenerate TypeScript project references**

Run:

```bash
yarn references:update
```

Expected: `tsconfig.json` and plugin `tsconfig.json` references update to reflect direct package dependencies.

- [ ] **Step 10: Confirm no plugin manifest has host peers**

Run:

```bash
jq -r 'select(.peerDependencies != null) | .name + " " + (.peerDependencies | keys | join(","))' packages/plugins/*/package.json
```

Expected: no output.

- [ ] **Step 11: Commit manifests and references**

```bash
git add packages/plugins/*/package.json tsconfig.json packages/plugins/*/tsconfig.json
git commit -m "fix: declare plugin package dependencies"
```

---

### Task 4: Update Plugin Docs, Recipe Docs, and Changeset

**Files:**

- Modify: `packages/plugins/*/README.md`
- Modify: `docs/recipes/network.md`
- Modify: `docs/recipes/plugin-api.md`
- Create: `.changeset/plugin-dependency-cleanup.md`

- [ ] **Step 1: Add record host compatibility text**

Add this paragraph after the opening description in these files:

- `packages/plugins/rrweb-plugin-console-record/README.md`
- `packages/plugins/rrweb-plugin-network-record/README.md`
- `packages/plugins/rrweb-plugin-sequential-id-record/README.md`
- `packages/plugins/rrweb-plugin-canvas-webrtc-record/README.md`

```md
Use this plugin with one compatible recording host: `rrweb`, `@rrweb/record`, or `@rrweb/all`.
```

- [ ] **Step 2: Add replay host compatibility text**

Add this paragraph after the opening description in these files:

- `packages/plugins/rrweb-plugin-console-replay/README.md`
- `packages/plugins/rrweb-plugin-network-replay/README.md`
- `packages/plugins/rrweb-plugin-sequential-id-replay/README.md`
- `packages/plugins/rrweb-plugin-canvas-webrtc-replay/README.md`

```md
Use this plugin with one compatible replay host: `rrweb`, `@rrweb/replay`, or `@rrweb/all`.
```

- [ ] **Step 3: Update the network replay recipe to use `@rrweb/replay`**

In `docs/recipes/network.md`, replace:

```js
import rrweb from 'rrweb';
import { getReplayNetworkPlugin } from '@rrweb/rrweb-plugin-network-replay';

const replayer = new rrweb.Replayer(events, {
```

with:

```js
import { Replayer } from '@rrweb/replay';
import { getReplayNetworkPlugin } from '@rrweb/rrweb-plugin-network-replay';

const replayer = new Replayer(events, {
```

- [ ] **Step 4: Update the plugin API recipe imports**

In `docs/recipes/plugin-api.md`, add this import before the interface examples:

```ts
import type { RecordPlugin, ReplayPlugin } from '@rrweb/types';
```

Replace the displayed replay interface with the generic host-neutral shape:

```ts
export type ReplayPlugin<TReplayer = unknown> = {
  handler?: (
    event: eventWithTime,
    isSync: boolean,
    context: { replayer: TReplayer },
  ) => void;
};
```

- [ ] **Step 5: Add the changeset**

Create `.changeset/plugin-dependency-cleanup.md` with this content:

```md
---
'rrweb': patch
'@rrweb/types': patch
'@rrweb/replay': patch
'@rrweb/rrweb-plugin-console-record': patch
'@rrweb/rrweb-plugin-console-replay': patch
'@rrweb/rrweb-plugin-sequential-id-record': patch
'@rrweb/rrweb-plugin-sequential-id-replay': patch
'@rrweb/rrweb-plugin-canvas-webrtc-record': patch
'@rrweb/rrweb-plugin-canvas-webrtc-replay': patch
'@rrweb/rrweb-plugin-network-record': patch
'@rrweb/rrweb-plugin-network-replay': patch
---

Clean up plugin dependency metadata for split record and replay host packages.
```

- [ ] **Step 6: Run Markdown formatting on touched docs**

Run:

```bash
yarn prettier --write \
  docs/recipes/network.md \
  docs/recipes/plugin-api.md \
  packages/plugins/rrweb-plugin-*/README.md \
  .changeset/plugin-dependency-cleanup.md
```

Expected: files are formatted.

- [ ] **Step 7: Commit docs and changeset**

```bash
git add docs/recipes/network.md docs/recipes/plugin-api.md \
  packages/plugins/*/README.md .changeset/plugin-dependency-cleanup.md
git commit -m "docs: document plugin host compatibility"
```

---

### Task 5: Add Split-Host Consumer Smoke Tests

**Files:**

- Create: `scripts/check-plugin-host-smoke.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the smoke-test script**

Create `scripts/check-plugin-host-smoke.mjs`:

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = mkdtempSync(join(tmpdir(), 'rrweb-plugin-host-smoke-'));
const packDir = join(tempRoot, 'packs');
mkdirSync(packDir);

const packages = {
  types: 'packages/types',
  utils: 'packages/utils',
  record: 'packages/record',
  replay: 'packages/replay',
  consoleRecord: 'packages/plugins/rrweb-plugin-console-record',
  consoleReplay: 'packages/plugins/rrweb-plugin-console-replay',
};

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  });
}

function assertBuilt(packagePath) {
  const dist = join(root, packagePath, 'dist');
  if (!existsSync(dist)) {
    throw new Error(
      `Missing ${dist}. Run the required package builds before this smoke test.`,
    );
  }
}

function pack(packagePath) {
  assertBuilt(packagePath);
  const output = run('npm', [
    'pack',
    '--json',
    '--pack-destination',
    packDir,
    packagePath,
  ]);
  const [packed] = JSON.parse(output);
  return join(packDir, packed.filename);
}

function writeConsumer(name, dependencies, source) {
  const dir = join(tempRoot, name);
  mkdirSync(dir);
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies,
        devDependencies: {
          typescript: '^5.4.5',
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          lib: ['DOM', 'ES2022'],
          skipLibCheck: false,
          noEmit: true,
        },
        include: ['index.ts'],
      },
      null,
      2,
    ),
  );
  writeFileSync(join(dir, 'index.ts'), source);
  return dir;
}

try {
  const packed = Object.fromEntries(
    Object.entries(packages).map(([name, packagePath]) => [
      name,
      `file:${pack(packagePath)}`,
    ]),
  );

  const recordConsumer = writeConsumer(
    'record-consumer',
    {
      '@rrweb/types': packed.types,
      '@rrweb/utils': packed.utils,
      '@rrweb/record': packed.record,
      '@rrweb/rrweb-plugin-console-record': packed.consoleRecord,
    },
    `import { record } from '@rrweb/record';
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record';

record({
  emit(event) {
    void event;
  },
  plugins: [getRecordConsolePlugin()],
});
`,
  );

  const replayConsumer = writeConsumer(
    'replay-consumer',
    {
      '@rrweb/types': packed.types,
      '@rrweb/replay': packed.replay,
      '@rrweb/rrweb-plugin-console-record': packed.consoleRecord,
      '@rrweb/rrweb-plugin-console-replay': packed.consoleReplay,
    },
    `import { Replayer } from '@rrweb/replay';
import { getReplayConsolePlugin } from '@rrweb/rrweb-plugin-console-replay';

const replayer = new Replayer([], {
  plugins: [getReplayConsolePlugin()],
});
replayer.play();
`,
  );

  for (const dir of [recordConsumer, replayConsumer]) {
    run('npm', ['install', '--ignore-scripts'], {
      cwd: dir,
      stdio: 'inherit',
    });
    run('npx', ['tsc', '--noEmit'], {
      cwd: dir,
      stdio: 'inherit',
    });
  }

  console.log('Plugin host smoke tests passed.');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
```

- [ ] **Step 2: Add a package script**

In root `package.json`, add this script after `check-types`:

```json
"check:plugin-hosts": "node scripts/check-plugin-host-smoke.mjs",
```

- [ ] **Step 3: Run the script before builds to verify the guard message**

Run:

```bash
yarn check:plugin-hosts
```

Expected if any required `dist` directory is missing:

```text
Missing .../dist. Run the required package builds before this smoke test.
```

Expected if previous builds already exist: the script installs both consumers and prints:

```text
Plugin host smoke tests passed.
```

- [ ] **Step 4: Commit the smoke test**

```bash
git add scripts/check-plugin-host-smoke.mjs package.json
git commit -m "test: add plugin host smoke checks"
```

---

### Task 6: Build, Inspect Artifacts, and Verify

**Files:**

- Inspect generated `dist` files only.
- No source files should be edited in this task unless a verification step fails.

- [ ] **Step 1: Build shared packages and affected plugins**

Run:

```bash
yarn workspace @rrweb/types build
yarn workspace rrweb build
yarn workspace @rrweb/replay build
yarn workspace @rrweb/rrweb-plugin-console-record build
yarn workspace @rrweb/rrweb-plugin-console-replay build
yarn workspace @rrweb/rrweb-plugin-sequential-id-record build
yarn workspace @rrweb/rrweb-plugin-sequential-id-replay build
yarn workspace @rrweb/rrweb-plugin-network-record build
yarn workspace @rrweb/rrweb-plugin-network-replay build
yarn workspace @rrweb/rrweb-plugin-canvas-webrtc-record build
yarn workspace @rrweb/rrweb-plugin-canvas-webrtc-replay build
```

Expected: all commands PASS.

- [ ] **Step 2: Assert no plugin declaration imports from `rrweb`**

Run:

```bash
rg -n "from 'rrweb'|from \"rrweb\"" packages/plugins/*/dist -g '*.d.ts' -g '*.d.cts'
```

Expected: no output.

- [ ] **Step 3: Inspect runtime bundle policy**

Run:

```bash
rg -n "simple-peer-light|@rrweb/utils|@rrweb/types|rrweb-plugin-console-record" packages/plugins/*/dist -g '*.js' -g '*.cjs'
```

Expected: use the output to confirm runtime imports are either bundled as before or left as imports with matching `dependencies`. Do not externalize runtime imports in this PR.

- [ ] **Step 4: Run type checks**

Run:

```bash
yarn workspace @rrweb/types check-types
yarn workspace rrweb check-types
yarn workspace @rrweb/replay check-types
yarn workspace @rrweb/rrweb-plugin-console-record check-types
yarn workspace @rrweb/rrweb-plugin-console-replay check-types
yarn workspace @rrweb/rrweb-plugin-sequential-id-record check-types
yarn workspace @rrweb/rrweb-plugin-sequential-id-replay check-types
yarn workspace @rrweb/rrweb-plugin-network-record check-types
yarn workspace @rrweb/rrweb-plugin-network-replay check-types
yarn workspace @rrweb/rrweb-plugin-canvas-webrtc-record check-types
yarn workspace @rrweb/rrweb-plugin-canvas-webrtc-replay check-types
```

Expected: all commands PASS.

- [ ] **Step 5: Run the split-host smoke tests**

Run:

```bash
yarn check:plugin-hosts
```

Expected:

```text
Plugin host smoke tests passed.
```

- [ ] **Step 6: Run focused plugin tests**

Run:

```bash
yarn workspace @rrweb/rrweb-plugin-console-record test
yarn workspace @rrweb/rrweb-plugin-network-record test
```

Expected: both commands PASS.

- [ ] **Step 7: Return to the owning task for verification failures**

If verification failed, stop this task and return to the task that owns the
failed file. For example, a failing plugin declaration import check belongs to
Task 2 or Task 3, and a failing smoke test belongs to Task 5. After fixing the
owning task, rerun Task 6 from Step 1.

When verification passes, confirm the worktree state:

```bash
git status --short
```

Expected: no source-file modifications remain unstaged.

```bash
git status --short
```

prints no output.

---

### Task 7: Final PR Preparation

**Files:**

- Use `git status` and PR body only.

- [ ] **Step 1: Review the final diff**

Run:

```bash
git status --short
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```

Expected:

- commits are split by type surface, plugin source cleanup, manifests/references, docs/changeset, and smoke tests
- no unrelated files are changed

- [ ] **Step 2: Update the PR body**

Edit the PR body to include the three options and final validation. Use:

```bash
gh pr edit --body-file /tmp/plugin-dependency-pr-body.md
```

The body must include:

```md
## Options considered

### Option 1: No host peer

Pros:

- supports all valid host entrypoints
- avoids false `rrweb` peer warnings for split-package users
- keeps manifests focused on published-artifact imports

Cons:

- no install-time warning when a plugin is installed without a host
- compatibility is enforced through docs, TypeScript, and smoke tests

Chosen because npm cannot express one of `rrweb`, `@rrweb/record`, `@rrweb/replay`, or `@rrweb/all`.

### Option 2: Optional host peers

Pros:

- keeps host compatibility visible in metadata
- avoids hard install failures

Cons:

- does not require that any compatible host is installed
- creates noisy metadata and still does not fix undeclared imports

### Option 3: Strict host peer

Pros:

- gives clear feedback when there is one canonical host
- familiar plugin-package model

Cons:

- no longer matches rrweb's package split
- forces or warns about `rrweb` for valid split-package consumers
```

- [ ] **Step 3: Push the implementation branch**

Run:

```bash
git push
```

Expected: branch updates successfully.
