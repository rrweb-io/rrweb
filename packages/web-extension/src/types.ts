import type { eventWithTime } from '@rrweb/types';
import type { recordOptions } from 'rrweb';

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
  cloudAccount = 'cloud_account',
}

export type CloudAccount = {
  /** The Clerk user who connected the organization. */
  userId: string;
  orgId: string;
  orgName: string;
  publicKey: string;
};

/** Where a recording goes: this browser only, or uploaded to rrweb. */
export type RecordingKind = 'offline' | 'cloud';

export type LocalData = {
  [LocalDataKey.cloudAccount]?: CloudAccount | null;
  [LocalDataKey.recorderStatus]: {
    status: RecorderStatus;
    // the recorded tab, or the tab a start is claiming; -1 when idle
    activeTabId: number;
    startTimestamp?: number;
    // the timestamp when the recording is paused
    pausedTimestamp?: number;
    errorMessage?: string; // error message when recording failed
    // set whenever status is not IDLE
    kind?: RecordingKind;
  };
};

export enum RecorderStatus {
  IDLE = 'IDLE',
  // start() is running: sink, tab and account lookups are still in flight
  STARTING = 'STARTING',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
}

export type Session = {
  id: string;
  name: string;
  tags: string[];
  createTimestamp: number;
  modifyTimestamp: number;
  recorderVersion: string;
};

// all service names for channel
export enum ServiceName {
  StartRecord = 'start-record',
  StopRecord = 'stop-record',
}

// all event names for channel
export enum EventName {
  SessionUpdated = 'session-updated',
  ContentScriptEmitEvent = 'content-script-emit-event',
  StartButtonClicked = 'start-recording-button-clicked',
  StopButtonClicked = 'stop-recording-button-clicked',
  PauseButtonClicked = 'pause-recording-button-clicked',
  ResumeButtonClicked = 'resume-recording-button-clicked',
}

// all message names for postMessage API
export enum MessageName {
  RecordScriptReady = 'rrweb-extension-record-script-ready',
  StartRecord = 'rrweb-extension-start-record',
  RecordStarted = 'rrweb-extension-record-started',
  StopRecord = 'rrweb-extension-stop-record',
  RecordStopped = 'rrweb-extension-record-stopped',
  EmitEvent = 'rrweb-extension-emit-event',
}

export type StartRecordPayload = { config: recordOptions<eventWithTime> };

export type RecordStartedMessage = {
  message: MessageName.RecordStarted;
  startTimestamp: number;
};

export type RecordStoppedMessage = {
  message: MessageName.RecordStopped;
  endTimestamp: number;
};

export type EmitEventMessage = {
  message: MessageName.EmitEvent;
  event: eventWithTime;
};
