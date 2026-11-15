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

/** The organization the dashboard connected, with its public key. */
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
  /** Read it with `parseConnection`, which checks every field. */
  [LocalDataKey.cloudAccount]?: unknown;
  [LocalDataKey.sharedSessions]?: SharedSessions;
  /** The popup switch's last choice; absent until the person picks one. */
  [LocalDataKey.recordingMode]?: RecordingKind;
  /** A `RecorderStatus`; the popup reads it with `parseRecorderStatus`. */
  [LocalDataKey.recorderStatus]?: unknown;
};

/**
 * Where a running recording's events go, fixed when it started.
 * stored-only: this browser only (an offline recording).
 * organization: uploaded to `orgName` when it finishes (a cloud recording).
 */
export type Destination =
  | { name: 'stored-only' }
  | { name: 'organization'; orgName: string };

/** Why the last start, resume or finish failed, for the popup to show. */
export type LastError = { name: 'none' } | { name: 'failed'; message: string };

/**
 * What the recorder is doing, as the popup and the toolbar badge see it.
 * idle: nothing is recording; `lastError` is from the last start or finish.
 * starting: a start is in flight: tab, account and page are still answering.
 * recording: `tabId` records into `destination`. `startTimestamp` moves later
 * with every pause, so the time since it leaves the pauses out.
 * paused: as recording, stopped at `pausedTimestamp`; `lastError` is from the
 * last resume.
 */
export type RecorderStatus =
  | { state: 'idle'; lastError: LastError }
  | { state: 'starting' }
  | {
      state: 'recording';
      tabId: number;
      startTimestamp: number;
      destination: Destination;
    }
  | {
      state: 'paused';
      tabId: number;
      startTimestamp: number;
      pausedTimestamp: number;
      destination: Destination;
      lastError: LastError;
    };

/** A recording or paused status: one tab has a recording in it. */
export type RunningStatus = Extract<
  RecorderStatus,
  { state: 'recording' | 'paused' }
>;

export function isRunning(status: RecorderStatus): status is RunningStatus {
  return status.state === 'recording' || status.state === 'paused';
}

/** What changed in the stored sessions, sent with `EventName.SessionUpdated`. */
export type SessionsChange =
  | { name: 'saved'; session: Session }
  | { name: 'removed' };

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
