// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { SignedInView } from './SignedInView';
import { RecorderStatus } from '~/types';
import type { OrgSwitch } from '~/cloud/OrgPicker';

const account = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const orgs = [
  { id: 'org_1', name: 'Acme' },
  { id: 'org_2', name: 'Empty Org' },
];

let root: Root;
let container: HTMLDivElement;

function render(orgSwitch: OrgSwitch) {
  const recorder = {
    status: RecorderStatus.IDLE,
    active: 'not-recording' as const,
    startTime: null,
    errorMessage: null,
    toggle: vi.fn(),
    pause: () => undefined,
    resume: () => undefined,
    failedUploads: [],
    retryUpload: vi.fn(),
    discardUpload: vi.fn(),
  };
  act(() =>
    root.render(
      createElement(
        ChakraProvider,
        null,
        createElement(SignedInView, {
          account,
          orgs,
          email: 'user@example.com',
          recorder,
          orgSwitch,
          dashboardUrl: 'https://app.rrweb.com',
          storedMode: 'not-stored',
          onChooseMode: () => undefined,
          onPickOrg: () => undefined,
          onLogOut: () => undefined,
          onOpenSessions: () => undefined,
        }),
      ),
    ),
  );
}

describe('organization switch notices in the signed-in view', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => act(() => root.unmount()));

  it('no-key names the organization, links the dashboard and keeps the current organization selected', () => {
    render({ name: 'no-key', orgName: 'Empty Org' });
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe(
      "Empty Org isn't set up for recording yet. Open it in the Cloud dashboard to finish setting it up.",
    );
    const link = alert?.querySelector('a');
    expect(link?.textContent).toBe('Cloud dashboard');
    expect(link?.getAttribute('href')).toBe('https://app.rrweb.com');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(container.querySelector('select')?.value).toBe('org_1');
  });

  it('a generic failure keeps the retry message', () => {
    render({ name: 'failed' });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Could not switch organization. Try again.',
    );
  });

  it('shows no notice while idle', () => {
    render({ name: 'idle' });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
