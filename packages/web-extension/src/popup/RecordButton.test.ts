// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { SignedInView } from './SignedInView';
import { SignedOutView } from './SignedOutView';
import { RecorderStatus, type FailedUpload } from '~/types';
import type { RecorderControls } from './PopupParts';

const account = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};

let root: Root;
let container: HTMLDivElement;

function controls(failedUploads: FailedUpload[] = []): RecorderControls {
  return {
    status: RecorderStatus.IDLE,
    active: 'not-recording',
    startTime: null,
    errorMessage: null,
    toggle: vi.fn(),
    pause: () => undefined,
    resume: () => undefined,
    failedUploads,
    retryUpload: vi.fn(),
    discardUpload: vi.fn(),
  };
}

function render(view: ReactElement) {
  act(() => root.render(createElement(ChakraProvider, null, view)));
}

function button(label: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) throw new Error(`no button "${label}"`);
  return found;
}

const signedOut = (recorder: RecorderControls) =>
  createElement(SignedOutView, {
    cloud: { name: 'unavailable' },
    recorder,
    newSession: null,
    onOpenSessions: () => undefined,
    onOpenSettings: () => undefined,
    sessionUrl: () => '',
  });

describe('record buttons name their destination', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  it('"Start recording" asks for this user and organization', () => {
    const recorder = controls();
    render(
      createElement(SignedInView, {
        account,
        orgs: [{ id: 'org_1', name: 'Acme' }],
        email: 'user@example.com',
        recorder,
        orgSwitch: { name: 'idle' },
        dashboardUrl: 'https://app.rrweb.com',
        onPickOrg: () => undefined,
        onLogOut: () => undefined,
        onOpenSessions: () => undefined,
      }),
    );
    act(() => button('Start recording').click());
    expect(recorder.toggle).toHaveBeenCalledWith({
      mode: 'cloud',
      userId: 'user_1',
      orgId: 'org_1',
    });
  });

  it('"Record offline" asks for offline', () => {
    const recorder = controls();
    render(signedOut(recorder));
    act(() => button('Record offline').click());
    expect(recorder.toggle).toHaveBeenCalledWith({ mode: 'offline' });
  });

  const signedIn = (recorder: RecorderControls) =>
    createElement(SignedInView, {
      account,
      orgs: [{ id: 'org_1', name: 'Acme' }],
      email: 'user@example.com',
      recorder,
      orgSwitch: { name: 'idle' },
      dashboardUrl: 'https://app.rrweb.com',
      onPickOrg: () => undefined,
      onLogOut: () => undefined,
      onOpenSessions: () => undefined,
    });
  const upload = (
    state: FailedUpload['state'],
    userId = 'user_1',
  ): FailedUpload => ({
    recordingId: 'rec-1',
    userId,
    title: 'Checkout',
    state,
  });

  it('a failed upload is named and offers a retry of that recording', () => {
    const recorder = controls([upload({ name: 'upload-failed' })]);
    render(signedIn(recorder));
    expect(container.textContent).toContain('Upload failed: Checkout');
    act(() => button('Retry upload').click());
    expect(recorder.retryUpload).toHaveBeenCalledWith('rec-1');
  });

  it('a retry in flight cannot be pressed again or discarded', () => {
    const recorder = controls([upload({ name: 'retrying' })]);
    render(signedIn(recorder));
    expect(button('Retrying upload').disabled).toBe(true);
    expect(button('Discard').disabled).toBe(true);
    act(() => button('Retrying upload').click());
    expect(recorder.retryUpload).not.toHaveBeenCalled();
  });

  it('a failed retry shows its reason and can be retried', () => {
    const recorder = controls([
      upload({ name: 'retry-failed', errorMessage: 'Failed to fetch' }),
    ]);
    render(signedIn(recorder));
    expect(container.textContent).toContain('Retry failed: Failed to fetch');
    act(() => button('Retry upload').click());
    expect(recorder.retryUpload).toHaveBeenCalledWith('rec-1');
  });

  it('discard asks inside the popup first, and "Keep" keeps it', () => {
    const recorder = controls([upload({ name: 'upload-failed' })]);
    render(signedIn(recorder));
    act(() => button('Discard').click());
    expect(recorder.discardUpload).not.toHaveBeenCalled();
    expect(container.textContent).toContain('cannot be recovered');
    act(() => button('Keep').click());
    expect(recorder.discardUpload).not.toHaveBeenCalled();
    act(() => button('Discard').click());
    act(() => button('Discard recording').click());
    expect(recorder.discardUpload).toHaveBeenCalledWith('rec-1');
  });

  it("shows only this user's failed uploads, none when signed out, and never a delivered one", () => {
    const recorder = controls([
      upload({ name: 'upload-failed' }, 'user_2'),
      { ...upload({ name: 'delivered' }), recordingId: 'rec-2' },
    ]);
    render(signedIn(recorder));
    expect(container.textContent).not.toContain('Upload failed');
    const mine = controls([upload({ name: 'upload-failed' })]);
    render(signedOut(mine));
    expect(container.textContent).not.toContain('Upload failed');
  });
});
