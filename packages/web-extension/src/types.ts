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
  sharedSessions = 'shared_sessions',
  recordingMode = 'recording_mode',
}

/**
 * The organization the dashboard connected, with its public key. Builds that
 * signed in inside the extension also stored a `userId`; it is ignored.
 */
export type CloudAccount = {
  orgId: string;
  orgName: string;
  publicKey: string;
};

/** Whether the dashboard has connected an organization to this extension. */
export type Connection =
  | { name: 'not-connected' }
  | { name: 'connected'; account: CloudAccount };

/** Where a recording goes: this browser only, or uploaded to rrweb. */
export type RecordingKind = 'offline' | 'cloud';

/**
 * What the record button the person pressed promised: offline, or an upload
 * to this organization. The background refuses a cloud start whose
 * organization is no longer the connected one.
 */
export type StartRequest =
  | { mode: 'offline' }
  | { mode: 'cloud'; orgId: string };

/**
 * An offline session's upload under one cloud recording ID, by Share or by
 * Stop in Cloud mode.
 * pending: not every event has arrived; the next Share sends the rest to it,
 * only while `orgId` is the connected organization.
 * shared: every event, the close included, was delivered.
 */
export type SessionShare =
  | {
      state: 'pending';
      recordingId: string;
      orgId: string;
      orgName: string;
    }
  | { state: 'shared'; recordingId: string };

/**
 * Offline sessions uploaded with "Share", keyed by session ID. Kept on
 * disconnect, since it only links to the cloud copy.
 */
export type SharedSessions = Record<string, SessionShare>;

/** What the Share button promised: this session, to this organization. */
export type ShareRequest = { sessionId: string; orgId: string };

/**
 * How a share request ended.
 * shared: the session is in rrweb as `recordingId` (now, or from earlier).
 * share-failed: Share can be pressed again; it sends what has not arrived.
 */
export type ShareResult =
  | { name: 'shared'; recordingId: string }
  | { name: 'share-failed'; errorMessage: string };

export type LocalData = {
  /** Read it with `parseConnection`: it may come from an older build. */
  [LocalDataKey.cloudAccount]?: unknown;
  [LocalDataKey.sharedSessions]?: SharedSessions;
  /** The popup switch's last choice; absent until the person picks one. */
  [LocalDataKey.recordingMode]?: RecordingKind;
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
    // a cloud recording's organization, fixed when it started
    uploadsTo?: string;
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
  /**
   * cloud: recorded in Cloud mode, so form fields were masked. Sessions from
   * older versions have no value and were recorded offline.
   */
  recordedAs?: RecordingKind;
};

// all service names for channel
export enum ServiceName {
  StartRecord = 'start-record',
  StopRecord = 'stop-record',
  // a page asks the background to upload an offline session
  ShareSession = 'share-session',
  // a page asks the background to delete offline sessions and their shares
  DeleteSessions = 'delete-sessions',
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
