import { Mirror, throttleOptions, listenerHandler } from './types';

export function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target: Document | Window = document,
): listenerHandler {
  target.addEventListener(type, fn, { capture: true, passive: true });
  return () => target.removeEventListener(type, fn);
}

export const mirror: Mirror = {
  map: {},
  getId(n) {
    return n.__sn && n.__sn.id;
  },
  getNode(id) {
    return mirror.map[id];
  },
};

// copy from underscore
export function throttle<T>(
  func: (arg: T) => void,
  wait: number,
  options: throttleOptions = {},
) {
  let timeout: number | null = null;
  let previous = 0;
  // tslint:disable-next-line: only-arrow-functions
  return function() {
    let now = Date.now();
    if (!previous && options.leading === false) {
      previous = now;
    }
    let remaining = wait - (now - previous);
    let context = this;
    let args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(() => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}
