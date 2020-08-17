import {
  Mirror,
  throttleOptions,
  listenerHandler,
  hookResetter,
  blockClass,
  eventWithTime,
  EventType,
  IncrementalSource,
  addedNodeMutation,
  removedNodeMutation,
  textMutation,
  attributeMutation,
  mutationData,
  scrollData,
  inputData,
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
      n.childNodes.forEach((child) =>
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

export function isIgnored(n: Node | INode, slimDOM: boolean): boolean {
  if (!slimDOM) {
    return false;
  }
  if ('__sn' in n) {
    return (n as INode).__sn.id === -2;
  }
  // The main part of the slimDOM check happens in
  // rrweb-snapshot::serializeNodeWithId
  return false;
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

export function polyfill(win = window) {
  if ('NodeList' in win && !win.NodeList.prototype.forEach) {
    win.NodeList.prototype.forEach = (Array.prototype
      .forEach as unknown) as NodeList['forEach'];
  }

  if ('DOMTokenList' in win && !win.DOMTokenList.prototype.forEach) {
    win.DOMTokenList.prototype.forEach = (Array.prototype
      .forEach as unknown) as DOMTokenList['forEach'];
  }
}

export function needCastInSyncMode(event: eventWithTime): boolean {
  switch (event.type) {
    case EventType.DomContentLoaded:
    case EventType.Load:
    case EventType.Custom:
      return false;
    case EventType.FullSnapshot:
    case EventType.Meta:
      return true;
    default:
      break;
  }

  switch (event.data.source) {
    case IncrementalSource.MouseMove:
    case IncrementalSource.MouseInteraction:
    case IncrementalSource.TouchMove:
    case IncrementalSource.MediaInteraction:
      return false;
    case IncrementalSource.ViewportResize:
    case IncrementalSource.StyleSheetRule:
    case IncrementalSource.Scroll:
    case IncrementalSource.Input:
      return true;
    default:
      break;
  }

  return true;
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

  public remove(mutation: removedNodeMutation) {
    const parentTreeNode = this.indexes.get(mutation.parentId);
    const treeNode = this.indexes.get(mutation.id);

    const deepRemoveFromMirror = (id: number) => {
      this.removeIdSet.add(id);
      const node = mirror.getNode(id);
      node?.childNodes.forEach((childNode) => {
        if ('__sn' in childNode) {
          deepRemoveFromMirror(((childNode as unknown) as INode).__sn.id);
        }
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
}
