import { describe, expect, it } from 'vitest';
import { recordingKindOf } from '.';

describe('recordingKindOf', () => {
  it('reads a session stored before Cloud mode as of unknown masking', () => {
    // It may have been imported from a file with any content.
    expect(recordingKindOf({})).toBe('unknown');
  });

  it('keeps the kind a session was stored with', () => {
    expect(recordingKindOf({ recordedAs: 'cloud' })).toBe('cloud');
    expect(recordingKindOf({ recordedAs: 'offline' })).toBe('offline');
  });
});
