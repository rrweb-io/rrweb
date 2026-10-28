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

  describe('bucket boundaries', () => {
    it.each([
      [6, 10],
      [9, 10],
      [10, 10],
      [11, 20],
      [19, 20],
      [21, 30],
    ])('masks %i characters with %i stars', (length, maskedLength) => {
      expect(mask('a'.repeat(length))).toBe('*'.repeat(maskedLength));
    });

    it('applies buckets to textarea masking as well', () => {
      expect(
        mask('a'.repeat(11), {
          element: document.createElement('textarea'),
          tagName: 'textarea',
          type: null,
          maskInputOptions: { textarea: true, maskLengthStrategy: 'bucketed' },
        }),
      ).toBe('*'.repeat(20));
    });
  });
});
