import {
  Mirror,
  throttleOptions,
  listenerHandler,
  hookResetter,
  blockClass,
} from './types';
import { INode } from 'rrweb-snapshot';

export function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target: Document | Window = document,
): listenerHandler {
  const options = { capture: true, passive: true };
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}

export const mirror: Mirror = {
  map: {},
  getId(n) {
    // if n is not a serialized INode, use -1 as its id.
    if (!n.__sn) {
      return -1;
    }
    return n.__sn.id;
  },
  getNode(id) {
    return mirror.map[id] || null;
  },
  // TODO: use a weakmap to get rid of manually memory management
  removeNodeFromMap(n) {
    const id = n.__sn && n.__sn.id;
    delete mirror.map[id];
    if (n.childNodes) {
      n.childNodes.forEach(child =>
        mirror.removeNodeFromMap((child as Node) as INode),
      );
    }
  },
  has(id) {
    return mirror.map.hasOwnProperty(id);
  },
};

// copy from underscore and modified
export function throttle<T>(
  func: (arg: T) => void,
  wait: number,
  options: throttleOptions = {},
) {
  let timeout: number | null = null;
  let previous = 0;
  // tslint:disable-next-line: only-arrow-functions
  return function(args: T) {
    let now = Date.now();
    if (!previous && options.leading === false) {
      previous = now;
    }
    let remaining = wait - (now - previous);
    let context = this;
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
  isRevoked?: boolean,
): hookResetter {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(
    target,
    key,
    isRevoked
      ? d
      : {
          set(value) {
            // put hooked setter into event loop to avoid of set latency
            setTimeout(() => {
              d.set!.call(this, value);
            }, 0);
            if (original && original.set) {
              original.set.call(this, value);
            }
          },
        },
  );
  return () => hookSetter(target, key, original || {}, true);
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

export function isBlocked(node: Node | null, blockClass: blockClass): boolean {
  if (!node) {
    return false;
  }
  if (node.nodeType === node.ELEMENT_NODE) {
    let needBlock = false;
    if (typeof blockClass === 'string') {
      needBlock = (node as HTMLElement).classList.contains(blockClass);
    } else {
      (node as HTMLElement).classList.forEach(className => {
        if (blockClass.test(className)) {
          needBlock = true;
        }
      });
    }
    return needBlock || isBlocked(node.parentNode, blockClass);
  }
  return isBlocked(node.parentNode, blockClass);
}

export function isAncestorRemoved(target: INode): boolean {
  const id = mirror.getId(target);
  if (!mirror.has(id)) {
    return true;
  }
  if (
    target.parentNode &&
    target.parentNode.nodeType === target.DOCUMENT_NODE
  ) {
    return false;
  }
  // if the root is not document, it means the node is not in the DOM tree anymore
  if (!target.parentNode) {
    return true;
  }
  return isAncestorRemoved((target.parentNode as unknown) as INode);
}

export function isTouchEvent(
  event: MouseEvent | TouchEvent,
): event is TouchEvent {
  return Boolean((event as TouchEvent).changedTouches);
}
