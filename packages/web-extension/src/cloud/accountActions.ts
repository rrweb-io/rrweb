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
 * Signs out, drops the stored account, then has the user's failed uploads
 * deleted, so the signed-out view never shows or uploads them. The callback
 * replaces Clerk's post-sign-out navigation, so extension pages stay where
 * they are. A failed sign-out leaves the account and the uploads in place.
 */
export async function signOutAccount(
  clerk: {
    user?: { id: string } | null;
    signOut: (callback: () => Promise<unknown>) => Promise<unknown>;
  },
  forgetUploadsOf: (userId: string) => void,
): Promise<void> {
  const userId = clerk.user?.id; // gone once signed out
  await clerk.signOut(() => removeStoredAccount());
  await removeStoredAccount();
  if (userId) forgetUploadsOf(userId);
}
