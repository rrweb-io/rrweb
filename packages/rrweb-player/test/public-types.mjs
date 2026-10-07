// A warm build can hide missing generated declarations. Start with no Svelte output,
// then compile as a TypeScript consumer; the fixture also rejects accidental `any`.
import { readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
async function removeGenerated(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(
      entry.name + (entry.isDirectory() ? '/' : ''),
      directory,
    );
    if (entry.isDirectory()) await removeGenerated(path);
    else if (entry.name.endsWith('.svelte.d.ts')) await rm(path);
  }
}
await removeGenerated(new URL('../src/', import.meta.url));
await rm(new URL('../types/', import.meta.url), {
  recursive: true,
  force: true,
});
for (const [command, args] of [
  [
    resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js'),
    ['build'],
  ],
  [
    require.resolve('typescript/bin/tsc'),
    [
      'test/public-types.fixture.ts',
      '--noEmit',
      '--skipLibCheck',
      '--lib',
      'es2020,dom',
      '--moduleResolution',
      'node',
      '--target',
      'es2020',
    ],
  ],
]) {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Clean-build public TypeScript API checks passed.');
