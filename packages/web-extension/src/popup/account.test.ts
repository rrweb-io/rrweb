import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeRecording,
  checkAccount,
  derivePopupState,
  recordButtonLook,
  recordingNote,
  shownMode,
  parseStoredMode,
  fetchPublicKey,
  SETUP_SLOW_AFTER_MS,
} from './account';
import { RecorderStatus } from '~/types';
import type { CloudAccount } from '~/types';

const orgs = [{ id: 'org_1', name: 'Acme' }];
const account: CloudAccount = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const base = {
  cloudEnabled: true,
  isSignedIn: true,
  userId: 'user_1',
  memberships: { name: 'loaded', list: orgs } as const,
  account: null,
  waitingSinceMs: 1000,
  nowMs: 1000,
};

describe('derivePopupState', () => {
  it('is signed-out when not signed in', () => {
    expect(derivePopupState({ ...base, isSignedIn: false })).toEqual({
      name: 'signed-out',
    });
  });

  it('is signed-out when cloud is disabled even if signed in', () => {
    expect(derivePopupState({ ...base, cloudEnabled: false, account })).toEqual(
      { name: 'signed-out' },
    );
  });

  it('is setting-up just before the slow threshold', () => {
    expect(
      derivePopupState({
        ...base,
        nowMs: base.waitingSinceMs + SETUP_SLOW_AFTER_MS - 1,
      }),
    ).toEqual({ name: 'setting-up' });
  });

  it('is setup-slow at exactly waitingSinceMs + 60000', () => {
    expect(SETUP_SLOW_AFTER_MS).toBe(60000);
    expect(
      derivePopupState({ ...base, nowMs: base.waitingSinceMs + 60000 }),
    ).toEqual({ name: 'setup-slow' });
  });

  it('is ready with the account and orgs when an account exists', () => {
    expect(derivePopupState({ ...base, account })).toEqual({
      name: 'ready',
      account,
      orgs,
    });
  });

  it('is ready even after the slow threshold once an account exists', () => {
    expect(derivePopupState({ ...base, account, nowMs: 10_000_000 })).toEqual({
      name: 'ready',
      account,
      orgs,
    });
  });

  it('is validating, never ready, while the membership lookup runs', () => {
    expect(
      derivePopupState({ ...base, account, memberships: { name: 'loading' } }),
    ).toEqual({ name: 'validating' });
  });

  it('is validating while the signed-in user is not known yet', () => {
    expect(derivePopupState({ ...base, account, userId: null })).toEqual({
      name: 'validating',
    });
  });

  it('is setting-up when the stored account belongs to another user', () => {
    expect(
      derivePopupState({ ...base, account: { ...account, userId: 'user_2' } }),
    ).toEqual({ name: 'setting-up' });
  });

  it('is setting-up when the stored account has no user', () => {
    const { userId: _, ...stored } = account;
    expect(
      derivePopupState({ ...base, account: stored as CloudAccount }),
    ).toEqual({ name: 'setting-up' });
  });

  it('is setting-up when the user is no longer a member of the organization', () => {
    expect(
      derivePopupState({
        ...base,
        account,
        memberships: { name: 'loaded', list: [{ id: 'org_9', name: 'Other' }] },
      }),
    ).toEqual({ name: 'setting-up' });
  });

  it('is setting-up when the membership lookup failed', () => {
    expect(
      derivePopupState({ ...base, account, memberships: { name: 'failed' } }),
    ).toEqual({ name: 'setting-up' });
  });
});

describe('checkAccount', () => {
  const input = {
    userId: 'user_1',
    memberships: { name: 'loaded', list: orgs } as const,
  };
  it('names each state of the stored account', () => {
    expect(checkAccount({ ...input, account: null })).toBe('no-account');
    expect(checkAccount({ ...input, account })).toBe('valid');
    expect(
      checkAccount({ ...input, account, memberships: { name: 'loading' } }),
    ).toBe('validating');
    expect(
      checkAccount({ ...input, account: { ...account, userId: 'user_2' } }),
    ).toBe('invalid');
    expect(
      checkAccount({ ...input, account, memberships: { name: 'failed' } }),
    ).toBe('invalid');
  });
});

describe('fetchPublicKey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stub = (impl: () => Promise<unknown>) => {
    const fn = vi.fn(impl);
    vi.stubGlobal('fetch', fn);
    return fn;
  };
  const json = (body: unknown, status = 200) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });

  it('returns the key and sends the Bearer header to the org route', async () => {
    const fetchMock = stub(() => json({ success: true, publicKey: 'pk_x' }));
    await expect(fetchPublicKey('org_1', 'tok_1')).resolves.toBe('pk_x');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url.endsWith('/get-public-key/org_1')).toBe(true);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok_1');
  });

  it.each([401, 403, 404])('returns null for status %i', async (status) => {
    stub(() => json({ success: true, publicKey: 'pk_x' }, status));
    await expect(fetchPublicKey('org_1', 'tok')).resolves.toBeNull();
  });

  it('returns null on a network error', async () => {
    stub(() => Promise.reject(new TypeError('offline')));
    await expect(fetchPublicKey('org_1', 'tok')).resolves.toBeNull();
  });

  it('returns null when the body has no publicKey', async () => {
    stub(() => json({ success: true }));
    await expect(fetchPublicKey('org_1', 'tok')).resolves.toBeNull();
  });

  it('returns null for an empty publicKey', async () => {
    stub(() => json({ success: true, publicKey: '' }));
    await expect(fetchPublicKey('org_1', 'tok')).resolves.toBeNull();
  });

  it('returns null when the body is not JSON', async () => {
    stub(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('bad')),
      }),
    );
    await expect(fetchPublicKey('org_1', 'tok')).resolves.toBeNull();
  });
});

describe('activeRecording', () => {
  it('does not claim a recording while a start is in flight', () => {
    expect(activeRecording({ status: RecorderStatus.STARTING })).toBe(
      'not-recording',
    );
    expect(
      activeRecording({ status: RecorderStatus.IDLE, kind: 'cloud' }),
    ).toBe('not-recording');
    expect(
      activeRecording({ status: RecorderStatus.PAUSED, kind: 'cloud' }),
    ).toBe('cloud');
  });
});

describe('recordingNote', () => {
  it('names the organization a cloud recording uploads to', () => {
    expect(recordingNote('cloud', { name: 'signed-in', orgName: 'Acme' })).toBe(
      'Uploads to Acme. Inputs are masked.',
    );
    expect(recordingNote('cloud', { name: 'setting-up' })).toBe(
      'Uploads to rrweb. Inputs are masked.',
    );
  });

  it('offers sharing later only to someone signed in', () => {
    expect(
      recordingNote('offline', { name: 'signed-in', orgName: 'Acme' }),
    ).toBe('Saved in this browser only. You can share it later.');
    expect(recordingNote('offline', { name: 'setting-up' })).toBe(
      'Saved in this browser only. You can share it later.',
    );
    expect(recordingNote('offline', { name: 'signed-out' })).toBe(
      'Saved in this browser only.',
    );
  });
});

describe('shownMode', () => {
  it('defaults to Cloud once ready, then follows the stored choice', () => {
    const ready = { active: 'not-recording', cloud: 'ready' } as const;
    expect(shownMode({ ...ready, stored: 'not-stored' })).toBe('cloud');
    expect(shownMode({ ...ready, stored: 'offline' })).toBe('offline');
    expect(shownMode({ ...ready, stored: 'cloud' })).toBe('cloud');
  });

  it('shows Offline while the account is not ready, whatever is stored', () => {
    expect(
      shownMode({
        active: 'not-recording',
        cloud: 'not-ready',
        stored: 'cloud',
      }),
    ).toBe('offline');
  });

  it("shows a running recording's own mode", () => {
    expect(
      shownMode({ active: 'offline', cloud: 'ready', stored: 'cloud' }),
    ).toBe('offline');
    expect(
      shownMode({ active: 'cloud', cloud: 'not-ready', stored: 'offline' }),
    ).toBe('cloud');
  });
});

describe('parseStoredMode', () => {
  it('reads only the two modes', () => {
    expect(parseStoredMode('offline')).toBe('offline');
    expect(parseStoredMode('cloud')).toBe('cloud');
    expect(parseStoredMode(undefined)).toBe('not-stored');
    expect(parseStoredMode('Cloud')).toBe('not-stored');
  });
});

describe('recordButtonLook', () => {
  it('keeps the idle look while starting and only marks the button busy', () => {
    // Disabling would fade the button under the cursor right after a click.
    expect(recordButtonLook(RecorderStatus.STARTING, false)).toEqual({
      label: 'idle',
      mark: 'dot',
      press: 'busy',
    });
  });

  it('is pressable when idle and when recording', () => {
    expect(recordButtonLook(RecorderStatus.IDLE, false)).toEqual({
      label: 'idle',
      mark: 'dot',
      press: 'enabled',
    });
    expect(recordButtonLook(RecorderStatus.RECORDING, false)).toEqual({
      label: 'stop',
      mark: 'square',
      press: 'enabled',
    });
  });

  it('is disabled only when the view disables it', () => {
    expect(recordButtonLook(RecorderStatus.IDLE, true).press).toBe('disabled');
    expect(recordButtonLook(RecorderStatus.STARTING, true).press).toBe(
      'disabled',
    );
  });
});
