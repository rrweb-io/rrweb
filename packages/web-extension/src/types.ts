import type { eventWithTime } from 'rrweb/typings/types';

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
  sessions = 'sessions',
  recorderStatus = 'recorder_status',
  bufferedEvents = 'buffered_events',
}

export type LocalData = {
  [LocalDataKey.sessions]: Record<string, Session>;
  [LocalDataKey.recorderStatus]: {
    status: RecorderStatus;
    startTimestamp?: number;
    duration?: number;
  };
  [LocalDataKey.bufferedEvents]: eventWithTime[];
};

export enum RecorderStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
}

export type Session = {
  id: string;
  name: string;
  tags: string[];
  events: eventWithTime[];
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
};

export type HeartBreathMessage = {
  message: MessageName.HeartBeat;
  events: eventWithTime[];
};