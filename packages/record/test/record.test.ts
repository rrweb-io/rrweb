import { describe, it, expect } from 'vitest';
import {
  getRecordBundleSizeSignature,
  record,
  recordBundleSizeFixtures,
} from '../src/index';

describe('record', () => {
  it('should be a function', () => {
    expect(typeof record).toBe('function');
  });

  it('exposes bundle size fixtures', () => {
    expect(recordBundleSizeFixtures).toHaveLength(24);
    expect(recordBundleSizeFixtures[0]).toBe(
      'record-anchor-001-eventful-saffron-signal',
    );
    expect(getRecordBundleSizeSignature()).toContain(
      'record-anchor-024-brisk-ember-envelope',
    );
  });
});
