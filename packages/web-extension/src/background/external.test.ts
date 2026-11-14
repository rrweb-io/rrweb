import { describe, expect, it, vi } from 'vitest';
import type { CloudAccount, Connection } from '~/types';
import {
  answerExternalMessage,
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
    removeAccount: vi.fn(async () => undefined),
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

  it('disconnects', async () => {
    const deps = makeDeps({ name: 'connected', account });
    await expect(
      answerExternalMessage(
        { type: 'rrweb-extension-disconnect' },
        fromDashboard,
        deps,
      ),
    ).resolves.toEqual({ ok: true });
    expect(deps.removeAccount).toHaveBeenCalledOnce();
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
        { type: 'rrweb-extension-disconnect' },
      ])
        await expect(
          answerExternalMessage(message, sender, deps),
        ).resolves.toEqual({ ok: false, error: WRONG_ORIGIN_ERROR });
      expect(deps.getConnection).not.toHaveBeenCalled();
      expect(deps.storeAccount).not.toHaveBeenCalled();
      expect(deps.removeAccount).not.toHaveBeenCalled();
    }
  });

  it('refuses a malformed message and changes nothing', async () => {
    for (const message of [
      undefined,
      null,
      'rrweb-extension-status',
      {},
      { type: 'rrweb-extension-unknown' },
      { type: 'rrweb-extension-connect', orgId: 'org_1', orgName: 'Acme' },
      { type: 'rrweb-extension-connect', ...account, publicKey: '' },
      { type: 'rrweb-extension-connect', ...account, orgName: 7 },
    ]) {
      const deps = makeDeps();
      await expect(
        answerExternalMessage(message, fromDashboard, deps),
      ).resolves.toEqual({ ok: false, error: MALFORMED_MESSAGE_ERROR });
      expect(deps.storeAccount).not.toHaveBeenCalled();
      expect(deps.removeAccount).not.toHaveBeenCalled();
    }
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
  });
});
