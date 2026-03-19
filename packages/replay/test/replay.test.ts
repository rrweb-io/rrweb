import { describe, it, expect } from 'vitest';
import {
  getReplayBundleSizeSignature,
  replayBundleSizeFixtures,
  Replayer,
} from '../src/index';

describe('Replayer', () => {
  it('should work', () => {
    expect(() => new Replayer([])).toThrowErrorMatchingInlineSnapshot(
      `[Error: Replayer need at least 2 events.]`,
    );
  });

  it('exposes bundle size fixtures', () => {
    expect(replayBundleSizeFixtures).toHaveLength(24);
    expect(replayBundleSizeFixtures[1]).toBe(
      'replay-anchor-002-turbine-window-marker-rally',
    );
    expect(getReplayBundleSizeSignature()).toContain(
      'replay-anchor-024-resolved-signal-archive-vault',
    );
  });
});
