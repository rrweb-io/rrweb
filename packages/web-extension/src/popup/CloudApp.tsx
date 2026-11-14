import { config, connectUrl, signUpUrl } from '~/config';
import { disconnect, useConnection } from '~/utils/useConnection';
import type { PopupLinks, PopupRecorder } from './App';
import { LoadingView } from './PopupParts';
import { ConnectedView } from './ConnectedView';
import { NotConnectedView } from './NotConnectedView';
import { NotConnectedSwitch } from './ModeSwitch';
import { activeRecording, notConnectedPanel } from './account';
import { useRecordingMode } from './useRecordingMode';

type Props = { recorder: PopupRecorder; links: PopupLinks };

/** The Chrome popup: Cloud or offline, depending on the connection. */
export default function CloudApp({ recorder, links }: Props) {
  const connection = useConnection();
  const mode = useRecordingMode();
  // Waits for the remembered choice, so the switch never flips after opening.
  if (connection.name === 'loading' || mode.choice.name === 'loading')
    return <LoadingView />;

  if (connection.name === 'connected')
    return (
      <ConnectedView
        account={connection.account}
        recorder={recorder.controls}
        dashboardUrl={config.dashboardUrl}
        storedMode={mode.choice.stored}
        onChooseMode={mode.choose}
        onChangeOrg={() => links.openUrl(connectUrl())}
        onDisconnect={() =>
          void disconnect().catch((e) =>
            console.error('Could not disconnect:', e),
          )
        }
        onOpenSessions={links.openSessions}
      />
    );

  const { panel, shown } = notConnectedPanel({
    active: activeRecording(recorder.controls.status),
    stored: mode.choice.stored,
  });
  return (
    <NotConnectedView
      cloud={{
        name: 'available',
        modeSwitch: (
          <NotConnectedSwitch
            recorder={recorder.controls}
            shown={shown}
            onChoose={mode.choose}
            onOpenSessions={links.openSessions}
          />
        ),
        panel,
        onConnect: () => links.openUrl(connectUrl()),
        onSignUp: () => links.openUrl(signUpUrl()),
      }}
      recorder={recorder.controls}
      newSession={recorder.newSession}
      onOpenSessions={links.openSessions}
      sessionUrl={links.sessionUrl}
    />
  );
}
