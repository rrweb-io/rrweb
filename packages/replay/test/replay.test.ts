import { describe, it, expect } from 'vitest';
import { Replayer } from '../src/index';

describe('Replayer', () => {
  it('should work', () => {
    expect(() => new Replayer([])).toThrowErrorMatchingInlineSnapshot(
      `[Error: Replayer need at least 2 events.]`,
    );
  });
});
