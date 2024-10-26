export function isFirefox(): boolean {
  // Use self.navigator.userAgent to ensure compatibility in service workers
  const userAgent =
    typeof navigator !== 'undefined'
      ? navigator.userAgent
      : typeof self !== 'undefined' && 'navigator' in self
      ? self.navigator.userAgent
      : '';
  return userAgent.toLowerCase().includes('firefox');
}

export function isInCrossOriginIFrame(): boolean {
  if (typeof window !== 'undefined' && window.parent !== window) {
    try {
      void window.parent.location.origin;
    } catch (error) {
      return true;
    }
  }
  return false;
}

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
      str = `0${str}`;
    }
  }
  return str;
}
