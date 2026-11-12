import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import { BarLabel } from '~/components/PageChrome';
import { LocalDataKey } from '~/types';
import type { CloudAccount, LocalData } from '~/types';

/** The connected organization, as stored by the popup or the Account page. */
/**
 * not-set-up: stored without its user by an older version; the popup sets it
 * up again before it can be used.
 */
export type StoredOrg =
  | { name: 'loading' }
  | { name: 'none' }
  | { name: 'not-set-up'; orgName: string }
  | { name: 'org'; orgName: string; userId: string; orgId: string };

function storedOrgFrom(value: CloudAccount | null | undefined): StoredOrg {
  if (!value) return { name: 'none' };
  if (!value.userId) return { name: 'not-set-up', orgName: value.orgName };
  return {
    name: 'org',
    orgName: value.orgName,
    userId: value.userId,
    orgId: value.orgId,
  };
}

/**
 * Reads the stored account from extension storage and follows its changes.
 * The session list never loads Clerk, so this works offline and in Firefox.
 */
export function useStoredOrg(): StoredOrg {
  const [org, setOrg] = useState<StoredOrg>({ name: 'loading' });
  useEffect(() => {
    let current = true;
    void Browser.storage.local.get(LocalDataKey.cloudAccount).then((data) => {
      if (current)
        setOrg(storedOrgFrom((data as LocalData)[LocalDataKey.cloudAccount]));
    });
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      const change = changes[LocalDataKey.cloudAccount];
      if (change)
        setOrg(
          storedOrgFrom(change.newValue as CloudAccount | null | undefined),
        );
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    return () => {
      current = false;
      Browser.storage.local.onChanged.removeListener(onChanged);
    };
  }, []);
  return org;
}

/** The session list bar's right side: the stored organization's name. */
export function StoredOrgLabel() {
  const org = useStoredOrg();
  switch (org.name) {
    case 'loading':
    case 'none':
      return null;
    case 'not-set-up':
    case 'org':
      return <BarLabel label={org.orgName} />;
  }
}
