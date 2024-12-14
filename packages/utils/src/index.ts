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

/*
 When angular patches things - particularly the MutationObserver -
 they pass the `isNativeFunction` check
 That then causes performance issues
 because Angular's change detection
 doesn't like sharing a mutation observer
 Checking for the presence of the Zone object
 on global is a good-enough proxy for Angular
 to cover most cases
 (you can configure zone.js to have a different name
  on the global object and should then manually run rrweb
  outside the Zone)
 */
export const isAngularZonePresent = (): boolean => {
  return !!(globalThis as { Zone?: unknown }).Zone;
};

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
      methodNames.every(
        // @ts-expect-error 2345
        (method: keyof typeof defaultPrototype) =>
          typeof defaultPrototype[method] === 'function' &&
          defaultPrototype[method]?.toString().includes('[native code]'),
      ),
  );

  if (isUntaintedAccessors && isUntaintedMethods && !isAngularZonePresent()) {
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

export function childNodes(n: Node): NodeListOf<Node> {
  return getUntaintedAccessor('Node', n, 'childNodes');
}

export function parentNode(n: Node): ParentNode | null {
  return getUntaintedAccessor('Node', n, 'parentNode');
}

export function parentElement(n: Node): HTMLElement | null {
  return getUntaintedAccessor('Node', n, 'parentElement');
}

export function textContent(n: Node): string | null {
  return getUntaintedAccessor('Node', n, 'textContent');
}

export function contains(n: Node, other: Node): boolean {
  return getUntaintedMethod('Node', n, 'contains')(other);
}

export function getRootNode(n: Node): Node {
  return getUntaintedMethod('Node', n, 'getRootNode')();
}

export function host(n: ShadowRoot): Element | null {
  if (!n || !('host' in n)) return null;
  return getUntaintedAccessor('ShadowRoot', n, 'host');
}

export function styleSheets(n: ShadowRoot): StyleSheetList {
  return n.styleSheets;
}

export function shadowRoot(n: Node): ShadowRoot | null {
  if (!n || !('shadowRoot' in n)) return null;
  return getUntaintedAccessor('Element', n as Element, 'shadowRoot');
}

export function querySelector(n: Element, selectors: string): Element | null {
  return getUntaintedAccessor('Element', n, 'querySelector')(selectors);
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

// copy from https://github.com/getsentry/sentry-javascript/blob/b2109071975af8bf0316d3b5b38f519bdaf5dc15/packages/utils/src/object.ts
export function patch(
  source: { [key: string]: any },
  name: string,
  replacement: (...args: unknown[]) => unknown,
): () => void {
  try {
    if (!(name in source)) {
      return () => {
        //
      };
    }

    const original = source[name] as () => unknown;
    const wrapped = replacement(original);

    // Make sure it's a function first, as we need to attach an empty prototype for `defineProperties` to work
    // otherwise it'll throw "TypeError: Object.defineProperties called on non-object"
    if (typeof wrapped === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    return () => {
      //
    };
    // This can throw if multiple fill happens on a global object like XMLHttpRequest
    // Fixes https://github.com/getsentry/sentry-javascript/issues/2043
  }
}

export default {
  childNodes,
  parentNode,
  parentElement,
  textContent,
  contains,
  getRootNode,
  host,
  styleSheets,
  shadowRoot,
  querySelector,
  querySelectorAll,
  mutationObserver: mutationObserverCtor,
  patch,
};
