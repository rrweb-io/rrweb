import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: (key: string) => Promise.resolve({ [key]: store.data[key] }),
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
  it('activates the org, stores the account with its key and connects', async () => {
    stubKey({ publicKey: 'pk_beta' });
    const clerk = fakeClerk('tok');
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'connected',
    });
    expect(clerk.setActive).toHaveBeenCalledWith({ organization: 'org_2' });
    expect(store.data[LocalDataKey.cloudAccount]).toEqual({
      userId: 'user_2',
      orgId: 'org_2',
      orgName: 'Beta',
      publicKey: 'pk_beta',
    });
  });

  it('reports no-key, restores the previous active org and stores nothing', async () => {
    stubKey({ success: true });
    const clerk = fakeClerk('tok');
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'no-key',
    });
    expect(clerk.setActive.mock.calls).toEqual([
      [{ organization: 'org_2' }],
      [{ organization: 'org_1' }],
    ]);
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('reports failed and restores the previous active org when the key lookup fails', async () => {
    stubKey({}, false);
    const clerk = fakeClerk('tok');
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'failed',
    });
    expect(clerk.setActive).toHaveBeenLastCalledWith({ organization: 'org_1' });
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('leaves the active org alone when there is no stored account to restore', async () => {
    stubKey({ success: true });
    store.data = {};
    const clerk = fakeClerk('tok');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'no-key',
    });
    expect(clerk.setActive.mock.calls).toEqual([[{ organization: 'org_2' }]]);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('logs and still reports no-key when restoring the previous org fails', async () => {
    stubKey({ success: true });
    const clerk = fakeClerk('tok');
    clerk.setActive
      .mockImplementationOnce(() => Promise.resolve())
      .mockImplementationOnce(() => Promise.reject(new Error('clerk down')));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'no-key',
    });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('fails without a session token, restores, and keeps the previous account', async () => {
    stubKey({ publicKey: 'pk_beta' });
    const clerk = fakeClerk(null);
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'failed',
    });
    expect(clerk.setActive).toHaveBeenLastCalledWith({ organization: 'org_1' });
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('fails without touching Clerk when no user is signed in', async () => {
    stubKey({ publicKey: 'pk_beta' });
    const clerk = fakeClerk('tok', null);
    await expect(connectOrg(clerk, org, () => false)).resolves.toEqual({
      name: 'failed',
    });
    expect(clerk.setActive).not.toHaveBeenCalled();
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });

  it('reports cancelled and keeps the previous account when cancelled before the write', async () => {
    stubKey({ publicKey: 'pk_beta' });
    await expect(
      connectOrg(fakeClerk('tok'), org, () => true),
    ).resolves.toEqual({ name: 'cancelled' });
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
  });
});

describe('signOutAccount', () => {
  const clerk = (
    signOut: (cb: () => Promise<unknown>) => Promise<unknown>,
  ) => ({
    user: { id: 'user_1' },
    signOut,
  });

  it('clears the stored account once sign-out completes', async () => {
    await signOutAccount(
      clerk(() => Promise.resolve()),
      () => undefined,
    );
    expect(LocalDataKey.cloudAccount in store.data).toBe(false);
  });

  it('clears the account from the callback that replaces the redirect', async () => {
    await signOutAccount(
      clerk(async (callback) => {
        await callback();
        expect(LocalDataKey.cloudAccount in store.data).toBe(false);
      }),
      () => undefined,
    );
  });

  it("forgets the user's failed uploads once sign-out completes", async () => {
    const forgetUploadsOf = vi.fn();
    await signOutAccount(
      clerk(() => Promise.resolve()),
      forgetUploadsOf,
    );
    expect(forgetUploadsOf).toHaveBeenCalledWith('user_1');
  });

  it('keeps the account and the failed uploads, and rejects, when sign-out fails', async () => {
    const forgetUploadsOf = vi.fn();
    await expect(
      signOutAccount(
        clerk(() => Promise.reject(new Error('offline'))),
        forgetUploadsOf,
      ),
    ).rejects.toThrow('offline');
    expect(store.data[LocalDataKey.cloudAccount]).toEqual(previous);
    expect(forgetUploadsOf).not.toHaveBeenCalled();
  });
});
