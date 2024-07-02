/**
 * @vitest-environment jsdom
 */

import { stringify } from '../src/stringify';
import { describe, it, expect } from 'vitest';

describe('console record plugin', () => {
  it('can stringify bigint', () => {
    expect(stringify(BigInt(1))).toEqual('"1n"');
  });

  it('does not truncate by default', () => {
    expect(stringify('a'.repeat(100))).toEqual('"' + "a".repeat(100) + '"');
  })

  it('truncates when a length limit is provided', () => {
    expect(stringify('a'.repeat(100), { stringLengthLimit: 10 })).toEqual('"' + "a".repeat(10) + '..."');
  })

  it('truncates with specified suffix when a length limit is provided', () => {
    expect(stringify('a'.repeat(100), { stringLengthLimit: 10, truncationSuffix: '...[truncated]' })).toEqual('"' + "a".repeat(10) + '...[truncated]"');
  })
});
