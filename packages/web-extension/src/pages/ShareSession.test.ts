// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { LocalDataKey, ServiceName } from '~/types';
import { config } from '~/config';
import { ACCOUNT_NOT_SET_UP_ERROR } from '~/background/sinks';
import { ACCOUNT_HREF } from '~/components/PageChrome';
import { ShareSession } from './ShareSession';

const fake = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  listeners: new Set<(changes: Record<string, unknown>) => void>(),
  sendMessage: (() => Promise.resolve(undefined)) as (
    message: string,
  ) => Promise<unknown>,
}));
const sendMessage = vi.fn((message: string) => fake.sendMessage(message));

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: (key: string) => Promise.resolve({ [key]: fake.store[key] }),
        onChanged: {
          addListener: (l: (changes: Record<string, unknown>) => void) =>
            fake.listeners.add(l),
          removeListener: (l: (changes: Record<string, unknown>) => void) =>
            fake.listeners.delete(l),
        },
      },
    },
    runtime: {
      onMessage: { addListener: () => undefined },
      sendMessage: (message: string) => sendMessage(message),
    },
  },
}));

const ACCOUNT = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const WARNING =
  "This uploads the recording to Acme in rrweb. Offline recordings don't mask form fields, so anything typed into forms on this page will be uploaded. Password fields stay masked.";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  fake.store = {};
  fake.listeners.clear();
  fake.sendMessage = () => Promise.resolve(undefined);
  sendMessage.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => {
    root.render(
      createElement(
        ChakraProvider,
        null,
        createElement(ShareSession, { sessionId: 'session-1' }),
      ),
    );
  });
}

function control(label: string) {
  const found = Array.from(
    document.body.querySelectorAll<HTMLElement>('button, a'),
  ).find((el) => el.textContent?.trim() === label);
  if (!found) throw new Error(`no control "${label}"`);
  return found;
}

const dialog = () => document.body.querySelector('[role="alertdialog"]');

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

async function renderFor(sessionId: string) {
  await act(async () => {
    root.render(
      createElement(
        ChakraProvider,
        null,
        createElement(ShareSession, { sessionId }),
      ),
    );
  });
}

describe('ShareSession', () => {
  it("does not carry one session's shared result over to another session", async () => {
    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    fake.sendMessage = () =>
      Promise.resolve({ name: 'shared', recordingId: 'rec-9' });
    await renderFor('session-1');
    await click(control('Share'));
    await click(control('Upload and share'));
    expect(control('Open in rrweb').getAttribute('href')).toContain('rec-9');

    await renderFor('session-2');
    expect(container.textContent).not.toContain('Open in rrweb');
    expect(control('Share')).toBeTruthy();
  });

  it('ignores an answer that arrives after the row shows another session', async () => {
    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    let answer: (value: unknown) => void = () => undefined;
    fake.sendMessage = () => new Promise((resolve) => (answer = resolve));
    await renderFor('session-1');
    await click(control('Share'));
    await click(control('Upload and share'));
    await renderFor('session-2');
    await act(async () => answer({ name: 'shared', recordingId: 'rec-9' }));
    expect(container.textContent).not.toContain('Open in rrweb');
    expect(control('Share')).toBeTruthy();
  });

  it('finishes a pending share in the organization it started in', async () => {
    fake.store[LocalDataKey.cloudAccount] = {
      ...ACCOUNT,
      orgId: 'org_2',
      orgName: 'Beta',
    };
    fake.store[LocalDataKey.sharedSessions] = {
      'session-1': {
        state: 'pending',
        recordingId: 'rec-1',
        userId: 'user_1',
        orgId: 'org_1',
        orgName: 'Acme',
      },
    };
    await render();
    await click(control('Share'));
    expect(dialog()?.textContent).toContain(
      'Finish uploading this recording to Acme?',
    );
    expect(dialog()?.textContent).not.toContain('Beta');
  });

  it('asks to finish setting up an account stored without its user', async () => {
    const { userId: _userId, ...withoutUser } = ACCOUNT;
    fake.store[LocalDataKey.cloudAccount] = withoutUser;
    await render();
    await click(control('Share'));
    expect(container.textContent).toContain(ACCOUNT_NOT_SET_UP_ERROR);
    expect(dialog()).toBeNull();
    expect(sendMessage).not.toHaveBeenCalled();

    // Once the popup stores the user, Share asks to confirm as usual.
    act(() => root.unmount());
    root = createRoot(container);
    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    await render();
    await click(control('Share'));
    expect(dialog()?.textContent).toContain(WARNING);
  });

  it('warns before uploading, and Cancel sends nothing', async () => {
    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    await render();

    await click(control('Share'));
    expect(dialog()?.textContent).toContain('Share this recording?');
    expect(dialog()?.textContent).toContain(WARNING);
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(control('Cancel')),
    );

    await click(control('Cancel'));
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(sendMessage).not.toHaveBeenCalled();
    expect(control('Share')).toBeTruthy();

    // Confirming sends the share request for the account the dialog named.
    let answer: (value: unknown) => void = () => undefined;
    fake.sendMessage = () => new Promise((resolve) => (answer = resolve));
    await click(control('Share'));
    await click(control('Upload and share'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sendMessage.mock.calls[0][0])).toEqual({
      type: 'service',
      service: ServiceName.ShareSession,
      params: { sessionId: 'session-1', userId: 'user_1', orgId: 'org_1' },
    });
    expect(container.textContent).toContain('Uploading');

    await act(async () => answer({ name: 'shared', recordingId: 'rec-9' }));
    expect(control('Open in rrweb').getAttribute('href')).toBe(
      `${config.dashboardUrl}/recordings/rec-9`,
    );
  });

  it('shows the failure and lets Share be pressed again', async () => {
    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    fake.sendMessage = () =>
      Promise.resolve({ name: 'share-failed', errorMessage: 'Server down' });
    await render();
    await click(control('Share'));
    await click(control('Upload and share'));
    expect(container.textContent).toContain('Server down');
    await click(control('Share'));
    expect(dialog()?.textContent).toContain(WARNING);
  });

  it('asks to sign in without an account, and links a shared session', async () => {
    await render();
    // The Account page offers sign-up and log-in and connects the organization.
    const signIn = control('Sign in to share');
    expect(signIn.getAttribute('href')).toBe(ACCOUNT_HREF);
    expect(signIn.getAttribute('target')).toBeNull();
    expect(container.textContent).not.toContain('Open in rrweb');

    act(() => root.unmount());
    root = createRoot(container);
    // A share still pending offers Share again, which resumes it.
    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    fake.store[LocalDataKey.sharedSessions] = {
      'session-1': { state: 'pending', recordingId: 'rec-1' },
    };
    await render();
    expect(control('Share')).toBeTruthy();
    expect(container.textContent).not.toContain('Open in rrweb');

    act(() => root.unmount());
    root = createRoot(container);
    delete fake.store[LocalDataKey.cloudAccount];
    fake.store[LocalDataKey.sharedSessions] = {
      'session-1': { state: 'shared', recordingId: 'rec-1' },
    };
    await render();
    expect(control('Open in rrweb').getAttribute('href')).toBe(
      `${config.dashboardUrl}/recordings/rec-1`,
    );
    expect(container.textContent).not.toContain('Sign in to share');
  });

  it('offers Share as soon as the Account page connects an organization', async () => {
    await render();
    expect(control('Sign in to share')).toBeTruthy();

    fake.store[LocalDataKey.cloudAccount] = ACCOUNT;
    await act(async () => {
      fake.listeners.forEach((l) =>
        l({ [LocalDataKey.cloudAccount]: { newValue: ACCOUNT } }),
      );
    });
    expect(control('Share')).toBeTruthy();
    expect(container.textContent).not.toContain('Sign in to share');
  });
});
