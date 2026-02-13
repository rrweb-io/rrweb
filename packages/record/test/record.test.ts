import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { record } from '../src/index';

describe('record', () => {
  it('should be a function', () => {
    expect(typeof record).toBe('function');
  });
});

describe('bundle', () => {
  const distDir = resolve(__dirname, '../dist');
  const bundleFiles = readdirSync(distDir).filter(
    (f) => f.endsWith('.js') || f.endsWith('.cjs'),
  );

  it.each(bundleFiles)('%s should not contain postcss', (file) => {
    const content = readFileSync(resolve(distDir, file), 'utf-8').toLowerCase();
    expect(content).not.toContain('postcss');
  });
});
