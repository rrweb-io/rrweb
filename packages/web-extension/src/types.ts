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
  failedUploads = 'failed_uploads',
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

/**
 * What the record button the person pressed promised: offline, or an upload
 * to this user's organization. The background refuses a cloud start whose
 * account no longer matches the stored one.
 */
export type StartRequest =
  | { mode: 'offline' }
  | { mode: 'cloud'; userId: string; orgId: string };

/**
 * Where a failed cloud upload stands.
 * upload-failed: the upload at stop failed; waiting for "Retry upload".
 * retrying: a retry is in flight.
 * retry-failed: the last retry failed, with the reason shown to the person.
 * delivered: a retry delivered it; only cleanup is left, nothing is re-sent.
 */
export type FailedUploadState =
  | { name: 'upload-failed' }
  | { name: 'retrying' }
  | { name: 'retry-failed'; errorMessage: string }
  | { name: 'delivered' };

/**
 * A cloud recording whose upload failed. Its unsent events are kept in this
 * browser until a retry delivers them, or the person discards them, or the
 * user who made it logs out.
 */
export type FailedUpload = {
  recordingId: string;
  /** The Clerk user who made the recording; only they can upload it. */
  userId: string;
  title: string;
  state: FailedUploadState;
};

export type LocalData = {
  [LocalDataKey.cloudAccount]?: CloudAccount | null;
  [LocalDataKey.failedUploads]?: FailedUpload[];
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
  RetryUploadClicked = 'retry-upload-button-clicked',
  DiscardUploadClicked = 'discard-upload-button-clicked',
  // the user logged out from the popup or the account page
  UserLoggedOut = 'user-logged-out',
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

/**
 * `token` identifies the recording. The page script echoes it on every event,
 * so the background can drop events from an earlier recording.
 */
export type StartRecordPayload = {
  config: recordOptions<eventWithTime>;
  token: string;
};

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
  token: string;
};

/** What the content script forwards to the background for each event. */
export type RecordedEvent = { event: eventWithTime; token: string };
