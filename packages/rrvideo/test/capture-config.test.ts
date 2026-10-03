import { resolveConfig } from '../src/config';

describe('frame capture configuration', () => {
  it.each([0, -1, NaN, Infinity])(
    'rejects invalid fps %s before launching',
    (fps) => {
      expect(() => resolveConfig({ input: 'events.json', fps })).toThrow(/fps/);
    },
  );
  it('rejects compositor frame rates above the millisecond clock precision', () => {
    expect(() =>
      resolveConfig({ input: 'events.json', capture: 'compositor', fps: 1001 }),
    ).toThrow(/fps/);
  });
  it('rejects a frame delay that reaches the capture timeout', () => {
    expect(() =>
      resolveConfig({
        input: 'events.json',
        capture: 'ffmpeg',
        frameDelayMs: 1000,
        captureTimeoutMs: 1000,
      }),
    ).toThrow(/frameDelayMs.*captureTimeoutMs|captureTimeoutMs.*frameDelayMs/);
  });
  it('rejects unknown capture methods instead of silently recording WebM', () => {
    expect(() =>
      resolveConfig({ input: 'events.json', capture: 'typo' as never }),
    ).toThrow(/capture/);
  });
  it('uses MP4 and unscaled dimensions for compositor capture', () => {
    const config = resolveConfig({
      input: 'events.json',
      capture: 'compositor' as never,
    });
    expect(config.output).toMatch(/\.mp4$/);
    expect(config.resolutionRatio).toBe(1);
  });
  it('rejects inactivity skipping because it changes the fixed output timeline', () => {
    expect(() =>
      resolveConfig({
        input: 'events.json',
        capture: 'ffmpeg',
        rrwebPlayer: { skipInactive: true },
      }),
    ).toThrow(/skipInactive/);
  });
});
