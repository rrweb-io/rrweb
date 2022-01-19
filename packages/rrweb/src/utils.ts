import {
  Mirror,
  throttleOptions,
  listenerHandler,
  hookResetter,
  blockClass,
  addedNodeMutation,
  DocumentDimension,
  IWindow,
} from './types';
import {
  INode,
  IGNORED_NODE,
  serializedNodeWithId,
  NodeType,
  isShadowRoot,
} from 'rrweb-snapshot';
import { RRNode } from 'rrdom/es/document-browser';

export function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target: Document | IWindow = document,
): listenerHandler {
  const options = { capture: true, passive: true };
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}

export function createMirror(): Mirror {
  return {
    map: {},
    getId(n) {
      // if n is not a serialized INode, use -1 as its id.
      if (!n || !n.__sn) {
        return -1;
      }
      return n.__sn.id;
    },
    getNode(id) {
      return this.map[id] || null;
    },
    // TODO: use a weakmap to get rid of manually memory management
    removeNodeFromMap(n) {
      const id = n.__sn && n.__sn.id;
      delete this.map[id];
      if (n.childNodes) {
        n.childNodes.forEach((child) =>
          this.removeNodeFromMap((child as Node) as INode),
        );
      }
    },
    has(id) {
      return this.map.hasOwnProperty(id);
    },
    reset() {
      this.map = {};
    },
  };
}

// https://github.com/rrweb-io/rrweb/pull/407
const DEPARTED_MIRROR_ACCESS_WARNING =
  'Please stop import mirror directly. Instead of that,' +
  '\r\n' +
  'now you can use replayer.getMirror() to access the mirror instance of a replayer,' +
  '\r\n' +
  'or you can use record.mirror to access the mirror instance during recording.';
export let _mirror: Mirror = {
  map: {},
  getId() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return -1;
  },
  getNode() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return null;
  },
  removeNodeFromMap() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  },
  has() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return false;
  },
  reset() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  },
};
if (typeof window !== 'undefined' && window.Proxy && window.Reflect) {
  _mirror = new Proxy(_mirror, {
    get(target, prop, receiver) {
      if (prop === 'map') {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

// copy from underscore and modified
export function throttle<T>(
  func: (arg: T) => void,
  wait: number,
  options: throttleOptions = {},
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  // tslint:disable-next-line: only-arrow-functions
  return function (arg: T) {
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

export function hookSetter<T>(
  target: T,
  key: string | number | symbol,
  d: PropertyDescriptor,
  isRevoked?: boolean,
  win = window,
): hookResetter {
  const original = win.Object.getOwnPropertyDescriptor(target, key);
  win.Object.defineProperty(
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

// copy from https://github.com/getsentry/sentry-javascript/blob/b2109071975af8bf0316d3b5b38f519bdaf5dc15/packages/utils/src/object.ts
export function patch(
  // tslint:disable-next-line:no-any
  source: { [key: string]: any },
  name: string,
  // tslint:disable-next-line:no-any
  replacement: (...args: any[]) => any,
): () => void {
  try {
    if (!(name in source)) {
      return () => {};
    }

    const original = source[name] as () => unknown;
    const wrapped = replacement(original);

    // Make sure it's a function first, as we need to attach an empty prototype for `defineProperties` to work
    // otherwise it'll throw "TypeError: Object.defineProperties called on non-object"
    // tslint:disable-next-line:strict-type-predicates
    if (typeof wrapped === 'function') {
      wrapped.prototype = wrapped.prototype || {};
      Object.defineProperties(wrapped, {
        __rrweb_original__: {
          enumerable: false,
          value: original,
        },
      });
    }

    source[name] = wrapped;

    return () => {
      source[name] = original;
    };
  } catch {
    return () => {};
    // This can throw if multiple fill happens on a global object like XMLHttpRequest
    // Fixes https://github.com/getsentry/sentry-javascript/issues/2043
  }
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
      (node as HTMLElement).classList.forEach((className) => {
        if (blockClass.test(className)) {
          needBlock = true;
        }
      });
    }
    return needBlock || isBlocked(node.parentNode, blockClass);
  }
  if (node.nodeType === node.TEXT_NODE) {
    // check parent node since text node do not have class name
    return isBlocked(node.parentNode, blockClass);
  }
  return isBlocked(node.parentNode, blockClass);
}

export function isIgnored(n: Node | INode): boolean {
  if ('__sn' in n) {
    return (n as INode).__sn.id === IGNORED_NODE;
  }
  // The main part of the slimDOM check happens in
  // rrweb-snapshot::serializeNodeWithId
  return false;
}

export function isAncestorRemoved(target: INode, mirror: Mirror): boolean {
  if (isShadowRoot(target)) {
    return false;
  }
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
  return isAncestorRemoved((target.parentNode as unknown) as INode, mirror);
}

export function isTouchEvent(
  event: MouseEvent | TouchEvent,
): event is TouchEvent {
  return Boolean((event as TouchEvent).changedTouches);
}

export function polyfill(win = window) {
  if ('NodeList' in win && !win.NodeList.prototype.forEach) {
    win.NodeList.prototype.forEach = (Array.prototype
      .forEach as unknown) as NodeList['forEach'];
  }

  if ('DOMTokenList' in win && !win.DOMTokenList.prototype.forEach) {
    win.DOMTokenList.prototype.forEach = (Array.prototype
      .forEach as unknown) as DOMTokenList['forEach'];
  }

  // https://github.com/Financial-Times/polyfill-service/pull/183
  if (!Node.prototype.contains) {
    Node.prototype.contains = function contains(node) {
      if (!(0 in arguments)) {
        throw new TypeError('1 argument is required');
      }

      do {
        if (this === node) {
          return true;
        }
        // tslint:disable-next-line: no-conditional-assignment
      } while ((node = node && node.parentNode));

      return false;
    };
  }
}

type ResolveTree = {
  value: addedNodeMutation;
  children: ResolveTree[];
  parent: ResolveTree | null;
};

export function queueToResolveTrees(queue: addedNodeMutation[]): ResolveTree[] {
  const queueNodeMap: Record<number, ResolveTree> = {};
  const putIntoMap = (
    m: addedNodeMutation,
    parent: ResolveTree | null,
  ): ResolveTree => {
    const nodeInTree: ResolveTree = {
      value: m,
      parent,
      children: [],
    };
    queueNodeMap[m.node.id] = nodeInTree;
    return nodeInTree;
  };

  const queueNodeTrees: ResolveTree[] = [];
  for (const mutation of queue) {
    const { nextId, parentId } = mutation;
    if (nextId && nextId in queueNodeMap) {
      const nextInTree = queueNodeMap[nextId];
      if (nextInTree.parent) {
        const idx = nextInTree.parent.children.indexOf(nextInTree);
        nextInTree.parent.children.splice(
          idx,
          0,
          putIntoMap(mutation, nextInTree.parent),
        );
      } else {
        const idx = queueNodeTrees.indexOf(nextInTree);
        queueNodeTrees.splice(idx, 0, putIntoMap(mutation, null));
      }
      continue;
    }
    if (parentId in queueNodeMap) {
      const parentInTree = queueNodeMap[parentId];
      parentInTree.children.push(putIntoMap(mutation, parentInTree));
      continue;
    }
    queueNodeTrees.push(putIntoMap(mutation, null));
  }

  return queueNodeTrees;
}

export function iterateResolveTree(
  tree: ResolveTree,
  cb: (mutation: addedNodeMutation) => unknown,
) {
  cb(tree.value);
  /**
   * The resolve tree was designed to reflect the DOM layout,
   * but we need append next sibling first, so we do a reverse
   * loop here.
   */
  for (let i = tree.children.length - 1; i >= 0; i--) {
    iterateResolveTree(tree.children[i], cb);
  }
}

type HTMLIFrameINode = HTMLIFrameElement & {
  __sn: serializedNodeWithId;
};
export type AppendedIframe = {
  mutationInQueue: addedNodeMutation;
  builtNode: HTMLIFrameINode;
};

export function isIframeINode(
  node: INode | ShadowRoot | RRNode,
): node is HTMLIFrameINode {
  if ('__sn' in node) {
    return (
      node.__sn.type === NodeType.Element && node.__sn.tagName === 'iframe'
    );
  }
  // node can be document fragment when using the virtual parent feature
  return false;
}

export function getBaseDimension(
  node: Node,
  rootIframe: Node,
): DocumentDimension {
  const frameElement = node.ownerDocument?.defaultView?.frameElement;
  if (!frameElement || frameElement === rootIframe) {
    return {
      x: 0,
      y: 0,
      relativeScale: 1,
      absoluteScale: 1,
    };
  }

  const frameDimension = frameElement.getBoundingClientRect();
  const frameBaseDimension = getBaseDimension(frameElement, rootIframe);
  // the iframe element may have a scale transform
  const relativeScale = frameDimension.height / frameElement.clientHeight;
  return {
    x:
      frameDimension.x * frameBaseDimension.relativeScale +
      frameBaseDimension.x,
    y:
      frameDimension.y * frameBaseDimension.relativeScale +
      frameBaseDimension.y,
    relativeScale,
    absoluteScale: frameBaseDimension.absoluteScale * relativeScale,
  };
}

export function hasShadowRoot<T extends Node>(
  n: T,
): n is T & { shadowRoot: ShadowRoot } {
  return Boolean(((n as unknown) as Element)?.shadowRoot);
}

export function getNestedRule(
  rules: CSSRuleList,
  position: number[],
): CSSGroupingRule {
  const rule = rules[position[0]] as CSSGroupingRule;
  if (position.length === 1) {
    return rule;
  } else {
    return getNestedRule(
      ((rule as CSSGroupingRule).cssRules[position[1]] as CSSGroupingRule)
        .cssRules,
      position.slice(2),
    );
  }
}

export function getPositionsAndIndex(nestedIndex: number[]) {
  const positions = [...nestedIndex];
  const index = positions.pop();
  return { positions, index };
}
