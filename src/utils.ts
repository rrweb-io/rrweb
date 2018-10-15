import { idNodeMap, NodeType, serializeNodeWithId } from 'rrweb-snapshot';
import {
  Mirror,
  throttleOptions,
  listenerHandler,
  hookResetter,
} from './types';

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
  // TODO: use a weakmap to get rid of manually memory management
  removeNodeFromMap(n) {
    const id = n.__sn && n.__sn.id;
    delete mirror.map[id];
  },
};

// TODO: transform this into the snapshot repo
export function getIdNodeMap(doc: Document) {
  const map: idNodeMap = {};

  function walk(n: Node) {
    const node = serializeNodeWithId(n, doc, map);
    if (!node) {
      return null;
    }
    if (node.type === NodeType.Document || node.type === NodeType.Element) {
      for (const _n of Array.from(n.childNodes)) {
        walk(_n);
      }
    }
  }

  walk(doc);
  return map;
}

// copy from underscore and modified
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
        window.clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = window.setTimeout(() => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}

export function hookSetter<T>(
  target: T,
  key: string | number | symbol,
  d: PropertyDescriptor,
): hookResetter {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    set(value) {
      d.set!.call(this, value);
      if (original && original.set) {
        original.set.call(this, value);
      }
    },
  });
  return () => hookSetter(target, key, original || {});
}

export function getWindowHeight(): number {
  return (
    window.innerHeight ||
    (document.documentElement && document.documentElement.clientHeight) ||
    (document.body && document.body.clientHeight)
  );
}

export function getWindowWidth(): number {
  return (
    window.innerWidth ||
    (document.documentElement && document.documentElement.clientWidth) ||
    (document.body && document.body.clientWidth)
  );
}
