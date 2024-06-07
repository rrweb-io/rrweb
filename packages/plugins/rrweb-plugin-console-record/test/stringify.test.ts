/**
 * @vitest-environment jsdom
 */

import { stringify } from '../src/stringify';
import { describe, it, expect } from 'vitest';

describe('console record plugin', () => {
  it('can stringify bigint', () => {
    expect(stringify(BigInt(1))).toEqual('"1n"');
  });
});
