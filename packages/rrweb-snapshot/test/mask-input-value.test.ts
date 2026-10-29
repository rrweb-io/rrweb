/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { maskInputValue } from '../src/utils';

type MaskArguments = Parameters<typeof maskInputValue>[0];

function mask(value: string | null, overrides: Partial<MaskArguments> = {}) {
  return maskInputValue({
    element: document.createElement('input'),
    tagName: 'input',
    type: 'text',
    maskInputOptions: { text: true, maskLengthStrategy: 'bucketed' },
    value,
    ...overrides,
  });
}

describe('maskInputValue length strategies', () => {
  it.each([null, ''])('keeps an empty value (%s) empty', (value) => {
    expect(mask(value)).toBe('');
  });

  it.each([undefined, 'fixed'] as const)(
    'preserves character-count masking with strategy %s',
    (maskLengthStrategy) => {
      expect(
        mask('private input', {
          maskInputOptions: { text: true, maskLengthStrategy },
        }),
      ).toBe('*************');
    },
  );

  it('does not enable masking just by selecting a strategy', () => {
    expect(
      mask('private input', {
        maskInputOptions: { maskLengthStrategy: 'bucketed' },
      }),
    ).toBe('private input');
  });

  it('allows a field type to explicitly disable masking', () => {
    expect(
      mask('private input', {
        maskInputOptions: { text: false, maskLengthStrategy: 'bucketed' },
      }),
    ).toBe('private input');
  });

  it('gives a custom mask function precedence over the length strategy', () => {
    const element = document.createElement('input');
    const maskInputFn = vi.fn(() => '[hidden]');

    expect(mask('private input', { element, maskInputFn })).toBe('[hidden]');
    expect(maskInputFn).toHaveBeenCalledTimes(1);
    expect(maskInputFn).toHaveBeenCalledWith('private input', element);
  });
});
