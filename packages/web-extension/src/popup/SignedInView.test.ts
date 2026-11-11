// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { SignedInView } from './SignedInView';
import { RecorderStatus } from '~/types';
import type { ActiveRecording } from './account';

const account = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};

let root: Root;
let container: HTMLDivElement;

function renderNote(status: RecorderStatus, active: ActiveRecording) {
  act(() =>
    root.render(
      createElement(
        ChakraProvider,
        null,
        createElement(SignedInView, {
          account,
          orgs: [{ id: 'org_1', name: 'Acme' }],
          email: 'user@example.com',
          recorder: {
            status,
            active,
            startTime: null,
            errorMessage: null,
            toggle: () => undefined,
            pause: () => undefined,
            resume: () => undefined,
          },
          orgSwitch: { name: 'idle' },
          dashboardUrl: 'https://app.rrweb.com',
          onPickOrg: () => undefined,
          onLogOut: () => undefined,
        }),
      ),
    ),
  );
  return container.textContent ?? '';
}

describe('SignedInView recording note', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  it('says an offline recording started before sign-in stays in this browser', () => {
    const text = renderNote(RecorderStatus.RECORDING, 'offline');
    expect(text).toContain('Saved in this browser only');
    expect(text).not.toContain('Uploads to rrweb');
    expect(text).not.toContain('Inputs are masked');
  });

  it('says a new or running cloud recording uploads with masked inputs', () => {
    expect(renderNote(RecorderStatus.IDLE, 'not-recording')).toContain(
      'Uploads to rrweb. Inputs are masked.',
    );
    expect(renderNote(RecorderStatus.RECORDING, 'cloud')).toContain(
      'Uploads to rrweb. Inputs are masked.',
    );
  });
});
