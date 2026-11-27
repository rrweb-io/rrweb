import { describe, expect, it } from 'vitest';
import { parseConnection } from './connection';

const account = { orgId: 'org_1', orgName: 'Acme', publicKey: 'pk_acme' };

describe('parseConnection', () => {
  it('reads a stored account as connected', () => {
    expect(parseConnection(account)).toEqual({ name: 'connected', account });
  });

  it('reads anything without an organization and key as not connected', () => {
    for (const value of [
      undefined,
      null,
      'org_1',
      {},
      { ...account, orgId: '' },
      { ...account, orgName: 7 },
      { orgId: 'org_1', orgName: 'Acme' },
    ])
      expect(parseConnection(value)).toEqual({ name: 'not-connected' });
  });
});
