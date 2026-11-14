import { RecorderStatus } from '~/types';
import type { LocalData, LocalDataKey, RecordingKind } from '~/types';

/** What the recorder is doing right now, as the popup shows it. */
export type ActiveRecording = RecordingKind | 'not-recording';

export function activeRecording(
  data: Pick<LocalData[LocalDataKey.recorderStatus], 'status' | 'kind'>,
): ActiveRecording {
  // STARTING has no kind yet, so it reads as not recording until RECORDING.
  if (
    data.status === RecorderStatus.IDLE ||
    data.status === RecorderStatus.STARTING
  )
    return 'not-recording';
  // The background sets kind on every non-idle status.
  return data.kind ?? 'offline';
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
      ? `Uploads to ${reader.orgName} when you stop. Form fields are masked.`
      : 'Uploads to rrweb when you stop. Form fields are masked.';
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
  status: RecorderStatus,
  disabled: boolean,
): RecordButtonLook {
  const starting = status === RecorderStatus.STARTING;
  const idle = status === RecorderStatus.IDLE || starting;
  return {
    label: idle ? 'idle' : 'stop',
    mark: idle ? 'dot' : 'square',
    press: disabled ? 'disabled' : starting ? 'busy' : 'enabled',
  };
}
