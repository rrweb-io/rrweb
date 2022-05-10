import {
  throttleOptions,
  listenerHandler,
  hookResetter,
  blockClass,
  IncrementalSource,
  addedNodeMutation,
  removedNodeMutation,
  textMutation,
  attributeMutation,
  mutationData,
  scrollData,
  inputData,
  DocumentDimension,
  IWindow,
  DeprecatedMirror,
} from './types';
import { Mirror, IGNORED_NODE, isShadowRoot } from 'rrweb-snapshot';

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

export function isBlocked(node: Node | null, blockClass: blockClass, blockSelector: string | null): boolean {
  if (!node) {
    return false;
  }
  if (node.nodeType === node.ELEMENT_NODE) {
    let needBlock = false;
    if (typeof blockClass === 'string') {
      if ((node as HTMLElement).closest !== undefined) {
        return (node as HTMLElement).closest('.' + blockClass) !== null;
      } else {
        needBlock = (node as HTMLElement).classList.contains(blockClass);
      }
    } else {
      (node as HTMLElement).classList.forEach((className) => {
        if (blockClass.test(className)) {
          needBlock = true;
        }
      });
    }
    if (blockSelector) {
      needBlock = (node as HTMLElement).matches(blockSelector);
    }

    return needBlock || isBlocked(node.parentNode, blockClass, blockSelector);
  }
  if (node.nodeType === node.TEXT_NODE) {
    // check parent node since text node do not have class name
    return isBlocked(node.parentNode, blockClass, blockSelector);
  }
  return isBlocked(node.parentNode, blockClass, blockSelector);
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

export type TreeNode = {
  id: number;
  mutation: addedNodeMutation;
  parent?: TreeNode;
  children: Record<number, TreeNode>;
  texts: textMutation[];
  attributes: attributeMutation[];
};

export class TreeIndex {
  public tree!: Record<number, TreeNode>;

  private removeNodeMutations!: removedNodeMutation[];
  private textMutations!: textMutation[];
  private attributeMutations!: attributeMutation[];
  private indexes!: Map<number, TreeNode>;
  private removeIdSet!: Set<number>;
  private scrollMap!: Map<number, scrollData>;
  private inputMap!: Map<number, inputData>;

  constructor() {
    this.reset();
  }

  public add(mutation: addedNodeMutation) {
    const parentTreeNode = this.indexes.get(mutation.parentId);
    const treeNode: TreeNode = {
      id: mutation.node.id,
      mutation,
      children: [],
      texts: [],
      attributes: [],
    };
    if (!parentTreeNode) {
      this.tree[treeNode.id] = treeNode;
    } else {
      treeNode.parent = parentTreeNode;
      parentTreeNode.children[treeNode.id] = treeNode;
    }
    this.indexes.set(treeNode.id, treeNode);
  }

  public remove(mutation: removedNodeMutation, mirror: Mirror) {
    const parentTreeNode = this.indexes.get(mutation.parentId);
    const treeNode = this.indexes.get(mutation.id);

    const deepRemoveFromMirror = (id: number) => {
      if (id === -1) return;

      this.removeIdSet.add(id);
      const node = mirror.getNode(id);
      node?.childNodes.forEach((childNode) => {
        deepRemoveFromMirror(mirror.getId(childNode));
      });
    };
    const deepRemoveFromTreeIndex = (node: TreeNode) => {
      this.removeIdSet.add(node.id);
      Object.values(node.children).forEach((n) => deepRemoveFromTreeIndex(n));
      const _treeNode = this.indexes.get(node.id);
      if (_treeNode) {
        const _parentTreeNode = _treeNode.parent;
        if (_parentTreeNode) {
          delete _treeNode.parent;
          delete _parentTreeNode.children[_treeNode.id];
          this.indexes.delete(mutation.id);
        }
      }
    };

    if (!treeNode) {
      this.removeNodeMutations.push(mutation);
      deepRemoveFromMirror(mutation.id);
    } else if (!parentTreeNode) {
      delete this.tree[treeNode.id];
      this.indexes.delete(treeNode.id);
      deepRemoveFromTreeIndex(treeNode);
    } else {
      delete treeNode.parent;
      delete parentTreeNode.children[treeNode.id];
      this.indexes.delete(mutation.id);
      deepRemoveFromTreeIndex(treeNode);
    }
  }

  public text(mutation: textMutation) {
    const treeNode = this.indexes.get(mutation.id);
    if (treeNode) {
      treeNode.texts.push(mutation);
    } else {
      this.textMutations.push(mutation);
    }
  }

  public attribute(mutation: attributeMutation) {
    const treeNode = this.indexes.get(mutation.id);
    if (treeNode) {
      treeNode.attributes.push(mutation);
    } else {
      this.attributeMutations.push(mutation);
    }
  }

  public scroll(d: scrollData) {
    this.scrollMap.set(d.id, d);
  }

  public input(d: inputData) {
    this.inputMap.set(d.id, d);
  }

  public flush(): {
    mutationData: mutationData;
    scrollMap: TreeIndex['scrollMap'];
    inputMap: TreeIndex['inputMap'];
  } {
    const {
      tree,
      removeNodeMutations,
      textMutations,
      attributeMutations,
    } = this;

    const batchMutationData: mutationData = {
      source: IncrementalSource.Mutation,
      removes: removeNodeMutations,
      texts: textMutations,
      attributes: attributeMutations,
      adds: [],
    };

    const walk = (treeNode: TreeNode, removed: boolean) => {
      if (removed) {
        this.removeIdSet.add(treeNode.id);
      }
      batchMutationData.texts = batchMutationData.texts
        .concat(removed ? [] : treeNode.texts)
        .filter((m) => !this.removeIdSet.has(m.id));
      batchMutationData.attributes = batchMutationData.attributes
        .concat(removed ? [] : treeNode.attributes)
        .filter((m) => !this.removeIdSet.has(m.id));
      if (
        !this.removeIdSet.has(treeNode.id) &&
        !this.removeIdSet.has(treeNode.mutation.parentId) &&
        !removed
      ) {
        batchMutationData.adds.push(treeNode.mutation);
        if (treeNode.children) {
          Object.values(treeNode.children).forEach((n) => walk(n, false));
        }
      } else {
        Object.values(treeNode.children).forEach((n) => walk(n, true));
      }
    };

    Object.values(tree).forEach((n) => walk(n, false));

    for (const id of this.scrollMap.keys()) {
      if (this.removeIdSet.has(id)) {
        this.scrollMap.delete(id);
      }
    }
    for (const id of this.inputMap.keys()) {
      if (this.removeIdSet.has(id)) {
        this.inputMap.delete(id);
      }
    }

    const scrollMap = new Map(this.scrollMap);
    const inputMap = new Map(this.inputMap);

    this.reset();

    return {
      mutationData: batchMutationData,
      scrollMap,
      inputMap,
    };
  }

  private reset() {
    this.tree = [];
    this.indexes = new Map();
    this.removeNodeMutations = [];
    this.textMutations = [];
    this.attributeMutations = [];
    this.removeIdSet = new Set();
    this.scrollMap = new Map();
    this.inputMap = new Map();
  }

  public idRemoved(id: number): boolean {
    return this.removeIdSet.has(id);
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
  builtNode: HTMLIFrameElement;
};

export function isSerializedIframe(
  n: Node,
  mirror: Mirror,
): n is HTMLIFrameElement {
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

export function hasShadowRoot<T extends Node>(
  n: T,
): n is T & { shadowRoot: ShadowRoot } {
  return Boolean(((n as unknown) as Element)?.shadowRoot);
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
