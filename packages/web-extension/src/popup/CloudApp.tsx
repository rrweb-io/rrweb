import Browser from 'webextension-polyfill';
import CloudGate from '~/cloud/CloudGate';
import { useCloudAccount } from '~/cloud/useCloudAccount';
import { config } from '~/config';
import type { PopupLinks, PopupRecorder } from './App';
import { LoadingView } from './PopupParts';
import { SettingUpView } from './SettingUpView';
import { SignedInView } from './SignedInView';
import { SignedOutView } from './SignedOutView';
import { SignedOutSwitch } from './ModeSwitch';
import { useRecordingMode } from './useRecordingMode';

type Props = { recorder: PopupRecorder; links: PopupLinks };

function SignedOut({ recorder, links }: Props) {
  return (
    <SignedOutView
      cloud={{
        name: 'available',
        modeSwitch: (
          <SignedOutSwitch
            recorder={recorder.controls}
            onOpenSessions={links.openSessions}
          />
        ),
        onSignUp: () => links.openUrl(`${config.dashboardUrl}/signup`),
        onLogIn: () => links.openUrl(`${config.dashboardUrl}/signin`),
      }}
      recorder={recorder.controls}
      newSession={recorder.newSession}
      onOpenSessions={links.openSessions}
      sessionUrl={links.sessionUrl}
    />
  );
}

function Account(props: Props) {
  const { recorder } = props;
  const { view, orgSwitch, pickOrg, logOut, tryAgain } = useCloudAccount();
  const mode = useRecordingMode();
  // Waits for the remembered choice, so the switch never flips after opening.
  if (mode.choice.name === 'loading') return <LoadingView />;

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
          onOpenSessions={props.links.openSessions}
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
          storedMode={mode.choice.stored}
          onChooseMode={mode.choose}
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
