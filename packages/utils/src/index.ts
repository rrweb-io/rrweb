// type PrototypeOwnerType = Node | ShadowRoot | MutationObserver | Element;
// type PrototypeType = typeof PrototypeOwnerType.prototype;

// let untaintedBasePrototype = new Map<string, PrototypeOwnerType>();

type PrototypeOwner = Node | ShadowRoot | MutationObserver | Element;
type TypeofPrototypeOwner =
  | typeof Node
  | typeof ShadowRoot
  | typeof MutationObserver
  | typeof Element;

type BasePrototypeCache = {
  Node: typeof Node.prototype;
  ShadowRoot: typeof ShadowRoot.prototype;
  MutationObserver: typeof MutationObserver.prototype;
  Element: typeof Element.prototype;
};

// type BaseCache = {
//   Node: typeof Node;
//   ShadowRoot: typeof ShadowRoot;
//   MutationObserver: typeof MutationObserver;
//   Element: typeof Element;
// };

const testableAccessors = {
  Node: ['childNodes', 'parentNode', 'parentElement', 'textContent'] as const,
  ShadowRoot: ['host', 'styleSheets'] as const,
  Element: ['shadowRoot', 'querySelector', 'querySelectorAll'] as const,
  MutationObserver: [] as const,
} as const;

const testableMethods = {
  Node: ['contains', 'getRootNode'] as const,
  ShadowRoot: ['getSelection'],
  Element: [],
  MutationObserver: ['constructor'],
} as const;

const untaintedBasePrototype: Partial<BasePrototypeCache> = {};
// const untaintedBase: Partial<BaseCache> = {};

// export function getUntaintedBase<T extends keyof BaseCache>(
//   key: T,
// ): BaseCache[T] {
//   console.log('xchecking', key, untaintedBase[key]);
//   if (untaintedBase[key]) return untaintedBase[key] as BaseCache[T];

//   console.log('xchecking2', key);
//   const defaultObj = globalThis[key] as BaseCache[T];
//   const defaultPrototype = defaultObj.prototype as BaseCache[T]['prototype'];

//   console.log('xchecking3', key);
//   // use list of testable accessors to check if the prototype is tainted
//   const isUntaintedAccessors = Boolean(
//     !(key in testableAccessors) ||
//       // @ts-expect-error 2345
//       testableAccessors[key].every(
//         // @ts-expect-error 2345
//         (accessor: keyof (typeof BaseCache)[T]['prototype']) =>
//           Boolean(
//             Object.getOwnPropertyDescriptor(defaultObj.prototype, accessor)
//               ?.get?.toString()
//               .includes('[native code]'),
//           ),
//       ),
//   );
//   console.log('xchecking4', key);

//   const methodNames = key in testableMethods ? testableMethods[key] : undefined;
//   const isUntaintedMethods = Boolean(
//     !methodNames ||
//       // @ts-expect-error 2345
//       methodNames.every(
//         (method: keyof (typeof defaultObj)['prototype']) =>
//           typeof defaultPrototype[method] === 'function' &&
//           defaultPrototype[method]?.toString().includes('[native code]'),
//       ),
//   );

//   console.log('was untainted', key, isUntaintedAccessors, isUntaintedMethods);

//   if (isUntaintedAccessors && isUntaintedMethods) {
//     untaintedBase[key] = defaultObj;
//     return defaultObj;
//   }

//   try {
//     const iframeEl = document.createElement('iframe');
//     document.body.appendChild(iframeEl);
//     const win = iframeEl.contentWindow;
//     if (!win) return defaultObj;

//     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
//     const untaintedObject = (win as any)[key].prototype as BaseCache[T];
//     // cleanup
//     document.body.removeChild(iframeEl);

//     if (!untaintedObject) return defaultObj;

//     console.log('success');
//     return (untaintedBase[key] = untaintedObject);
//   } catch (e) {
//     console.log(e);
//     return defaultObj;
//   }
// }

export function getUntaintedPrototype<T extends keyof BasePrototypeCache>(
  key: T,
): BasePrototypeCache[T] {
  if (untaintedBasePrototype[key])
    return untaintedBasePrototype[key] as BasePrototypeCache[T];

  const defaultObj = globalThis[key] as TypeofPrototypeOwner;
  const defaultPrototype = defaultObj.prototype as BasePrototypeCache[T];

  // use list of testable accessors to check if the prototype is tainted
  const accessorNames =
    key in testableAccessors ? testableAccessors[key] : undefined;
  const isUntaintedAccessors = Boolean(
    accessorNames &&
      // @ts-expect-error 2345
      accessorNames.every((accessor: keyof typeof defaultPrototype) =>
        Boolean(
          Object.getOwnPropertyDescriptor(defaultPrototype, accessor)
            ?.get?.toString()
            .includes('[native code]'),
        ),
      ),
  );

  const methodNames = key in testableMethods ? testableMethods[key] : undefined;
  const isUntaintedMethods = Boolean(
    methodNames &&
      // @ts-expect-error 2345
      methodNames.every(
        (method: keyof typeof defaultPrototype) =>
          typeof defaultPrototype[method] === 'function' &&
          defaultPrototype[method]?.toString().includes('[native code]'),
      ),
  );

  if (isUntaintedAccessors && isUntaintedMethods) {
    untaintedBasePrototype[key] = defaultObj.prototype as BasePrototypeCache[T];
    return defaultObj.prototype as BasePrototypeCache[T];
  }

  try {
    const iframeEl = document.createElement('iframe');
    document.body.appendChild(iframeEl);
    const win = iframeEl.contentWindow;
    if (!win) return defaultObj.prototype as BasePrototypeCache[T];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const untaintedObject = (win as any)[key]
      .prototype as BasePrototypeCache[T];
    // cleanup
    document.body.removeChild(iframeEl);

    if (!untaintedObject) return defaultPrototype;

    return (untaintedBasePrototype[key] = untaintedObject);
  } catch {
    return defaultPrototype;
  }
}

const untaintedAccessorCache: Record<
  string,
  (this: PrototypeOwner, ...args: unknown[]) => unknown
> = {};

export function getUntaintedAccessor<
  K extends keyof BasePrototypeCache,
  T extends keyof BasePrototypeCache[K],
>(
  key: K,
  instance: BasePrototypeCache[K],
  accessor: T,
): BasePrototypeCache[K][T] {
  const cacheKey = `${key}.${String(accessor)}`;
  if (untaintedAccessorCache[cacheKey])
    return untaintedAccessorCache[cacheKey].call(
      instance,
    ) as BasePrototypeCache[K][T];

  const untaintedPrototype = getUntaintedPrototype(key);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const untaintedAccessor = Object.getOwnPropertyDescriptor(
    untaintedPrototype,
    accessor,
  )?.get;

  if (!untaintedAccessor) return instance[accessor];

  untaintedAccessorCache[cacheKey] = untaintedAccessor;

  return untaintedAccessor.call(instance) as BasePrototypeCache[K][T];
}

type BaseMethod<K extends keyof BasePrototypeCache> = (
  this: BasePrototypeCache[K],
  ...args: unknown[]
) => unknown;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untaintedMethodCache: Record<string, BaseMethod<any>> = {};
export function getUntaintedMethod<
  K extends keyof BasePrototypeCache,
  T extends keyof BasePrototypeCache[K],
>(
  key: K,
  instance: BasePrototypeCache[K],
  method: T,
): BasePrototypeCache[K][T] {
  const cacheKey = `${key}.${String(method)}`;
  if (untaintedMethodCache[cacheKey])
    return untaintedMethodCache[cacheKey].bind(
      instance,
    ) as BasePrototypeCache[K][T];

  const untaintedPrototype = getUntaintedPrototype(key);
  const untaintedMethod = untaintedPrototype[method];

  if (typeof untaintedMethod !== 'function') return instance[method];

  untaintedMethodCache[cacheKey] = untaintedMethod as BaseMethod<K>;

  return untaintedMethod.bind(instance) as BasePrototypeCache[K][T];
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
  // return (n as Node).childNodes;
  return getUntaintedAccessor('Node', n, 'childNodes');
}

export function parentNode(n: Node): ParentNode | null {
  return getUntaintedAccessor('Node', n, 'parentNode');
  // return n.parentNode;
}

export function parentElement(n: Node): HTMLElement | null {
  return getUntaintedAccessor('Node', n, 'parentElement');
  // return n.parentElement;
}

export function textContent(n: Node): string | null {
  return getUntaintedAccessor('Node', n, 'textContent');
  // return n.textContent;
}

export function contains(n: Node, other: Node): boolean {
  // return getUntaintedMethod('Node', n, 'contains')(other);
  return n.contains(other);
}

export function getRootNode(n: Node): Node {
  // return getUntaintedMethod('Node', n, 'getRootNode')();
  return n.getRootNode();
}

export function host(n: ShadowRoot): Element | null {
  if (!n || !('host' in n)) return null;
  return getUntaintedAccessor('ShadowRoot', n, 'host');
  // return n.host;
}

export function styleSheets(n: ShadowRoot): StyleSheetList {
  // return getUntaintedAccessor('ShadowRoot', n, 'styleSheets');
  return n.styleSheets;
}

// export function getSelection(n: ShadowRoot): Selection | null {
//   return getUntaintedMethod('ShadowRoot', n, 'getSelection');
// }

export function shadowRoot(n: Node): ShadowRoot | null {
  if (!n || !('shadowRoot' in n)) return null;
  return getUntaintedAccessor('Element', n as Element, 'shadowRoot');
  // return (n as Element).shadowRoot;
}

export function querySelector(n: Element, selectors: string): Element | null {
  // return getUntaintedAccessor('Element', n, 'querySelector')(selectors);
  return n.querySelector(selectors);
}

export function querySelectorAll(
  n: Element,
  selectors: string,
): NodeListOf<Element> {
  return getUntaintedAccessor('Element', n, 'querySelectorAll')(selectors);
}

export function mutationObserverCtor(): (typeof MutationObserver)['prototype']['constructor'] {
  return getUntaintedPrototype('MutationObserver').constructor;
}

// TODO: add these:
//  * ShadowRoot#host
//  * ShadowRoot#styleSheets
//  * ShadowRoot#getSelection
//  * Element#shadowRoot
//  * Element#querySelector
//  * Element#querySelectorAll

// TODO: maybe add these:
// √ MutationObserver
// ~ ShadowRoot ~

// export function contains(n: Node, other: Node): boolean {
//   return getUntaintedNodeProperty(n, 'contains', other);
// }

// export function getRootNode(n: Node): Node {
//   return getUntaintedNodeAccessor(n, 'getRootNode');
// }
