import { isRunning } from '~/types';
import type {
  Destination,
  LastError,
  RecorderStatus,
  RecordingKind,
} from '~/types';

/** What the recorder is doing right now, as the popup shows it. */
export type ActiveRecording = RecordingKind | 'not-recording';

export function activeRecording(status: RecorderStatus): ActiveRecording {
  // A start in flight has no destination yet, so it reads as not recording.
  if (!isRunning(status)) return 'not-recording';
  return status.destination.name === 'organization' ? 'cloud' : 'offline';
}

const IDLE: RecorderStatus = { state: 'idle', lastError: { name: 'none' } };

/**
 * The status in storage. Anything else, such as the shape an older version
 * wrote before the background reset it, reads as idle.
 */
export function parseRecorderStatus(value: unknown): RecorderStatus {
  if (typeof value !== 'object' || value === null) return IDLE;
  const v = value as Record<string, unknown>;
  if (v.state === 'starting') return { state: 'starting' };
  const lastError = parseLastError(v.lastError);
  if (v.state === 'idle')
    return lastError === 'invalid' ? IDLE : { state: 'idle', lastError };
  const destination = parseDestination(v.destination);
  const { tabId, startTimestamp, pausedTimestamp } = v;
  if (
    destination === 'invalid' ||
    typeof tabId !== 'number' ||
    typeof startTimestamp !== 'number'
  )
    return IDLE;
  if (v.state === 'recording')
    return { state: 'recording', tabId, startTimestamp, destination };
  if (
    v.state === 'paused' &&
    typeof pausedTimestamp === 'number' &&
    lastError !== 'invalid'
  )
    return {
      state: 'paused',
      tabId,
      startTimestamp,
      pausedTimestamp,
      destination,
      lastError,
    };
  return IDLE;
}

function parseLastError(value: unknown): LastError | 'invalid' {
  const v = (value ?? {}) as Record<string, unknown>;
  if (v.name === 'none') return { name: 'none' };
  if (v.name === 'failed' && typeof v.message === 'string')
    return { name: 'failed', message: v.message };
  return 'invalid';
}

function parseDestination(value: unknown): Destination | 'invalid' {
  const v = (value ?? {}) as Record<string, unknown>;
  if (v.name === 'stored-only') return { name: 'stored-only' };
  if (v.name === 'organization' && typeof v.orgName === 'string')
    return { name: 'organization', orgName: v.orgName };
  return 'invalid';
}

/** The switch's choice in storage: 'not-stored' until the person picks one. */
export type StoredMode = RecordingKind | 'not-stored';

export function parseStoredMode(value: unknown): StoredMode {
  return value === 'cloud' || value === 'offline' ? value : 'not-stored';
}

/**
 * The mode the connected popup's switch and record button show. A running
 * recording shows its own mode. Cloud is the default until the person picks
 * one.
 */
export function shownMode(input: {
  active: ActiveRecording;
  stored: StoredMode;
}): RecordingKind {
  if (input.active !== 'not-recording') return input.active;
  return input.stored === 'not-stored' ? 'cloud' : input.stored;
}

/**
 * What the Chrome popup shows under the switch while no organization is
 * connected.
 * record: the record button (offline) and its note.
 * cloud-pitch: Cloud is chosen but needs an account, so the pitch replaces the
 * record button. Nothing can start a recording from it.
 */
export type NotConnectedPanel = 'record' | 'cloud-pitch';

export function notConnectedPanel(input: {
  active: ActiveRecording;
  stored: StoredMode;
}): { panel: NotConnectedPanel; shown: RecordingKind } {
  // A recording still running (even a cloud one, after disconnecting) keeps
  // its stop controls and its own mode.
  if (input.active !== 'not-recording')
    return { panel: 'record', shown: input.active };
  return input.stored === 'cloud'
    ? { panel: 'cloud-pitch', shown: 'cloud' }
    : { panel: 'record', shown: 'offline' };
}

/**
 * Who reads the note under the record button.
 * connected: uploads go to `orgName`.
 * not-connected: no organization connected, or a browser without Cloud.
 */
export type NoteReader =
  | { name: 'connected'; orgName: string }
  | { name: 'not-connected' };

/** The line under the record button. */
export function recordingNote(mode: RecordingKind, reader: NoteReader): string {
  if (mode === 'cloud')
    return reader.name === 'connected'
      ? `Uploads to ${reader.orgName} when you stop. Typed form input is masked.`
      : 'Uploads to rrweb when you stop. Typed form input is masked.';
  return reader.name === 'not-connected'
    ? 'Saved in this browser only.'
    : 'Saved in this browser only. You can share it later.';
}

export type RecordButtonLook = {
  label: 'idle' | 'stop';
  mark: 'dot' | 'square';
  /** busy: a start is in flight, so clicks do nothing but the look stays. */
  press: 'enabled' | 'busy' | 'disabled';
};

export function recordButtonLook(
  state: RecorderStatus['state'],
  disabled: boolean,
): RecordButtonLook {
  const starting = state === 'starting';
  const idle = state === 'idle' || starting;
  return {
    label: idle ? 'idle' : 'stop',
    mark: idle ? 'dot' : 'square',
    press: disabled ? 'disabled' : starting ? 'busy' : 'enabled',
  };
}
