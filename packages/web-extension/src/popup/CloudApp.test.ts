// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import type { CloudAccountView } from '~/cloud/useCloudAccount';

const fake = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  view: { name: 'signed-out' } as { name: string },
  failGet: false,
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: (key: string) =>
          fake.failGet
            ? Promise.reject(new Error('storage unavailable'))
            : Promise.resolve({ [key]: fake.store[key] }),
        set: (items: Record<string, unknown>) => {
          Object.assign(fake.store, items);
          return Promise.resolve();
        },
      },
    },
    runtime: { getURL: (path: string) => path },
  },
}));

vi.mock('~/cloud/CloudGate', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('~/cloud/useCloudAccount', () => ({
  useCloudAccount: () => ({
    view: fake.view,
    orgSwitch: { name: 'idle' },
    pickOrg: () => undefined,
    logOut: () => undefined,
    tryAgain: () => undefined,
  }),
}));

import CloudApp from './CloudApp';
import { SignedOutView } from './SignedOutView';
import { config } from '~/config';
import { LocalDataKey, RecorderStatus } from '~/types';
import type { RecorderControls } from './PopupParts';
import type { ActiveRecording } from './account';

const ready: CloudAccountView = {
  name: 'ready',
  account: {
    userId: 'user_1',
    orgId: 'org_1',
    orgName: 'Acme',
    publicKey: 'pk_acme',
  },
  orgs: [{ id: 'org_1', name: 'Acme' }],
  email: 'jane@example.com',
};

let root: Root;
let container: HTMLDivElement;

function controls(
  status = RecorderStatus.IDLE,
  active: ActiveRecording = 'not-recording',
): RecorderControls {
  return {
    status,
    active,
    startTime: null,
    errorMessage: null,
    toggle: vi.fn(),
    pause: () => undefined,
    resume: () => undefined,
    failedUploads: [],
    retryUpload: () => undefined,
    discardUpload: () => undefined,
  };
}

function makeLinks() {
  return {
    openUrl: vi.fn(),
    openSessions: vi.fn(),
    sessionUrl: () => '',
  };
}

/** Opens the popup and waits for the remembered choice to load. */
async function open(
  view: CloudAccountView,
  recorder = controls(),
  links = makeLinks(),
) {
  fake.view = view;
  await act(async () => {
    root.render(
      createElement(
        ChakraProvider,
        null,
        createElement(CloudApp, {
          recorder: { controls: recorder, newSession: null },
          links,
        }),
      ),
    );
  });
  await act(() => Promise.resolve());
  return { recorder, links };
}

async function reopen(...args: Parameters<typeof open>) {
  act(() => root.unmount());
  root = createRoot(container);
  return open(...args);
}

function radio(name: 'Cloud' | 'Offline'): HTMLButtonElement {
  const found = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  ).find((r) => r.textContent?.startsWith(name));
  if (!found) throw new Error(`no radio "${name}"`);
  return found;
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`no button "${label}"`);
  return found;
}

/** Every link or button whose visible text starts with `text`. */
function controlsNamed(text: string): Element[] {
  return Array.from(container.querySelectorAll('a, button')).filter((el) =>
    el.textContent?.trim().startsWith(text),
  );
}

const checked = (el: Element) => el.getAttribute('aria-checked') === 'true';

describe('the popup recording mode switch', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    fake.store = {};
    fake.failGet = false;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  it('signed in, Cloud is the default and sends the account ids', async () => {
    const { recorder } = await open(ready);
    expect(checked(radio('Cloud'))).toBe(true);
    expect(checked(radio('Offline'))).toBe(false);
    expect(container.textContent).toContain(
      'Uploads to Acme. Inputs are masked.',
    );
    act(() => button('Start recording').click());
    expect(recorder.toggle).toHaveBeenCalledWith({
      mode: 'cloud',
      userId: 'user_1',
      orgId: 'org_1',
    });
  });

  it('a failed read of the saved choice still lets you record', async () => {
    fake.failGet = true;
    const { recorder } = await open(ready);
    expect(checked(radio('Cloud'))).toBe(true);
    act(() => radio('Offline').click());
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
  });

  it('signed in, choosing Offline sends an offline start', async () => {
    const { recorder } = await open(ready);
    act(() => radio('Offline').click());
    expect(checked(radio('Offline'))).toBe(true);
    expect(container.textContent).toContain(
      'Saved in this browser only. You can share it later.',
    );
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
    expect(recorder.toggle).toHaveBeenCalledTimes(1);
  });

  it('the arrow keys move the choice and skip a disabled Cloud', async () => {
    await open(ready);
    const group = container.querySelector('[role="radiogroup"]')!;
    const press = (key: string) =>
      act(() => {
        group.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true }),
        );
      });
    press('ArrowRight');
    expect(checked(radio('Offline'))).toBe(true);
    expect(radio('Offline').tabIndex).toBe(0);
    expect(radio('Cloud').tabIndex).toBe(-1);
    press('ArrowLeft');
    expect(checked(radio('Cloud'))).toBe(true);

    await reopen({ name: 'signed-out' });
    press('ArrowLeft');
    expect(checked(radio('Offline'))).toBe(true);
    expect(checked(radio('Cloud'))).toBe(false);
  });

  it('the choice is remembered when the popup opens again', async () => {
    await open(ready);
    act(() => radio('Offline').click());
    expect(fake.store[LocalDataKey.recordingMode]).toBe('offline');

    const { recorder } = await reopen(ready);
    expect(checked(radio('Offline'))).toBe(true);
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });

    act(() => radio('Cloud').click());
    await reopen(ready);
    expect(checked(radio('Cloud'))).toBe(true);
  });

  it('signed out, Cloud is disabled and Offline records', async () => {
    // A stored Cloud choice must not leak into the signed-out view.
    fake.store[LocalDataKey.recordingMode] = 'cloud';
    const { recorder, links } = await open({ name: 'signed-out' });
    expect(radio('Cloud').disabled).toBe(true);
    expect(radio('Cloud').textContent).toContain('sign in');
    expect(checked(radio('Offline'))).toBe(true);
    act(() => radio('Cloud').click());
    expect(checked(radio('Cloud'))).toBe(false);
    expect(container.textContent).toContain('Saved in this browser only.');
    expect(container.textContent).not.toContain('share it later');
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
    expect(controlsNamed('Cloud dashboard')).toHaveLength(0);
    act(() => button('Sign up free').click());
    expect(links.openUrl).toHaveBeenCalledWith(`${config.dashboardUrl}/signup`);
    act(() => button('Offline sessions').click());
    expect(links.openSessions).toHaveBeenCalledTimes(1);
  });

  for (const stage of ['validating', 'setting-up', 'setup-slow'] as const) {
    it(`${stage}: Offline stays usable while Cloud waits`, async () => {
      fake.store[LocalDataKey.recordingMode] = 'cloud';
      const { recorder } = await open({ name: stage });
      expect(radio('Cloud').disabled).toBe(true);
      expect(checked(radio('Offline'))).toBe(true);
      expect(radio('Offline').disabled).toBe(false);
      expect(container.querySelector('[role="status"]')?.textContent).toMatch(
        stage === 'validating' ? /Checking your account/ : /Setting up/,
      );
      const record = button('Record offline');
      expect(record.disabled).toBe(false);
      act(() => record.click());
      expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
      expect(controlsNamed('Try again')).toHaveLength(
        stage === 'setup-slow' ? 1 : 0,
      );
    });
  }

  it('while recording, the switch is locked on the recording’s mode', async () => {
    fake.store[LocalDataKey.recordingMode] = 'cloud';
    const { recorder } = await open(
      ready,
      controls(RecorderStatus.RECORDING, 'offline'),
    );
    expect(radio('Cloud').disabled).toBe(true);
    expect(radio('Offline').disabled).toBe(true);
    expect(checked(radio('Offline'))).toBe(true);
    act(() => radio('Cloud').click());
    expect(checked(radio('Cloud'))).toBe(false);
    expect(fake.store[LocalDataKey.recordingMode]).toBe('cloud');
    act(() => button('Stop recording').click());
    expect(recorder.toggle).toHaveBeenCalledTimes(1);
  });

  it('while recording, the arrow keys do not change the choice', async () => {
    fake.store[LocalDataKey.recordingMode] = 'cloud';
    await open(ready, controls(RecorderStatus.PAUSED, 'cloud'));
    const group = container.querySelector('[role="radiogroup"]')!;
    act(() => {
      group.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    });
    expect(checked(radio('Cloud'))).toBe(true);
    expect(fake.store[LocalDataKey.recordingMode]).toBe('cloud');
  });

  it("each segment's link opens its place, and there is one of each", async () => {
    const { links } = await open(ready);
    const dashboard = controlsNamed('Cloud dashboard');
    expect(dashboard).toHaveLength(1);
    expect(dashboard[0].getAttribute('href')).toBe(config.dashboardUrl);
    expect(dashboard[0].getAttribute('target')).toBe('_blank');
    const sessions = controlsNamed('Offline sessions');
    expect(sessions).toHaveLength(1);
    act(() => (sessions[0] as HTMLButtonElement).click());
    expect(links.openSessions).toHaveBeenCalledTimes(1);
    expect(links.openUrl).not.toHaveBeenCalled();
  });
});

describe('the popup without sign-in (Firefox)', () => {
  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  it('shows no switch, records offline and links to offline sessions', () => {
    const recorder = controls();
    const onOpenSessions = vi.fn();
    act(() =>
      root.render(
        createElement(
          ChakraProvider,
          null,
          createElement(SignedOutView, {
            cloud: { name: 'unavailable' },
            recorder,
            newSession: null,
            onOpenSessions,
            sessionUrl: () => '',
          }),
        ),
      ),
    );
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(container.textContent).not.toContain('Cloud');
    expect(container.textContent).toContain('Saved in this browser only.');
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
    act(() => button('Offline sessions').click());
    expect(onOpenSessions).toHaveBeenCalledTimes(1);
  });
});
