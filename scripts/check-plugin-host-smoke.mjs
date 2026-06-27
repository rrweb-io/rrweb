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
  rrdom: 'packages/rrdom',
  rrwebSnapshot: 'packages/rrweb-snapshot',
  rrweb: 'packages/rrweb',
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
      rrdom: packed.rrdom,
      rrweb: packed.rrweb,
      'rrweb-snapshot': packed.rrwebSnapshot,
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
      '@rrweb/utils': packed.utils,
      '@rrweb/replay': packed.replay,
      '@rrweb/rrweb-plugin-console-record': packed.consoleRecord,
      '@rrweb/rrweb-plugin-console-replay': packed.consoleReplay,
      rrdom: packed.rrdom,
      rrweb: packed.rrweb,
      'rrweb-snapshot': packed.rrwebSnapshot,
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
