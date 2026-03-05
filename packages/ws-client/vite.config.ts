import path from 'path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mergeConfig } from 'vite';
import baseConfig from '../../vite.config.default';

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

const gitCwd = { cwd: path.resolve(__dirname, '../../'), encoding: 'utf-8' as const };
const commitHash = spawnSync('git', ['rev-parse', 'HEAD'], gitCwd).stdout.trim();
const isDirty = spawnSync('git', ['status', '--porcelain'], gitCwd).stdout.trim() !== '';
const commitRef = isDirty ? `${commitHash}-dirty` : commitHash;

export default mergeConfig(
  baseConfig(path.resolve(__dirname, 'src/index.ts'), 'rrwebCloud'),
  { define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
    __COMMIT_HASH__: JSON.stringify(commitRef),
  } },
);
