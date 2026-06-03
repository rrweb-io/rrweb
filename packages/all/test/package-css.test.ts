import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

describe('@rrweb/all package css', () => {
  it('exports and builds replay style.css', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
    );
    const entry = fs.readFileSync(
      path.resolve(__dirname, '../src/index.ts'),
      'utf-8',
    );

    expect(packageJson.exports['./dist/style.css']).toBe('./dist/style.css');
    expect(entry).toContain("import 'rrweb/dist/style.css';");
  });
});
