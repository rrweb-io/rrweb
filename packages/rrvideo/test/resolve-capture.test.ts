import { resolveCapture } from '../src/config';

describe('resolveCapture', () => {
  it('keeps Playwright video as the default for webm output', () => {
    expect(resolveCapture({ input: 'a.json' })).toBe('playwright');
    expect(resolveCapture({ input: 'a.json', output: 'out.webm' })).toBe(
      'playwright',
    );
  });

  it('selects ffmpeg for mp4 output or an explicit fps', () => {
    expect(resolveCapture({ input: 'a.json', output: 'out.mp4' })).toBe(
      'ffmpeg',
    );
    expect(resolveCapture({ input: 'a.json', fps: 60 })).toBe('ffmpeg');
    expect(
      resolveCapture({
        input: 'a.json',
        output: 'out.webm',
        capture: 'ffmpeg',
      }),
    ).toBe('ffmpeg');
  });
});
