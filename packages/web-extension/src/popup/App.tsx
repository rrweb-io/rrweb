import { useEffect, useMemo, useState } from 'react';
import Browser from 'webextension-polyfill';
import Channel from '~/utils/channel';
import { config, SESSIONS_PAGE, sessionPage } from '~/config';
import { LocalDataKey, EventName } from '~/types';
import type {
  LastError,
  LocalData,
  RecorderStatus,
  Session,
  SessionsChange,
} from '~/types';
import type { RecorderControls } from './PopupParts';
import { NotConnectedView } from './NotConnectedView';
import CloudApp from './CloudApp';
import { parseRecorderStatus } from './account';

const channel = new Channel();

export type PopupRecorder = {
  controls: RecorderControls;
  newSession: Session | null;
};

export type PopupLinks = {
  openUrl: (url: string) => void;
  openSessions: () => void;
  sessionUrl: (session: Session) => string;
};

const links: PopupLinks = {
  openUrl: (url) => void Browser.tabs.create({ url }),
  openSessions: () => void Browser.tabs.create({ url: SESSIONS_PAGE }),
  sessionUrl: (session) => Browser.runtime.getURL(sessionPage(session.id)),
};

function useRecorder(): PopupRecorder {
  const [status, setStatus] = useState<RecorderStatus>({
    state: 'idle',
    lastError: { name: 'none' },
  });
  const [error, setError] = useState<LastError>({ name: 'none' });
  const [newSession, setNewSession] = useState<Session | null>(null);

  useEffect(() => {
    void Browser.storage.local.get(LocalDataKey.recorderStatus).then((data) => {
      setStatus(
        parseRecorderStatus((data as LocalData)[LocalDataKey.recorderStatus]),
      );
    });
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      if (!changes[LocalDataKey.recorderStatus]) return;
      const next = parseRecorderStatus(
        changes[LocalDataKey.recorderStatus].newValue,
      );
      setStatus(next);
      // A failure stays shown until the popup closes.
      if (
        (next.state === 'idle' || next.state === 'paused') &&
        next.lastError.name === 'failed'
      )
        setError(next.lastError);
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    channel.on(EventName.SessionUpdated, (data) => {
      const change = data as SessionsChange;
      if (change.name === 'saved') setNewSession(change.session);
    });
    return () => Browser.storage.local.onChanged.removeListener(onChanged);
  }, []);

  const controls = useMemo<RecorderControls>(
    () => ({
      status,
      error,
      toggle: (startAs) => {
        if (status.state === 'starting') return;
        if (status.state === 'idle')
          void channel.emit(EventName.StartButtonClicked, startAs);
        else void channel.emit(EventName.StopButtonClicked, {});
      },
      pause: () => void channel.emit(EventName.PauseButtonClicked, {}),
      resume: () => void channel.emit(EventName.ResumeButtonClicked, {}),
    }),
    [status, error],
  );
  return { controls, newSession };
}

export function App() {
  const recorder = useRecorder();
  if (!config.cloudEnabled) {
    return (
      <NotConnectedView
        cloud={{ name: 'unavailable' }}
        recorder={recorder.controls}
        newSession={recorder.newSession}
        onOpenSessions={links.openSessions}
        sessionUrl={links.sessionUrl}
      />
    );
  }
  return <CloudApp recorder={recorder} links={links} />;
}
