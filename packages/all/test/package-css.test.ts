import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vite-plus/test';

describe('@rrweb/all package css', () => {
  it('exports and builds replay style.css', () => {
    const stylePath = path.resolve(__dirname, '../dist/style.css');
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
    );
    const entry = fs.readFileSync(
      path.resolve(__dirname, '../src/index.ts'),
      'utf-8',
    );

    expect(fs.existsSync(stylePath)).toBe(true);
    expect(packageJson.exports['./dist/style.css']).toBe('./dist/style.css');
    expect(entry).toMatch(/import\s+['"]rrweb\/dist\/style\.css['"]/);
  });
});
