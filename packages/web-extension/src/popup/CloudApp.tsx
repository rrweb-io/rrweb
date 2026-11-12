import Browser from 'webextension-polyfill';
import CloudGate from '~/cloud/CloudGate';
import { useCloudAccount } from '~/cloud/useCloudAccount';
import { config } from '~/config';
import type { PopupLinks, PopupRecorder } from './App';
import { LoadingView } from './PopupParts';
import { SettingUpView } from './SettingUpView';
import { SignedInView } from './SignedInView';
import { SignedOutView } from './SignedOutView';

type Props = { recorder: PopupRecorder; links: PopupLinks };

function SignedOut({ recorder, links }: Props) {
  return (
    <SignedOutView
      cloud={{
        name: 'available',
        onSignUp: () => links.openUrl(`${config.dashboardUrl}/signup`),
        onLogIn: () => links.openUrl(`${config.dashboardUrl}/signin`),
      }}
      recorder={recorder.controls}
      newSession={recorder.newSession}
      onOpenSessions={links.openSessions}
      onOpenSettings={links.openSettings}
      sessionUrl={links.sessionUrl}
    />
  );
}

function Account(props: Props) {
  const { recorder } = props;
  const { view, orgSwitch, pickOrg, logOut, tryAgain } = useCloudAccount();

  switch (view.name) {
    case 'loading':
      return <LoadingView />;
    case 'signing-out':
      return <LoadingView label="Signing out" />;
    case 'signed-out':
      return <SignedOut {...props} />;
    case 'validating':
    case 'setting-up':
    case 'setup-slow':
      return (
        <SettingUpView
          stage={view.name}
          recorder={recorder.controls}
          dashboardUrl={config.dashboardUrl}
          onTryAgain={tryAgain}
        />
      );
    case 'ready':
      return (
        <SignedInView
          account={view.account}
          orgs={view.orgs}
          email={view.email}
          recorder={recorder.controls}
          orgSwitch={orgSwitch}
          dashboardUrl={config.dashboardUrl}
          onPickOrg={pickOrg}
          onLogOut={logOut}
          onOpenSessions={props.links.openSessions}
        />
      );
  }
}

export default function CloudApp(props: Props) {
  return (
    <CloudGate
      afterSignOutUrl={Browser.runtime.getURL('popup/popup.html')}
      loading={<LoadingView />}
      unavailable={<SignedOut {...props} />}
    >
      <Account {...props} />
    </CloudGate>
  );
}
