export function inlineCss(cssObj) {
  let style = '';
  Object.keys(cssObj).forEach(key => {
    style += `${key}: ${cssObj[key]};`;
  });
  return style;
}

function padZero(num, len = 2) {
  const threshold = Math.pow(10, len - 1);
  if (num < threshold) {
    num = String(num);
    while (String(threshold).length > num.length) {
      num = '0' + num;
    }
  }
  return num;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
export function formatTime(ms) {
  const hour = Math.floor(ms / HOUR);
  ms = ms % HOUR;
  const minute = Math.floor(ms / MINUTE);
  ms = ms % MINUTE;
  const second = Math.round(ms / SECOND);
  if (hour) {
    return `${padZero(hour)}:${padZero(minute)}:${padZero(minute)}`;
  }
  return `${padZero(minute)}:${padZero(second)}`;
}
