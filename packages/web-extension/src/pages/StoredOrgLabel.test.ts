// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { LocalDataKey } from '~/types';
import { StoredOrgLabel } from './StoredOrgLabel';

const fake = vi.hoisted(() => ({
  store: {} as Record<string, unknown>,
  listeners: [] as ((
    changes: Record<string, { newValue?: unknown }>,
  ) => void)[],
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: (key: string) => Promise.resolve({ [key]: fake.store[key] }),
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
}));

function store(value: unknown) {
  fake.store[LocalDataKey.cloudAccount] = value;
  fake.listeners.forEach((l) =>
    l({ [LocalDataKey.cloudAccount]: { newValue: value } }),
  );
}

const account = (orgName: string) => ({
  orgId: 'org_' + orgName,
  orgName,
  publicKey: 'pk_' + orgName,
});

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  fake.store = {};
  fake.listeners = [];
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
      createElement(ChakraProvider, null, createElement(StoredOrgLabel)),
    );
  });
}

describe('StoredOrgLabel', () => {
  it('shows the connected organization and follows storage changes', async () => {
    fake.store[LocalDataKey.cloudAccount] = account('Acme');
    await render();
    expect(container.textContent).toBe('Acme');

    await act(async () => store(account('Beta')));
    expect(container.textContent).toBe('Beta');

    // Disconnecting elsewhere removes the account; the bar then shows nothing.
    await act(async () => store(undefined));
    expect(container.textContent).toBe('');

    // Connecting again, with the page still open, shows it again.
    await act(async () => store(account('Gamma')));
    expect(container.textContent).toBe('Gamma');
  });

  it('shows nothing when no organization is connected', async () => {
    await render();
    expect(container.textContent).toBe('');
  });
});
