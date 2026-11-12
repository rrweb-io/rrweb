// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

type FakeUser = {
  id: string;
  primaryEmailAddress: { emailAddress: string };
  getOrganizationMemberships: () => Promise<{
    data: { organization: { id: string; name: string } }[];
  }>;
};

const fake = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  listeners: [] as ((
    changes: Record<string, { newValue?: unknown }>,
  ) => void)[],
  auth: { isSignedIn: false },
  sentMessages: [] as string[],
  clerk: {
    user: null as FakeUser | null,
    organization: null as { id: string } | null,
    session: { getToken: () => Promise.resolve('token') },
    setActive: () => Promise.resolve(),
    signOut: (_: () => Promise<unknown>) =>
      Promise.resolve() as Promise<unknown>,
  },
}));

vi.mock('webextension-polyfill', () => {
  const emit = (key: string, newValue: unknown) =>
    fake.listeners.forEach((l) => l({ [key]: { newValue } }));
  return {
    default: {
      storage: {
        local: {
          get: (key: string) => Promise.resolve({ [key]: fake.store[key] }),
          set: (items: Record<string, unknown>) => {
            Object.assign(fake.store, items);
            Object.entries(items).forEach(([k, v]) => emit(k, v));
            return Promise.resolve();
          },
          remove: (key: string) => {
            delete fake.store[key];
            emit(key, undefined);
            return Promise.resolve();
          },
          onChanged: {
            addListener: (l: (typeof fake.listeners)[number]) =>
              fake.listeners.push(l),
            removeListener: (l: (typeof fake.listeners)[number]) => {
              fake.listeners = fake.listeners.filter((x) => x !== l);
            },
          },
        },
      },
      runtime: {
        onMessage: { addListener: () => undefined },
        sendMessage: (message: string) => {
          fake.sentMessages.push(message);
          return Promise.resolve();
        },
      },
    },
  };
});

vi.mock('@clerk/chrome-extension', () => ({
  useClerk: () => fake.clerk,
  useAuth: () => ({ isSignedIn: fake.auth.isSignedIn }),
  useUser: () => ({ user: fake.clerk.user }),
}));

import { useCloudAccount, type CloudAccountApi } from './useCloudAccount';
import { LocalDataKey } from '~/types';

const makeUser = (id: string, orgId: string): FakeUser => ({
  id,
  primaryEmailAddress: { emailAddress: `${id}@example.com` },
  getOrganizationMemberships: () =>
    Promise.resolve({ data: [{ organization: { id: orgId, name: orgId } }] }),
});

let api: CloudAccountApi | undefined;
function Probe() {
  api = useCloudAccount();
  return null;
}

let root: Root;
const render = () => act(async () => root.render(createElement(Probe)));
const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));

describe('useCloudAccount', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    fake.listeners = [];
    fake.sentMessages = [];
    fake.clerk.user = makeUser('user_1', 'org_1');
    fake.auth.isSignedIn = true;
    fake.store = {
      [LocalDataKey.cloudAccount]: {
        userId: 'user_1',
        orgId: 'org_1',
        orgName: 'org_1',
        publicKey: 'pk_1',
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ publicKey: 'pk_2' }),
        }),
      ),
    );
    root = createRoot(document.createElement('div'));
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it('forgets the stored user when they sign out on the website', async () => {
    fake.auth.isSignedIn = false;
    fake.clerk.user = null;
    await render();
    await settle();
    expect(api?.view.name).toBe('signed-out');
    expect(fake.store[LocalDataKey.cloudAccount]).toBeUndefined();
    // the background deletes the failed uploads of the user who signed out
    expect(fake.sentMessages.map((m) => JSON.parse(m) as unknown)).toEqual([
      { type: 'event', event: 'user-logged-out', detail: { userId: 'user_1' } },
    ]);
  });

  it('sets up the next signed-in user after a successful log out', async () => {
    await render();
    await settle();
    expect(api?.view.name).toBe('ready');

    let finishSignOut: (() => void) | undefined;
    fake.clerk.signOut = (afterSignOut) =>
      new Promise((resolve) => {
        finishSignOut = () => {
          fake.auth.isSignedIn = false;
          fake.clerk.user = null;
          void afterSignOut().then(resolve);
        };
      });
    await act(async () => api?.logOut());
    expect(api?.view.name).toBe('signing-out');

    await act(async () => finishSignOut?.());
    await render();
    await settle();
    expect(api?.view.name).toBe('signed-out');
    // the background deletes the failed uploads of the user who logged out
    expect(fake.sentMessages.map((m) => JSON.parse(m) as unknown)).toEqual([
      { type: 'event', event: 'user-logged-out', detail: { userId: 'user_1' } },
    ]);

    // A new Clerk session arrives while the page stays open.
    fake.clerk.user = makeUser('user_2', 'org_2');
    fake.auth.isSignedIn = true;
    await render();
    await settle();
    await settle();
    expect(api?.view).toMatchObject({
      name: 'ready',
      account: { userId: 'user_2', orgId: 'org_2', publicKey: 'pk_2' },
    });
  });

  it('setup skips an organization without a key when another has one', async () => {
    fake.store = {};
    fake.clerk.user = {
      ...makeUser('user_1', 'org_1'),
      getOrganizationMemberships: () =>
        Promise.resolve({
          data: [
            { organization: { id: 'org_empty', name: 'Empty' } },
            { organization: { id: 'org_keyed', name: 'Keyed' } },
          ],
        }),
    };
    fake.clerk.organization = { id: 'org_empty' };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve(
              url.endsWith('/org_keyed') ? { publicKey: 'pk_keyed' } : {},
            ),
        }),
      ),
    );
    await render();
    await settle();
    await settle();
    expect(api?.view).toMatchObject({
      name: 'ready',
      account: { orgId: 'org_keyed', publicKey: 'pk_keyed' },
    });
  });

  it('a pick without a key names the organization and keeps the current one', async () => {
    fake.clerk.user = {
      ...makeUser('user_1', 'org_1'),
      getOrganizationMemberships: () =>
        Promise.resolve({
          data: [
            { organization: { id: 'org_1', name: 'org_1' } },
            { organization: { id: 'org_empty', name: 'Empty' } },
          ],
        }),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
      ),
    );
    await render();
    await settle();
    await act(async () => api?.pickOrg({ id: 'org_empty', name: 'Empty' }));
    await settle();
    expect(api?.orgSwitch).toEqual({ name: 'no-key', orgName: 'Empty' });
    expect(api?.view).toMatchObject({
      name: 'ready',
      account: { orgId: 'org_1' },
    });
  });
});
