import Browser from 'webextension-polyfill';
import { LocalDataKey } from '~/types';
import type { CloudAccount } from '~/types';
import { fetchPublicKey } from '~/popup/account';
import type { OrgOption } from './OrgPicker';

/** The slice of Clerk that connecting an organization needs. */
export type ConnectClerk = {
  user?: { id: string } | null;
  setActive: (params: { organization: string }) => Promise<unknown>;
  session?: { getToken: () => Promise<string | null> } | null;
};

export const removeStoredAccount = () =>
  Browser.storage.local.remove(LocalDataKey.cloudAccount);

/**
 * Makes `org` active, fetches its public key and stores the account with the
 * signed-in user's id. Stores nothing and returns false without a user, a
 * token or a non-empty key, or when `isCancelled` turns true before the write.
 */
export async function connectOrg(
  clerk: ConnectClerk,
  org: OrgOption,
  isCancelled: () => boolean,
): Promise<boolean> {
  const userId = clerk.user?.id;
  if (!userId) return false;
  await clerk.setActive({ organization: org.id });
  const token = await clerk.session?.getToken();
  if (!token) return false;
  const publicKey = await fetchPublicKey(org.id, token);
  if (publicKey === null) return false;
  const account: CloudAccount = {
    userId,
    orgId: org.id,
    orgName: org.name,
    publicKey,
  };
  if (isCancelled()) return false;
  await Browser.storage.local.set({ [LocalDataKey.cloudAccount]: account });
  return true;
}

/**
 * Signs out and drops the stored account. The callback replaces Clerk's
 * post-sign-out navigation, so extension pages stay where they are. A failed
 * sign-out leaves the account in place.
 */
export async function signOutAccount(clerk: {
  signOut: (callback: () => Promise<unknown>) => Promise<unknown>;
}): Promise<void> {
  await clerk.signOut(() => removeStoredAccount());
  await removeStoredAccount();
}
