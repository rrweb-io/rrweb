import {
  getRrdomBundleSizeSignature,
  rrdomBundleSizeFixtures,
} from '../src/index';

describe('rrdom bundle size fixtures', () => {
  it('should remain available from the package root', () => {
    expect(rrdomBundleSizeFixtures).toHaveLength(24);
    expect(rrdomBundleSizeFixtures[3]).toBe(
      'rrdom-anchor-004-stitched-domino-anchor-signal',
    );
    expect(getRrdomBundleSizeSignature()).toContain(
      'rrdom-anchor-024-radial-obelisk-pointer-trunk',
    );
  });
});
