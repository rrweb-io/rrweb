import type { RecordingKind, Session } from '~/types';

/** A non-empty string, as every stored or received identifier must be. */
export const filled = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

/**
 * How a session was recorded. Sessions stored before Cloud mode have no
 * `recordedAs` and were recorded offline, without input masking.
 */
export const recordingKindOf = (
  session: Pick<Session, 'recordedAs'>,
): RecordingKind => session.recordedAs ?? 'offline';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatTime(ms: number): string {
  if (ms <= 0) {
    return '00:00';
  }
  const hour = Math.floor(ms / HOUR);
  ms = ms % HOUR;
  const minute = Math.floor(ms / MINUTE);
  ms = ms % MINUTE;
  const second = Math.floor(ms / SECOND);
  if (hour) {
    return `${padZero(hour)}:${padZero(minute)}:${padZero(second)}`;
  }
  return `${padZero(minute)}:${padZero(second)}`;
}

function padZero(num: number, len = 2): string {
  let str = String(num);
  const threshold = Math.pow(10, len - 1);
  if (num < threshold) {
    while (String(threshold).length > str.length) {
      str = `0${num}`;
    }
  }
  return str;
}
