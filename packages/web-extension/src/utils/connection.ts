import type { CloudAccount, Connection } from '~/types';
import { filled } from '~/utils';

/**
 * The stored account, read from extension storage. Anything without a
 * non-empty organization ID, name and public key reads as not connected.
 * Other fields are ignored.
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
