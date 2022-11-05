import type { eventWithTime } from '@rrweb/types';

export enum SyncDataKey {
  settings = 'settings',
}

export type SyncData = {
  [SyncDataKey.settings]: Settings;
};

export type Settings = {
  //
};

export enum LocalDataKey {
  recorderStatus = 'recorder_status',
  bufferedEvents = 'buffered_events',
}

export type LocalData = {
  [LocalDataKey.recorderStatus]: {
    status: RecorderStatus;
    activeTabId: number;
    startTimestamp?: number;
    // the timestamp when the recording is paused
    pausedTimestamp?: number;
  };
  [LocalDataKey.bufferedEvents]: eventWithTime[];
};

export enum RecorderStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  // when user change the tab, the recorder will be paused during the tab change
  PausedSwitch = 'PAUSED_SWITCH',
}

export type Session = {
  id: string;
  name: string;
  tags: string[];
  createTimestamp: number;
  modifyTimestamp: number;
  recorderVersion: string;
};

export enum ServiceName {
  StartRecord = 'start-record',
  StopRecord = 'stop-record',
  PauseRecord = 'pause-record',
  ResumeRecord = 'resume-record',
}

export enum EventName {
  SessionUpdated = 'session-updated',
}

export enum MessageName {
  RecordScriptReady = 'rrweb-extension-record-script-ready',
  StartRecord = 'rrweb-extension-start-record',
  RecordStarted = 'rrweb-extension-record-started',
  HeartBeat = 'rrweb-extension-heart-beat',
  StopRecord = 'rrweb-extension-stop-record',
  RecordStopped = 'rrweb-extension-record-stopped',
}

export type RecordStartedMessage = {
  message: MessageName.RecordStarted;
  startTimestamp: number;
};

export type RecordStoppedMessage = {
  message: MessageName.RecordStopped;
  events: eventWithTime[];
  endTimestamp: number;
  session?: Session;
};

export type HeartBreathMessage = {
  message: MessageName.HeartBeat;
  events: eventWithTime[];
};
