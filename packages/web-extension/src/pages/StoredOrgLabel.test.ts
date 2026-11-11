// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { existsSync, readFileSync, statSync } from 'fs';
import * as path from 'path';
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
  userId: 'user_1',
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
  it('shows the stored organization and follows storage changes', async () => {
    fake.store[LocalDataKey.cloudAccount] = account('Acme');
    await render();
    expect(container.textContent).toBe('Acme');

    await act(async () => store(account('Beta')));
    expect(container.textContent).toBe('Beta');

    // Log out elsewhere removes the account; the bar then shows nothing.
    await act(async () => store(undefined));
    expect(container.textContent).toBe('');

    // Signing in again, with the page still open, shows it again.
    await act(async () => store(account('Gamma')));
    expect(container.textContent).toBe('Gamma');
  });

  it('shows nothing when no account is stored', async () => {
    await render();
    expect(container.textContent).toBe('');
  });
});

// Every bare package the entry reaches through its own source imports,
// static or dynamic, following `~/` and relative paths.
function packagesReachedFrom(entry: string) {
  const src = path.resolve(__dirname, '..');
  const seen = new Set<string>();
  const packages = new Set<string>();
  const resolve = (spec: string, from: string) => {
    const base = spec.startsWith('~/')
      ? path.join(src, spec.slice(2))
      : path.resolve(path.dirname(from), spec);
    for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
      const file = base + ext;
      if (existsSync(file) && statSync(file).isFile()) return file;
    }
    return null;
  };
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    const specs = [
      ...code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g),
    ].map((m) => m[1]);
    for (const spec of specs) {
      if (spec.startsWith('.') || spec.startsWith('~/')) {
        const target = resolve(spec, file);
        if (target) visit(target);
      } else packages.add(spec);
    }
  };
  visit(path.join(src, entry));
  return { packages: [...packages], files: [...seen] };
}

describe('the session list entry', () => {
  it('never imports Clerk', () => {
    const pages = packagesReachedFrom('pages/index.tsx');
    // The walk reaches the bar label, so it is following the real graph.
    expect(pages.files.some((f) => f.endsWith('StoredOrgLabel.tsx'))).toBe(
      true,
    );
    expect(pages.packages.filter((p) => p.startsWith('@clerk'))).toEqual([]);

    // The same walk does find Clerk from the Account page entry.
    const options = packagesReachedFrom('options/index.tsx');
    expect(options.packages.some((p) => p.startsWith('@clerk'))).toBe(true);
  });
});
