/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { bucketMasker } from '../src';

describe('bucket boundaries', () => {
  it('caps a textarea bucket when only maxlength is set', () => {
    const element = document.createElement('textarea');
    element.maxLength = 8;

    expect(bucketMasker('1234567890', element)).toHaveLength(8);

    // 6, expanded to 10. clamped to 8
    expect(bucketMasker('123456', element)).toHaveLength(8);

    expect(bucketMasker('12345', element)).toHaveLength(5);
  });

  it.each([
    [6, 10],
    [9, 10],
    [10, 10],
    [11, 20],
    [19, 20],
    [21, 30],
  ])('masks %i characters with %i stars', (length, maskedLength) => {
    expect(
      bucketMasker('a'.repeat(length), document.createElement('input')),
    ).toBe('*'.repeat(maskedLength));
  });
});
