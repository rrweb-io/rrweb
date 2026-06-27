#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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
  rrdom: 'packages/rrdom',
  rrwebSnapshot: 'packages/rrweb-snapshot',
  rrweb: 'packages/rrweb',
  record: 'packages/record',
  replay: 'packages/replay',
  canvasWebrtcRecord: 'packages/plugins/rrweb-plugin-canvas-webrtc-record',
  canvasWebrtcReplay: 'packages/plugins/rrweb-plugin-canvas-webrtc-replay',
  consoleRecord: 'packages/plugins/rrweb-plugin-console-record',
  consoleReplay: 'packages/plugins/rrweb-plugin-console-replay',
  networkRecord: 'packages/plugins/rrweb-plugin-network-record',
  networkReplay: 'packages/plugins/rrweb-plugin-network-replay',
  sequentialIdRecord: 'packages/plugins/rrweb-plugin-sequential-id-record',
  sequentialIdReplay: 'packages/plugins/rrweb-plugin-sequential-id-replay',
};

const forbiddenDeclarationImport =
  /(?:from\s+|import\()\s*['"](rrweb|rrdom|rrweb-snapshot)['"]/;

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

function findDeclarationFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return findDeclarationFiles(entryPath);
    }
    return entryPath.endsWith('.d.ts') || entryPath.endsWith('.d.cts')
      ? [entryPath]
      : [];
  });
}

function assertPluginDeclarationsHostNeutral() {
  for (const packagePath of Object.values(packages).filter((value) =>
    value.startsWith('packages/plugins/'),
  )) {
    assertBuilt(packagePath);
    for (const file of findDeclarationFiles(join(root, packagePath, 'dist'))) {
      const content = readFileSync(file, 'utf8');
      const match = content.match(forbiddenDeclarationImport);
      if (match) {
        throw new Error(
          `Plugin declaration ${file} imports forbidden host package "${match[1]}".`,
        );
      }
    }
  }
}

function pack(packagePath) {
  assertBuilt(packagePath);
  const output = run('npm', [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    packDir,
    `./${packagePath}`,
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
          typescript: '5.4.5',
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
          skipLibCheck: true,
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
  assertPluginDeclarationsHostNeutral();

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
      '@rrweb/rrweb-plugin-canvas-webrtc-record': packed.canvasWebrtcRecord,
      '@rrweb/rrweb-plugin-console-record': packed.consoleRecord,
      '@rrweb/rrweb-plugin-network-record': packed.networkRecord,
      '@rrweb/rrweb-plugin-sequential-id-record': packed.sequentialIdRecord,
      rrdom: packed.rrdom,
      rrweb: packed.rrweb,
      'rrweb-snapshot': packed.rrwebSnapshot,
    },
    `import { record } from '@rrweb/record';
import { RRWebPluginCanvasWebRTCRecord } from '@rrweb/rrweb-plugin-canvas-webrtc-record';
import { getRecordConsolePlugin } from '@rrweb/rrweb-plugin-console-record';
import { getRecordNetworkPlugin } from '@rrweb/rrweb-plugin-network-record';
import { getRecordSequentialIdPlugin } from '@rrweb/rrweb-plugin-sequential-id-record';

const canvasRecordPlugin = new RRWebPluginCanvasWebRTCRecord({
  signalSendCallback(signal: unknown) {
    void signal;
  },
}).initPlugin();

record({
  emit(event) {
    void event;
  },
  plugins: [
    getRecordConsolePlugin(),
    getRecordNetworkPlugin(),
    getRecordSequentialIdPlugin(),
    canvasRecordPlugin,
  ],
});
`,
  );

  const replayConsumer = writeConsumer(
    'replay-consumer',
    {
      '@rrweb/types': packed.types,
      '@rrweb/utils': packed.utils,
      '@rrweb/replay': packed.replay,
      '@rrweb/rrweb-plugin-canvas-webrtc-record': packed.canvasWebrtcRecord,
      '@rrweb/rrweb-plugin-canvas-webrtc-replay': packed.canvasWebrtcReplay,
      '@rrweb/rrweb-plugin-console-record': packed.consoleRecord,
      '@rrweb/rrweb-plugin-console-replay': packed.consoleReplay,
      '@rrweb/rrweb-plugin-network-record': packed.networkRecord,
      '@rrweb/rrweb-plugin-network-replay': packed.networkReplay,
      '@rrweb/rrweb-plugin-sequential-id-record': packed.sequentialIdRecord,
      '@rrweb/rrweb-plugin-sequential-id-replay': packed.sequentialIdReplay,
      rrdom: packed.rrdom,
      rrweb: packed.rrweb,
      'rrweb-snapshot': packed.rrwebSnapshot,
    },
    `import { Replayer } from '@rrweb/replay';
import { RRWebPluginCanvasWebRTCReplay } from '@rrweb/rrweb-plugin-canvas-webrtc-replay';
import { getReplayConsolePlugin } from '@rrweb/rrweb-plugin-console-replay';
import { getReplayNetworkPlugin } from '@rrweb/rrweb-plugin-network-replay';
import { getReplaySequentialIdPlugin } from '@rrweb/rrweb-plugin-sequential-id-replay';

const canvasReplayPlugin = new RRWebPluginCanvasWebRTCReplay({
  canvasFoundCallback(node: unknown, context: unknown) {
    void node;
    void context;
  },
  signalSendCallback(signal: unknown) {
    void signal;
  },
}).initPlugin();

const replayer = new Replayer([], {
  plugins: [
    getReplayConsolePlugin(),
    getReplayNetworkPlugin({
      onNetworkData(data) {
        void data;
      },
    }),
    getReplaySequentialIdPlugin(),
    canvasReplayPlugin,
  ],
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
