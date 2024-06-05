let untaintedNodePrototype: typeof Node.prototype;
export function getUntaintedNode(): (typeof Node)['prototype'] {
  if (untaintedNodePrototype) return untaintedNodePrototype;

  const isUntainted = Object.getOwnPropertyDescriptor(
    Node.prototype,
    'childNodes',
  )
    ?.get?.toString()
    .includes('[native code]');

  if (isUntainted) return (untaintedNodePrototype = Node.prototype);

  try {
    const iframeEl = document.createElement('iframe');
    document.body.appendChild(iframeEl);
    const win = iframeEl.contentWindow;
    if (!win) return Node.prototype;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const untaintedNode = (win as any).Node.prototype as typeof Node.prototype;
    // cleanup
    document.body.removeChild(iframeEl);

    if (!untaintedNode) return Node.prototype;

    return (untaintedNodePrototype = untaintedNode);
  } catch {
    return Node.prototype;
  }
}

const untaintedAccessorCache: Record<
  string,
  (this: Node, ...args: unknown[]) => unknown
> = {};
function getUntaintedNodeAccessor<T extends keyof typeof Node.prototype>(
  node: Node,
  accessor: T,
): (typeof Node.prototype)[T] {
  if (untaintedAccessorCache[accessor])
    return untaintedAccessorCache[accessor].call(
      node,
    ) as (typeof Node.prototype)[T];

  const untaintedNode = getUntaintedNode();
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const untaintedAccessor = Object.getOwnPropertyDescriptor(
    untaintedNode,
    accessor,
  )?.get;

  if (!untaintedAccessor) return node[accessor];

  untaintedAccessorCache[accessor] = untaintedAccessor;

  return untaintedAccessor.call(node) as (typeof Node.prototype)[T];
}

type NodeMethod = (this: Node, ...args: unknown[]) => unknown;

const untaintedMethodCache: Record<string, NodeMethod> = {};
function getUntaintedNodeMethod<T extends keyof typeof Node.prototype>(
  node: Node,
  method: T,
): (typeof Node.prototype)[T] {
  if (untaintedMethodCache[method as string])
    return untaintedMethodCache[method as string].bind(
      node,
    ) as (typeof Node.prototype)[T];

  const untaintedNode = getUntaintedNode();
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const untaintedMethod = untaintedNode[method];

  if (typeof untaintedMethod !== 'function') return node[method];

  untaintedMethodCache[method as string] = untaintedMethod as NodeMethod;

  return untaintedMethod.bind(node) as (typeof Node.prototype)[T];
}

// const untaintedPropertyCache: Record<
//   string,
//   (this: Node, ...args: unknown[]) => unknown
// > = {};
// // function getUntaintedNodeProperty<T extends keyof typeof Node.prototype>(
// function getUntaintedNodeProperty<T extends 'contains'>(
//   node: Node,
//   key: T,
//   ...argumentsList: unknown[]
// ): ReturnType<(typeof Node.prototype)['contains']> {
//   if (untaintedPropertyCache[key])
//     return untaintedPropertyCache[key].call(
//       node,
//       ...argumentsList,
//     ) as ReturnType<(typeof Node.prototype)[T]>;

//   const untaintedNode = getUntaintedNode();
//   // eslint-disable-next-line @typescript-eslint/unbound-method
//   const untaintedProperty = Object.getOwnPropertyDescriptor(
//     untaintedNode,
//     key,
//   )?.value;

//   if (!untaintedProperty) return untaintedPropertyCache[key]?.call(node, ...argumentsList);

//   untaintedPropertyCache[key] = untaintedProperty;

//   return untaintedProperty.call(node, ...argumentsList) as ReturnType<
//     (typeof Node.prototype)[T]
//   >;
// }

export function childNodes(n: Node): NodeListOf<Node> {
  // return n.childNodes;
  return getUntaintedNodeAccessor(n, 'childNodes');
}

export function parentNode(n: Node): ParentNode | null {
  return getUntaintedNodeAccessor(n, 'parentNode');
}

export function parentElement(n: Node): HTMLElement | null {
  return getUntaintedNodeAccessor(n, 'parentElement');
}

export function textContent(n: Node): string | null {
  return getUntaintedNodeAccessor(n, 'textContent');
}

export function contains(n: Node, other: Node): boolean {
  return getUntaintedNodeMethod(n, 'contains')(other);
}

export function getRootNode(n: Node): Node {
  return getUntaintedNodeMethod(n, 'getRootNode')();
}

// TODO: add these:
//  * ShadowRoot#host
//  * ShadowRoot#styleSheets
//  * ShadowRoot#getSelection
//  * Element#shadowRoot
//  * Element#querySelector
//  * Element#querySelectorAll

// TODO: maybe add these:
// * MutationObserver
// * ShadowRoot

// export function contains(n: Node, other: Node): boolean {
//   return getUntaintedNodeProperty(n, 'contains', other);
// }

// export function getRootNode(n: Node): Node {
//   return getUntaintedNodeAccessor(n, 'getRootNode');
// }
