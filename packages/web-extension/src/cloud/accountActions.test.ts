import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        set: (items: Record<string, unknown>) => {
          Object.assign(store.data, items);
          return Promise.resolve();
        },
        remove: (key: string) => {
          delete store.data[key];
          return Promise.resolve();
        },
      },
    },
  },
}));

import { connectOrg, signOutAccount } from './accountActions';
import { LocalDataKey } from '~/types';
import type { CloudAccount } from '~/types';

const org = { id: 'org_2', name: 'Beta' };
const previous: CloudAccount = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};

function fakeClerk(token: string | null, userId: string | null = 'user_2') {
  return {
    user: userId === null ? null : { id: userId },
    setActive: vi.fn(() => Promise.resolve()),
    session: { getToken: () => Promise.resolve(token) },
  };
}

function stubKey(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) })),
  );
}

beforeEach(() => {
  store.data = { [LocalDataKey.cloudAccount]: previous };
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('connectOrg', () => {
  it('activates the org and stores the account with its key', async () => {
    stubKey({ publicKey: 'pk_beta' });
    const clerk = fakeClerk('tok');
    await expect(connectOrg(clerk, org, () => false)).resolves.toBe(true);
    expect(clerk.setActive).toHaveBeenCalledWith({ organization: 'org_2' });
    expect(store.data[LocalDataKey.cloudAccount]).toEqual({
      userId: 'user_2',
      orgId: 'org_2',
      orgName: 'Beta',
      publicKey: 'pk_beta',
    });
  });

  it('keeps the previous account when the key is empty', async () => {
    stubKey({ publicKey: '' });
    await expect(connectOrg(fakeClerk('tok'), org, () => false)).resolves.toBe(
      false,
    );
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('keeps the previous account when there is no session token', async () => {
    stubKey({ publicKey: 'pk_beta' });
    await expect(connectOrg(fakeClerk(null), org, () => false)).resolves.toBe(
      false,
    );
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('keeps the previous account when no user is signed in', async () => {
    stubKey({ publicKey: 'pk_beta' });
    await expect(
      connectOrg(fakeClerk('tok', null), org, () => false),
    ).resolves.toBe(false);
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('keeps the previous account when cancelled before the write', async () => {
    stubKey({ publicKey: 'pk_beta' });
    await expect(connectOrg(fakeClerk('tok'), org, () => true)).resolves.toBe(
      false,
    );
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });
});

describe('signOutAccount', () => {
  it('clears the stored account once sign-out completes', async () => {
    await signOutAccount({ signOut: () => Promise.resolve() });
    expect(LocalDataKey.cloudAccount in store.data).toBe(false);
  });

  it('clears the account from the callback that replaces the redirect', async () => {
    await signOutAccount({
      signOut: async (callback) => {
        await callback();
        expect(LocalDataKey.cloudAccount in store.data).toBe(false);
      },
    });
  });

  it('keeps the account and rejects when sign-out fails', async () => {
    await expect(
      signOutAccount({ signOut: () => Promise.reject(new Error('offline')) }),
    ).rejects.toThrow('offline');
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });
});
