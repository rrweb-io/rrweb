import type { CloudAccount, Connection } from '~/types';

const filled = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

/**
 * The stored account, read from extension storage. Anything without a
 * non-empty organization ID, name and public key reads as not connected.
 * Other fields, such as the `userId` older builds stored, are ignored.
 */
export function parseConnection(value: unknown): Connection {
  if (typeof value !== 'object' || value === null)
    return { name: 'not-connected' };
  const { orgId, orgName, publicKey } = value as Record<string, unknown>;
  if (!filled(orgId) || !filled(orgName) || !filled(publicKey))
    return { name: 'not-connected' };
  const account: CloudAccount = { orgId, orgName, publicKey };
  return { name: 'connected', account };
}
