import { useCallback, useEffect, useRef, useState } from 'react';
import Browser from 'webextension-polyfill';
import { useAuth, useClerk, useUser } from '@clerk/chrome-extension';
import { LocalDataKey } from '~/types';
import type { CloudAccount, LocalData } from '~/types';
import {
  checkAccount,
  derivePopupState,
  KEY_POLL_INTERVAL_MS,
  type Memberships,
  type PopupState,
} from '~/popup/account';
import {
  connectOrg,
  removeStoredAccount,
  signOutAccount,
} from './accountActions';
import type { OrgOption, OrgSwitch } from './OrgPicker';

type StoredAccount =
  | { name: 'loading' }
  | { name: 'loaded'; account: CloudAccount | null };

/** Log out is in flight: no poll, no setting-up view, no account writes. */
type Session = { name: 'active' } | { name: 'signing-out' };

/** The organization lookup, tied to the user it was made for. */
type Orgs =
  | { name: 'loading' }
  | { name: 'loaded'; userId: string; list: OrgOption[] }
  | { name: 'failed'; userId: string };

/** What an extension page shows for the cloud account. */
export type CloudAccountView =
  | { name: 'loading' }
  | { name: 'signing-out' }
  | { name: 'signed-out' }
  | { name: 'validating' }
  | { name: 'setting-up' }
  | { name: 'setup-slow' }
  | {
      name: 'ready';
      account: CloudAccount;
      orgs: OrgOption[];
      email: string | null;
    };

export type CloudAccountApi = {
  view: CloudAccountView;
  orgSwitch: OrgSwitch;
  pickOrg: (org: OrgOption) => void;
  logOut: () => void;
  tryAgain: () => void;
};

function useStoredAccount(): StoredAccount {
  const [stored, setStored] = useState<StoredAccount>({ name: 'loading' });
  useEffect(() => {
    const read = (value: unknown) =>
      setStored({
        name: 'loaded',
        account: (value as CloudAccount | null | undefined) ?? null,
      });
    void Browser.storage.local
      .get(LocalDataKey.cloudAccount)
      .then((data) => read((data as LocalData)[LocalDataKey.cloudAccount]));
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      const change = changes[LocalDataKey.cloudAccount];
      if (change) read(change.newValue);
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    return () => Browser.storage.local.onChanged.removeListener(onChanged);
  }, []);
  return stored;
}

/**
 * The Clerk session, the stored account and the organization list, shared by
 * the popup and the account page. Render it inside `CloudGate`.
 */
export function useCloudAccount(): CloudAccountApi {
  const clerk = useClerk();
  // A new sign-up can hold a pending session until an organization is active.
  const { isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { user } = useUser();
  const stored = useStoredAccount();
  const [orgs, setOrgs] = useState<Orgs>({ name: 'loading' });
  const [waitingSinceMs, setWaitingSinceMs] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [orgSwitch, setOrgSwitch] = useState<OrgSwitch>({ name: 'idle' });
  const [session, setSession] = useState<Session>({ name: 'active' });
  // Read by in-flight connects, which outlive the render that started them.
  const signingOut = useRef(false);
  const signedIn = isSignedIn === true;

  const loadOrgs = useCallback(async (): Promise<OrgOption[]> => {
    const lookupUser = clerk.user;
    if (!lookupUser) return [];
    try {
      const page = await lookupUser.getOrganizationMemberships({
        pageSize: 100,
      });
      const list = page.data.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
      }));
      setOrgs({ name: 'loaded', userId: lookupUser.id, list });
      return list;
    } catch (error) {
      setOrgs({ name: 'failed', userId: lookupUser.id });
      throw error;
    }
  }, [clerk]);

  /** Cancelled when sign-out starts or the caller replaces the attempt. */
  const connect = useCallback(
    (org: OrgOption, isCancelled: () => boolean): Promise<boolean> =>
      connectOrg(clerk, org, () => isCancelled() || signingOut.current),
    [clerk],
  );

  const account = stored.name === 'loaded' ? stored.account : null;
  const userId = user?.id ?? null;
  // A lookup made for an earlier user says nothing about this one.
  const memberships: Memberships =
    orgs.name === 'loading' || orgs.userId !== userId
      ? { name: 'loading' }
      : orgs.name === 'failed'
      ? { name: 'failed' }
      : { name: 'loaded', list: orgs.list };
  const accountCheck = checkAccount({ account, userId, memberships });
  const state: PopupState = derivePopupState({
    cloudEnabled: true,
    isSignedIn: signedIn,
    userId,
    memberships,
    account,
    waitingSinceMs,
    nowMs,
  });
  const settingUp =
    session.name === 'active' &&
    (state.name === 'setting-up' || state.name === 'setup-slow');

  useEffect(() => {
    if (signedIn) void loadOrgs().catch(() => undefined);
  }, [signedIn, user?.id, loadOrgs]);

  // Log out ends once Clerk reports the user signed out, so the next session
  // on this page is set up again.
  useEffect(() => {
    if (session.name === 'signing-out' && !signedIn) {
      signingOut.current = false;
      setSession({ name: 'active' });
    }
  }, [session.name, signedIn]);

  // Signing out on the website must not leave the background uploading.
  useEffect(() => {
    if (state.name === 'signed-out' && account) void removeStoredAccount();
  }, [state.name, account]);

  // A stored account from another user, a left organization or a failed
  // lookup is dropped; setting up then connects the current user again.
  useEffect(() => {
    if (signedIn && accountCheck === 'invalid') void removeStoredAccount();
  }, [signedIn, accountCheck]);

  useEffect(() => {
    if (!settingUp) return;
    let cancelled = false;
    let busy = false;
    const attempt = async () => {
      if (busy) return;
      busy = true;
      setNowMs(Date.now());
      try {
        // Reload: a new sign-up may have no organization yet.
        const list = await loadOrgs();
        const org =
          list.find((o) => o.id === clerk.organization?.id) ?? list[0];
        if (org && !cancelled) await connect(org, () => cancelled);
      } catch {
        // Keep waiting; the next tick tries again.
      } finally {
        busy = false;
      }
    };
    void attempt();
    const timer = setInterval(() => void attempt(), KEY_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [settingUp, waitingSinceMs, loadOrgs, connect, clerk]);

  const pickOrg = (org: OrgOption) => {
    setOrgSwitch({ name: 'switching' });
    void connect(org, () => false)
      .catch(() => false)
      .then((ok) => setOrgSwitch(ok ? { name: 'idle' } : { name: 'failed' }));
  };

  const logOut = () => {
    signingOut.current = true;
    setSession({ name: 'signing-out' });
    signOutAccount(clerk).catch(() => {
      signingOut.current = false;
      setSession({ name: 'active' });
    });
  };

  const tryAgain = () => {
    const now = Date.now();
    setWaitingSinceMs(now);
    setNowMs(now);
  };

  const view: CloudAccountView =
    stored.name === 'loading'
      ? { name: 'loading' }
      : session.name === 'signing-out' && signedIn
      ? { name: 'signing-out' }
      : state.name === 'ready'
      ? {
          name: 'ready',
          account: state.account,
          orgs: state.orgs,
          email: user?.primaryEmailAddress?.emailAddress ?? null,
        }
      : { name: state.name };

  return { view, orgSwitch, pickOrg, logOut, tryAgain };
}
