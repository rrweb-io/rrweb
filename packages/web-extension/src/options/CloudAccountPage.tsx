import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import CloudGate from '~/cloud/CloudGate';
import { useCloudAccount, type CloudAccountApi } from '~/cloud/useCloudAccount';
import { config } from '~/config';
import { LocalDataKey, RecorderStatus } from '~/types';
import type { LocalData } from '~/types';
import { BarLabel } from '~/components/PageChrome';
import {
  AccountLoading,
  AccountPage,
  SettingUpAccount,
  SignedInAccount,
  SignedOutAccount,
  type AccountOffer,
} from './AccountViews';

const offer: AccountOffer = {
  name: 'available',
  signUpUrl: `${config.dashboardUrl}/signup`,
  logInUrl: `${config.dashboardUrl}/signin`,
};

function useRecorderIdle(): boolean {
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    const read = (value: LocalData[LocalDataKey.recorderStatus] | undefined) =>
      setIdle(value === undefined || value.status === RecorderStatus.IDLE);
    void Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then((data) => read((data as LocalData)[LocalDataKey.recorderStatus]));
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      const change = changes[LocalDataKey.recorderStatus];
      if (change)
        read(
          change.newValue as LocalData[LocalDataKey.recorderStatus] | undefined,
        );
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    return () => Browser.storage.local.onChanged.removeListener(onChanged);
  }, []);
  return idle;
}

function Account() {
  const api = useCloudAccount();
  const { view } = api;
  return (
    <AccountPage
      end={
        view.name === 'ready' && view.email !== null ? (
          <BarLabel label={view.email} />
        ) : undefined
      }
    >
      <AccountBody {...api} />
    </AccountPage>
  );
}

function AccountBody({
  view,
  orgSwitch,
  pickOrg,
  logOut,
  tryAgain,
}: CloudAccountApi) {
  const recorderIdle = useRecorderIdle();

  switch (view.name) {
    case 'loading':
      return <AccountLoading label="Loading" />;
    case 'signing-out':
      return <AccountLoading label="Signing out" />;
    case 'signed-out':
      return <SignedOutAccount offer={offer} />;
    case 'validating':
      return <AccountLoading label="Checking your account" />;
    case 'setting-up':
    case 'setup-slow':
      return (
        <SettingUpAccount
          slow={view.name === 'setup-slow'}
          dashboardUrl={config.dashboardUrl}
          onTryAgain={tryAgain}
        />
      );
    case 'ready':
      return (
        <SignedInAccount
          account={view.account}
          orgs={view.orgs}
          orgSwitch={orgSwitch}
          pickerDisabled={!recorderIdle}
          onPickOrg={pickOrg}
          onLogOut={logOut}
        />
      );
  }
}

export default function CloudAccountPage() {
  return (
    <CloudGate
      afterSignOutUrl={Browser.runtime.getURL('options/index.html')}
      loading={
        <AccountPage>
          <AccountLoading label="Loading" />
        </AccountPage>
      }
      unavailable={
        <AccountPage>
          <SignedOutAccount offer={offer} />
        </AccountPage>
      }
    >
      <Account />
    </CloudGate>
  );
}
