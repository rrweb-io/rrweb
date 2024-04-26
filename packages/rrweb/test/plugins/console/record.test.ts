/**
 * @jest-environment jsdom
 */

import { stringify } from '../../../src/plugins/console/record/stringify';

describe('console record plugin', () => {
  it('can stringify bigint', () => {
    expect(stringify(BigInt(1))).toEqual('"1n"');
  });
});
