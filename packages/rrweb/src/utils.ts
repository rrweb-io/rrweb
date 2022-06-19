import type {
  throttleOptions,
  listenerHandler,
  hookResetter,
  blockClass,
  addedNodeMutation,
  DocumentDimension,
  IWindow,
  DeprecatedMirror,
  textMutation,
} from './types';
import type { IMirror, Mirror } from 'rrweb-snapshot';
import { isShadowRoot, IGNORED_NODE, classMatchesRegex } from 'rrweb-snapshot';
import type { RRNode, RRIFrameElement } from 'rrdom';

export function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target: Document | IWindow = document,
): listenerHandler {
  const options = { capture: true, passive: true };
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}

// https://github.com/rrweb-io/rrweb/pull/407
const DEPARTED_MIRROR_ACCESS_WARNING =
  'Please stop import mirror directly. Instead of that,' +
  '\r\n' +
  'now you can use replayer.getMirror() to access the mirror instance of a replayer,' +
  '\r\n' +
  'or you can use record.mirror to access the mirror instance during recording.';
export let _mirror: DeprecatedMirror = {
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
  return function (arg: T) {
    const now = Date.now();
    if (!previous && options.leading === false) {
      previous = now;
    }
    const remaining = wait - (now - previous);
    const context = this;
    const args = arguments;
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

/**
 * Checks if the given element set to be blocked by rrweb
 * @param node - node to check
 * @param blockClass - class name to check
 * @param ignoreParents - whether to search through parent nodes for the block class
 * @returns true/false if the node was blocked or not
 */
export function isBlocked(
  node: Node | null,
  blockClass: blockClass,
  checkAncestors: boolean,
): boolean {
  if (!node) {
    return false;
  }
  const el: HTMLElement | null =
    node.nodeType === node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  if (!el) return false;

  if (typeof blockClass === 'string') {
    if (el.classList.contains(blockClass)) return true;
    if (checkAncestors && el.closest('.' + blockClass) !== null) return true;
  } else {
    if (classMatchesRegex(el, blockClass, checkAncestors)) return true;
  }
  return false;
}

export function isSerialized(n: Node, mirror: Mirror): boolean {
  return mirror.getId(n) !== -1;
}

export function isIgnored(n: Node, mirror: Mirror): boolean {
  // The main part of the slimDOM check happens in
  // rrweb-snapshot::serializeNodeWithId
  return mirror.getId(n) === IGNORED_NODE;
}

export function isAncestorRemoved(target: Node, mirror: Mirror): boolean {
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
  return isAncestorRemoved(target.parentNode, mirror);
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

export type AppendedIframe = {
  mutationInQueue: addedNodeMutation;
  builtNode: HTMLIFrameElement | RRIFrameElement;
};

export function isSerializedIframe<TNode extends Node | RRNode>(
  n: TNode,
  mirror: IMirror<TNode>,
): boolean {
  return Boolean(n.nodeName === 'IFRAME' && mirror.getMeta(n));
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

export function hasShadowRoot<T extends Node | RRNode>(
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
      (rule.cssRules[position[1]] as CSSGroupingRule).cssRules,
      position.slice(2),
    );
  }
}

export function getPositionsAndIndex(nestedIndex: number[]) {
  const positions = [...nestedIndex];
  const index = positions.pop();
  return { positions, index };
}

/**
 * Returns the latest mutation in the queue for each node.
 * @param  {textMutation[]} mutations The text mutations to filter.
 * @returns {textMutation[]} The filtered text mutations.
 */
export function uniqueTextMutations(mutations: textMutation[]): textMutation[] {
  const idSet = new Set<number>();
  const uniqueMutations: textMutation[] = [];

  for (let i = mutations.length; i--; ) {
    const mutation = mutations[i];
    if (!idSet.has(mutation.id)) {
      uniqueMutations.push(mutation);
      idSet.add(mutation.id);
    }
  }

  return uniqueMutations;
}
