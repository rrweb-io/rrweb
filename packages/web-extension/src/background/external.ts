import type { CloudAccount, Connection } from '~/types';

/**
 * The dashboard's messages to the extension, sent with
 * `chrome.runtime.sendMessage(extensionId, message)`. The dashboard builds
 * against the same shapes, so they change only together.
 */
export type ExternalReply =
  | {
      ok: true;
      version: string;
      connected: { orgId: string; orgName: string } | null;
    }
  | { ok: true }
  | { ok: false; error: string };

export type ExternalMessageDeps = {
  /** The dashboard origin, the only one whose messages are accepted. */
  dashboardOrigin: string;
  version: string;
  getConnection: () => Promise<Connection>;
  storeAccount: (account: CloudAccount) => Promise<void>;
  removeAccount: () => Promise<void>;
};

export const WRONG_ORIGIN_ERROR = 'Only the rrweb dashboard can do this.';
export const MALFORMED_MESSAGE_ERROR =
  'The extension cannot read this message.';
export const STORAGE_ERROR = 'The extension could not save the change.';

const filled = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

/**
 * Answer one message from a web page. Only the dashboard origin is heard;
 * anything else, or a malformed message, changes nothing. Never rejects.
 */
export async function answerExternalMessage(
  message: unknown,
  sender: { origin?: string },
  deps: ExternalMessageDeps,
): Promise<ExternalReply> {
  if (sender.origin !== deps.dashboardOrigin)
    return { ok: false, error: WRONG_ORIGIN_ERROR };
  if (typeof message !== 'object' || message === null)
    return { ok: false, error: MALFORMED_MESSAGE_ERROR };
  const fields = message as Record<string, unknown>;
  try {
    switch (fields.type) {
      case 'rrweb-extension-status': {
        const connection = await deps.getConnection();
        return {
          ok: true,
          version: deps.version,
          connected:
            connection.name === 'connected'
              ? {
                  orgId: connection.account.orgId,
                  orgName: connection.account.orgName,
                }
              : null,
        };
      }
      case 'rrweb-extension-connect': {
        const { orgId, orgName, publicKey } = fields;
        if (!filled(orgId) || !filled(orgName) || !filled(publicKey))
          return { ok: false, error: MALFORMED_MESSAGE_ERROR };
        await deps.storeAccount({ orgId, orgName, publicKey });
        return { ok: true };
      }
      case 'rrweb-extension-disconnect':
        await deps.removeAccount();
        return { ok: true };
      default:
        return { ok: false, error: MALFORMED_MESSAGE_ERROR };
    }
  } catch (error) {
    console.error('Could not answer the dashboard:', error);
    return { ok: false, error: STORAGE_ERROR };
  }
}
