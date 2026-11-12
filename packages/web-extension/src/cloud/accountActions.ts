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

/** How connecting an organization ended. */
export type ConnectResult =
  | { name: 'connected' }
  | { name: 'no-key' }
  | { name: 'failed' }
  | { name: 'cancelled' };

/** Puts the Clerk session (shared with the dashboard) back on the stored org. */
async function restoreActiveOrg(clerk: ConnectClerk): Promise<void> {
  const stored = (await Browser.storage.local.get(LocalDataKey.cloudAccount))[
    LocalDataKey.cloudAccount
  ] as CloudAccount | undefined;
  if (!stored) return;
  try {
    await clerk.setActive({ organization: stored.orgId });
  } catch (error) {
    console.error('Could not restore the previous organization:', error);
  }
}

/**
 * Makes `org` active, fetches its public key and stores the account with the
 * signed-in user's id. Without a key (`no-key`) or a token or key lookup
 * (`failed`) it stores nothing and makes the stored account's organization
 * active again. `cancelled` means `isCancelled` turned true before the write.
 */
export async function connectOrg(
  clerk: ConnectClerk,
  org: OrgOption,
  isCancelled: () => boolean,
): Promise<ConnectResult> {
  const userId = clerk.user?.id;
  if (!userId) return { name: 'failed' };
  await clerk.setActive({ organization: org.id });
  const token = await clerk.session?.getToken();
  const key = token
    ? await fetchPublicKey(org.id, token)
    : ({ name: 'failed' } as const);
  if (key.name !== 'key') {
    await restoreActiveOrg(clerk);
    return { name: key.name };
  }
  const account: CloudAccount = {
    userId,
    orgId: org.id,
    orgName: org.name,
    publicKey: key.publicKey,
  };
  if (isCancelled()) return { name: 'cancelled' };
  await Browser.storage.local.set({ [LocalDataKey.cloudAccount]: account });
  return { name: 'connected' };
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
