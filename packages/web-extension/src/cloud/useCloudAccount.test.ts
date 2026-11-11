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
});
