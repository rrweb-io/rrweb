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

export function openFullscreen(el) {
  if (el.requestFullscreen) {
    return el.requestFullscreen();
  } else if (el.mozRequestFullScreen) {
    /* Firefox */
    return el.mozRequestFullScreen();
  } else if (el.webkitRequestFullscreen) {
    /* Chrome, Safari and Opera */
    return el.webkitRequestFullscreen();
  } else if (el.msRequestFullscreen) {
    /* IE/Edge */
    return el.msRequestFullscreen();
  }
}

export function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if (document.mozExitFullscreen) {
    /* Firefox */
    return document.mozExitFullscreen();
  } else if (document.webkitExitFullscreen) {
    /* Chrome, Safari and Opera */
    return document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    /* IE/Edge */
    return document.msExitFullscreen();
  }
}

export function isFullscreen() {
  return (
    document.fullscreen ||
    document.webkitIsFullScreen ||
    document.mozFullScreen ||
    document.msFullscreenElement
  );
}

export function onFullscreenChange(handler) {
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('mozfullscreenchange', handler);
  document.addEventListener('MSFullscreenChange', handler);

  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    document.removeEventListener('mozfullscreenchange', handler);
    document.removeEventListener('MSFullscreenChange', handler);
  };
}
