import path from 'path';
import { readFileSync } from 'node:fs';
import { mergeConfig } from 'vite';
import baseConfig from '../../vite.config.default';

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, 'package.json'), 'utf-8'),
) as { version: string };

export default mergeConfig(
  baseConfig(path.resolve(__dirname, 'src/index.ts'), 'rrwebCloud'),
  { define: { __PKG_VERSION__: JSON.stringify(pkg.version) } },
);
