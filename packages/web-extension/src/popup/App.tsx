import { useEffect, useMemo, useState } from 'react';
import Browser from 'webextension-polyfill';
import Channel from '~/utils/channel';
import { config } from '~/config';
import { LocalDataKey, RecorderStatus, EventName } from '~/types';
import type { LocalData, Session } from '~/types';
import type { RecorderControls } from './PopupParts';
import { NotConnectedView } from './NotConnectedView';
import CloudApp from './CloudApp';
import { activeRecording, type ActiveRecording } from './account';

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
  openSessions: () => void Browser.tabs.create({ url: '/pages/index.html#/' }),
  sessionUrl: (session) =>
    Browser.runtime.getURL(`pages/index.html#/session/${session.id}`),
};

function useRecorder(): PopupRecorder {
  const [status, setStatus] = useState<RecorderStatus>(RecorderStatus.IDLE);
  const [active, setActive] = useState<ActiveRecording>('not-recording');
  const [uploadsTo, setUploadsTo] = useState<RecorderControls['uploadsTo']>({
    name: 'none',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [newSession, setNewSession] = useState<Session | null>(null);

  useEffect(() => {
    const parseStatusData = (data: LocalData[LocalDataKey.recorderStatus]) => {
      const { status, startTimestamp, pausedTimestamp } = data;
      setStatus(status);
      setActive(activeRecording(data));
      setUploadsTo(
        data.uploadsTo
          ? { name: 'organization', orgName: data.uploadsTo }
          : { name: 'none' },
      );
      if (startTimestamp && pausedTimestamp)
        setStartTime(Date.now() - pausedTimestamp + startTimestamp);
      else if (startTimestamp) setStartTime(startTimestamp);
      else setStartTime(null);
    };
    void Browser.storage.local.get(LocalDataKey.recorderStatus).then((data) => {
      if (!data || !data[LocalDataKey.recorderStatus]) return;
      parseStatusData((data as LocalData)[LocalDataKey.recorderStatus]);
    });
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      if (!changes[LocalDataKey.recorderStatus]) return;
      const data = changes[LocalDataKey.recorderStatus]
        .newValue as LocalData[LocalDataKey.recorderStatus];
      parseStatusData(data);
      if (data.errorMessage) setErrorMessage(data.errorMessage);
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    channel.on(EventName.SessionUpdated, (data) => {
      setNewSession((data as { session: Session }).session);
    });
    return () => Browser.storage.local.onChanged.removeListener(onChanged);
  }, []);

  const controls = useMemo<RecorderControls>(
    () => ({
      status,
      active,
      uploadsTo,
      startTime,
      errorMessage,
      toggle: (startAs) => {
        if (status === RecorderStatus.STARTING) return;
        if (status === RecorderStatus.IDLE)
          void channel.emit(EventName.StartButtonClicked, startAs);
        else void channel.emit(EventName.StopButtonClicked, {});
      },
      pause: () => void channel.emit(EventName.PauseButtonClicked, {}),
      resume: () => void channel.emit(EventName.ResumeButtonClicked, {}),
    }),
    [status, active, uploadsTo, startTime, errorMessage],
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
