// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCaptionStyle } from '../src/caption-style';

// happy-dom accepts every value, so stand in for a browser's CSS parser.
const supports = vi.fn(
  (property: string, value: string) => !value.startsWith('invalid'),
);
function rejectInvalidCss() {
  vi.stubGlobal('CSS', { supports });
}

afterEach(() => {
  vi.unstubAllGlobals();
  supports.mockClear();
});

describe('resolveCaptionStyle', () => {
  it('keeps the default look when no style is given', () => {
    for (const style of [undefined, null, 'top', 42, {}]) {
      expect(resolveCaptionStyle(style)).toEqual({ position: 'bottom' });
    }
  });

  it('passes valid values through and outlines text with a shadow ring', () => {
    rejectInvalidCss();
    const style = resolveCaptionStyle({
      position: 'top-right',
      fontSize: '20px',
      color: '#ff0',
      background: 'rgba(0, 0, 0, 0.4)',
      outline: 'black',
    });
    expect(style).toMatchObject({
      position: 'top-right',
      fontSize: '20px',
      color: '#ff0',
      background: 'rgba(0, 0, 0, 0.4)',
    });
    expect(style.textShadow?.split(', ')).toHaveLength(8);
    expect(style.textShadow).toContain('0.06em 0.06em 0 black');
    expect(supports).toHaveBeenCalledWith('font-size', '20px');
    expect(supports).toHaveBeenCalledWith(
      'background-color',
      'rgba(0, 0, 0, 0.4)',
    );
  });

  it('drops unknown positions and values the browser cannot parse', () => {
    rejectInvalidCss();
    expect(
      resolveCaptionStyle({
        position: 'middle',
        fontSize: 'invalid-size',
        color: 42,
        background: 'invalid-color',
        outline: '  ',
      }),
    ).toEqual({ position: 'bottom' });
  });
});
