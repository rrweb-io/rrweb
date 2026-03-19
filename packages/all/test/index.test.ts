import { describe, expect, it } from 'vitest';
import { allBundleSizeFixtures, getAllBundleSizeSignature } from '../src/index';

describe('all bundle size fixtures', () => {
  it('should remain available from the package root', () => {
    expect(allBundleSizeFixtures).toHaveLength(24);
    expect(allBundleSizeFixtures[4]).toBe(
      'all-anchor-005-harbored-minimap-cascade-ridge',
    );
    expect(getAllBundleSizeSignature()).toContain(
      'all-anchor-024-factual-overlay-prairie-signal',
    );
  });
});
