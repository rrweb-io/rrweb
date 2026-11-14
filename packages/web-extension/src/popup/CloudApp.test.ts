// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import type { ConnectionView } from '~/utils/useConnection';

const fake = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  connection: { name: 'not-connected' } as { name: string },
  failGet: false,
  disconnect: (() => Promise.resolve()) as () => Promise<void>,
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

vi.mock('~/utils/useConnection', () => ({
  useConnection: () => fake.connection,
  disconnect: () => fake.disconnect(),
}));

import CloudApp from './CloudApp';
import { NotConnectedView } from './NotConnectedView';
import { config } from '~/config';
import { LocalDataKey } from '~/types';
import type { Destination, RecorderStatus } from '~/types';
import type { RecorderControls } from './PopupParts';

const ready: ConnectionView = {
  name: 'connected',
  account: { orgId: 'org_1', orgName: 'Acme', publicKey: 'pk_acme' },
};
const notConnected: ConnectionView = { name: 'not-connected' };
const CONNECT_URL = `${config.dashboardUrl}/extension/connect`;

let root: Root;
let container: HTMLDivElement;

const IDLE: RecorderStatus = { state: 'idle', lastError: { name: 'none' } };
const ACME: Destination = { name: 'organization', orgName: 'Acme' };
const OFFLINE: Destination = { name: 'stored-only' };

function running(
  state: 'recording' | 'paused',
  destination: Destination,
): RecorderStatus {
  const recording = { tabId: 1, startTimestamp: Date.now(), destination };
  return state === 'recording'
    ? { state, ...recording }
    : {
        state,
        ...recording,
        pausedTimestamp: Date.now(),
        lastError: { name: 'none' },
      };
}

function controls(status: RecorderStatus = IDLE): RecorderControls {
  return {
    status,
    error: { name: 'none' },
    toggle: vi.fn(),
    pause: () => undefined,
    resume: () => undefined,
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
  view: ConnectionView,
  recorder = controls(),
  links = makeLinks(),
) {
  fake.connection = view;
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

  it('connected, Cloud is the default and sends the organization', async () => {
    const { recorder } = await open(ready);
    expect(checked(radio('Cloud'))).toBe(true);
    expect(checked(radio('Offline'))).toBe(false);
    expect(container.textContent).toContain(
      'Uploads to Acme when you stop. Typed form input is masked.',
    );
    act(() => button('Start recording').click());
    expect(recorder.toggle).toHaveBeenCalledWith({
      mode: 'cloud',
      orgId: 'org_1',
    });
  });

  it('names the organization a running recording started with, not a newer connection', async () => {
    await open(
      ready,
      controls(
        running('recording', { name: 'organization', orgName: 'Old Org' }),
      ),
    );
    expect(container.textContent).toContain(
      'Uploads to Old Org when you stop. Typed form input is masked.',
    );
  });

  it('after a disconnect, a running cloud recording still names where it uploads', async () => {
    await open(
      notConnected,
      controls(
        running('recording', { name: 'organization', orgName: 'Old Org' }),
      ),
    );
    expect(container.textContent).toContain(
      'Uploads to Old Org when you stop.',
    );
    expect(container.textContent).not.toContain('Saved in this browser only');
    // Once it has finished, recording here is offline again.
    await open(notConnected);
    expect(container.textContent).toContain('Saved in this browser only.');
  });

  it('connected, it names the organization and offers to change or disconnect it', async () => {
    const disconnect = vi.fn(() => Promise.resolve());
    fake.disconnect = disconnect;
    const { links } = await open(ready);
    expect(container.textContent).toContain('Acme');
    act(() => button('Change organization').click());
    expect(links.openUrl).toHaveBeenCalledWith(CONNECT_URL);
    expect(disconnect).not.toHaveBeenCalled();
    act(() => button('Disconnect').click());
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('a failed read of the saved choice still lets you record', async () => {
    fake.failGet = true;
    const { recorder } = await open(ready);
    expect(checked(radio('Cloud'))).toBe(true);
    act(() => radio('Offline').click());
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
  });

  it('connected, choosing Offline sends an offline start', async () => {
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

  it('the arrow keys move the choice, connected or not', async () => {
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

    await reopen(notConnected);
    press('ArrowLeft');
    expect(checked(radio('Cloud'))).toBe(true);
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

  const POINTS = [
    'Share any recording with a link',
    'AI narration explains what happened in each session',
  ];

  it('not connected, choosing Cloud pitches connecting and offers no recording', async () => {
    const { recorder } = await open(notConnected);
    expect(radio('Cloud').disabled).toBe(false);
    act(() => radio('Cloud').click());
    expect(checked(radio('Cloud'))).toBe(true);
    expect(container.textContent).toContain('Save recordings to rrweb Cloud');
    const items = Array.from(container.querySelectorAll('li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(items).toEqual(POINTS);
    expect(controlsNamed('Connect your rrweb account')).toHaveLength(1);
    expect(controlsNamed('Create a free account')).toHaveLength(1);
    expect(controlsNamed('Record offline')).toHaveLength(0);
    expect(container.textContent).not.toContain('Saved in this browser only.');
    expect(controlsNamed('Cloud dashboard')).toHaveLength(0);
    expect(recorder.toggle).not.toHaveBeenCalled();
  });

  it('not connected, Offline is the default and records offline', async () => {
    const { recorder, links } = await open(notConnected);
    expect(checked(radio('Offline'))).toBe(true);
    expect(container.textContent).toContain('Saved in this browser only.');
    expect(container.textContent).not.toContain('share it later');
    expect(container.querySelectorAll('li')).toHaveLength(0);
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
    act(() => button('Connect your rrweb account').click());
    expect(links.openUrl).toHaveBeenCalledWith(CONNECT_URL);
    act(() => button('Offline sessions').click());
    expect(links.openSessions).toHaveBeenCalledTimes(1);
  });

  it('not connected, the pitch opens the connect page and the sign-up page', async () => {
    const { links } = await open(notConnected);
    act(() => radio('Cloud').click());
    act(() => button('Connect your rrweb account').click());
    expect(links.openUrl).toHaveBeenCalledWith(CONNECT_URL);
    act(() => button('Create a free account').click());
    // New accounts return to the connect page.
    expect(links.openUrl).toHaveBeenCalledWith(
      `${config.dashboardUrl}/signup?redirect_url=${encodeURIComponent(
        CONNECT_URL,
      )}`,
    );
  });

  it('a choice made before connecting is remembered, and Cloud carries over', async () => {
    await open(notConnected);
    act(() => radio('Cloud').click());
    expect(fake.store[LocalDataKey.recordingMode]).toBe('cloud');
    await reopen(notConnected);
    expect(checked(radio('Cloud'))).toBe(true);
    expect(container.textContent).toContain('Save recordings to rrweb Cloud');
    await reopen(ready);
    expect(checked(radio('Cloud'))).toBe(true);
    expect(controlsNamed('Start recording')).toHaveLength(1);

    act(() => radio('Offline').click());
    await reopen(notConnected);
    expect(checked(radio('Offline'))).toBe(true);
    expect(controlsNamed('Record offline')).toHaveLength(1);
  });

  it('while recording with nothing connected, the pitch never replaces the stop controls', async () => {
    fake.store[LocalDataKey.recordingMode] = 'cloud';
    for (const active of ['offline', 'cloud'] as const) {
      const { recorder } = await reopen(
        notConnected,
        controls(running('recording', active === 'cloud' ? ACME : OFFLINE)),
      );
      expect(radio('Cloud').disabled).toBe(true);
      expect(radio('Offline').disabled).toBe(true);
      expect(checked(radio(active === 'cloud' ? 'Cloud' : 'Offline'))).toBe(
        true,
      );
      expect(container.querySelectorAll('li')).toHaveLength(0);
      expect(container.textContent).not.toContain('Save recordings to rrweb');
      expect(container.textContent).toContain(
        active === 'cloud'
          ? 'Uploads to Acme when you stop.'
          : 'Saved in this browser only.',
      );
      act(() => button('Stop recording').click());
      expect(recorder.toggle).toHaveBeenCalledTimes(1);
    }
  });

  it('while recording, the switch is locked on the recording’s mode', async () => {
    fake.store[LocalDataKey.recordingMode] = 'cloud';
    const { recorder } = await open(
      ready,
      controls(running('recording', OFFLINE)),
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
    await open(ready, controls(running('paused', ACME)));
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

describe('the popup without Cloud (Firefox)', () => {
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
          createElement(NotConnectedView, {
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
