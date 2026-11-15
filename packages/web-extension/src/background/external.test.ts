import { describe, expect, it, vi } from 'vitest';
import type { CloudAccount, Connection } from '~/types';
import {
  answerExternalMessage,
  createExternalListener,
  MALFORMED_MESSAGE_ERROR,
  STORAGE_ERROR,
  WRONG_ORIGIN_ERROR,
} from './external';

const DASHBOARD = 'https://app.rrweb.com';
const account: CloudAccount = {
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};

function makeDeps(connection: Connection = { name: 'not-connected' }) {
  return {
    dashboardOrigin: DASHBOARD,
    version: '2.2.2',
    getConnection: vi.fn(async () => connection),
    storeAccount: vi.fn(async (_account: CloudAccount) => undefined),
  };
}

const fromDashboard = { origin: DASHBOARD };

describe('answerExternalMessage', () => {
  it('reports the version and no organization before connecting', async () => {
    const deps = makeDeps();
    await expect(
      answerExternalMessage(
        { type: 'rrweb-extension-status' },
        fromDashboard,
        deps,
      ),
    ).resolves.toEqual({ ok: true, version: '2.2.2', connected: null });
  });

  it('reports the connected organization without its key', async () => {
    const deps = makeDeps({ name: 'connected', account });
    await expect(
      answerExternalMessage(
        { type: 'rrweb-extension-status' },
        fromDashboard,
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
      version: '2.2.2',
      connected: { orgId: 'org_1', orgName: 'Acme' },
    });
  });

  it('stores exactly the organization and key the dashboard connects', async () => {
    const deps = makeDeps();
    const reply = await answerExternalMessage(
      { type: 'rrweb-extension-connect', ...account, extra: 'ignored' },
      fromDashboard,
      deps,
    );
    expect(reply).toEqual({ ok: true });
    expect(deps.storeAccount).toHaveBeenCalledWith(account);
  });

  it('changes nothing for any other origin', async () => {
    for (const sender of [
      {},
      { origin: 'https://evil.example' },
      { origin: 'http://app.rrweb.com' },
      { origin: 'https://app.rrweb.com.evil.example' },
    ]) {
      const deps = makeDeps();
      for (const message of [
        { type: 'rrweb-extension-status' },
        { type: 'rrweb-extension-connect', ...account },
      ])
        await expect(
          answerExternalMessage(message, sender, deps),
        ).resolves.toEqual({ ok: false, error: WRONG_ORIGIN_ERROR });
      expect(deps.getConnection).not.toHaveBeenCalled();
      expect(deps.storeAccount).not.toHaveBeenCalled();
    }
  });

  it('refuses a malformed message and changes nothing', async () => {
    for (const message of [
      undefined,
      null,
      'rrweb-extension-status',
      {},
      { type: 'rrweb-extension-unknown' },
      // Disconnecting is the popup's job; the dashboard cannot ask for it.
      { type: 'rrweb-extension-disconnect' },
      { type: 'rrweb-extension-connect', orgId: 'org_1', orgName: 'Acme' },
      {
        type: 'rrweb-extension-connect',
        orgName: 'Acme',
        publicKey: 'pk_acme',
      },
      { type: 'rrweb-extension-connect', ...account, orgId: '' },
      { type: 'rrweb-extension-connect', ...account, publicKey: '' },
      { type: 'rrweb-extension-connect', ...account, orgName: 7 },
    ]) {
      const deps = makeDeps();
      await expect(
        answerExternalMessage(message, fromDashboard, deps),
      ).resolves.toEqual({ ok: false, error: MALFORMED_MESSAGE_ERROR });
      expect(deps.storeAccount).not.toHaveBeenCalled();
    }
    // The same channel still connects a well formed message.
    const deps = makeDeps();
    await expect(
      answerExternalMessage(
        { type: 'rrweb-extension-connect', ...account },
        fromDashboard,
        deps,
      ),
    ).resolves.toEqual({ ok: true });
    expect(deps.storeAccount).toHaveBeenCalledWith(account);
  });

  it('answers with an error when storage fails', async () => {
    const deps = makeDeps();
    deps.storeAccount.mockRejectedValue(new Error('quota'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      answerExternalMessage(
        { type: 'rrweb-extension-connect', ...account },
        fromDashboard,
        deps,
      ),
    ).resolves.toEqual({ ok: false, error: STORAGE_ERROR });
    logged.mockRestore();

    // Once storage works again, the next connect is stored.
    deps.storeAccount.mockResolvedValue(undefined);
    await expect(
      answerExternalMessage(
        { type: 'rrweb-extension-connect', ...account },
        fromDashboard,
        deps,
      ),
    ).resolves.toEqual({ ok: true });
    expect(deps.storeAccount).toHaveBeenLastCalledWith(account);
  });
});

describe('createExternalListener', () => {
  /** One listener, as the worker registers it, and what it stored. */
  function listen(dashboardUrl: string) {
    const deps = makeDeps();
    const { version, getConnection, storeAccount } = deps;
    const listener = createExternalListener({
      dashboardUrl,
      version,
      getConnection,
      storeAccount,
    });
    const send = (sender: { origin?: string }, message: unknown) =>
      new Promise<unknown>((resolve) => {
        const keepsChannelOpen = listener(message, sender, resolve);
        expect(keepsChannelOpen).toBe(true);
      });
    const stored = () => deps.storeAccount.mock.calls.map(([a]) => a);
    return { send, stored };
  }
  const connect = { type: 'rrweb-extension-connect', ...account };

  it('connects from the configured dashboard origin', async () => {
    for (const dashboardUrl of [DASHBOARD, `${DASHBOARD}/`]) {
      const { send, stored } = listen(dashboardUrl);
      await expect(send({ origin: DASHBOARD }, connect)).resolves.toEqual({
        ok: true,
      });
      expect(stored()).toEqual([account]);
    }
  });

  it('changes nothing for a sender from another origin, and still hears the dashboard', async () => {
    const { send, stored } = listen(DASHBOARD);
    for (const sender of [
      { origin: 'https://evil.example' },
      // a page address is not an origin
      { origin: `${DASHBOARD}/` },
      {},
    ]) {
      await expect(send(sender, connect)).resolves.toEqual({
        ok: false,
        error: WRONG_ORIGIN_ERROR,
      });
    }
    expect(stored()).toEqual([]);
    // The same listener still connects the dashboard afterwards.
    await expect(send({ origin: DASHBOARD }, connect)).resolves.toEqual({
      ok: true,
    });
    expect(stored()).toEqual([account]);
  });
});
