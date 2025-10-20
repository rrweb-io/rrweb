const testableAccessors = {
    Node: ['childNodes', 'parentNode', 'parentElement', 'textContent'],
    ShadowRoot: ['host', 'styleSheets'],
    Element: ['shadowRoot', 'querySelector', 'querySelectorAll'],
    MutationObserver: [],
};
const testableMethods = {
    Node: ['contains', 'getRootNode'],
    ShadowRoot: ['getSelection'],
    Element: [],
    MutationObserver: ['constructor'],
};
const untaintedBasePrototype = {};
export const isAngularZonePresent = () => {
    return !!globalThis.Zone;
};
export function getUntaintedPrototype(key) {
    if (untaintedBasePrototype[key])
        return untaintedBasePrototype[key];
    const defaultObj = globalThis[key];
    const defaultPrototype = defaultObj.prototype;
    const accessorNames = key in testableAccessors ? testableAccessors[key] : undefined;
    const isUntaintedAccessors = Boolean(accessorNames &&
        accessorNames.every((accessor) => Boolean(Object.getOwnPropertyDescriptor(defaultPrototype, accessor)
            ?.get?.toString()
            .includes('[native code]'))));
    const methodNames = key in testableMethods ? testableMethods[key] : undefined;
    const isUntaintedMethods = Boolean(methodNames &&
        methodNames.every((method) => typeof defaultPrototype[method] === 'function' &&
            defaultPrototype[method]?.toString().includes('[native code]')));
    if (isUntaintedAccessors && isUntaintedMethods && !isAngularZonePresent()) {
        untaintedBasePrototype[key] = defaultObj.prototype;
        return defaultObj.prototype;
    }
    try {
        const iframeEl = document.createElement('iframe');
        document.body.appendChild(iframeEl);
        const win = iframeEl.contentWindow;
        if (!win)
            return defaultObj.prototype;
        const untaintedObject = win[key]
            .prototype;
        document.body.removeChild(iframeEl);
        if (!untaintedObject)
            return defaultPrototype;
        return (untaintedBasePrototype[key] = untaintedObject);
    }
    catch {
        return defaultPrototype;
    }
}
const untaintedAccessorCache = {};
export function getUntaintedAccessor(key, instance, accessor) {
    const cacheKey = `${key}.${String(accessor)}`;
    if (untaintedAccessorCache[cacheKey])
        return untaintedAccessorCache[cacheKey].call(instance);
    const untaintedPrototype = getUntaintedPrototype(key);
    const untaintedAccessor = Object.getOwnPropertyDescriptor(untaintedPrototype, accessor)?.get;
    if (!untaintedAccessor)
        return instance[accessor];
    untaintedAccessorCache[cacheKey] = untaintedAccessor;
    return untaintedAccessor.call(instance);
}
const untaintedMethodCache = {};
export function getUntaintedMethod(key, instance, method) {
    const cacheKey = `${key}.${String(method)}`;
    if (untaintedMethodCache[cacheKey])
        return untaintedMethodCache[cacheKey].bind(instance);
    const untaintedPrototype = getUntaintedPrototype(key);
    const untaintedMethod = untaintedPrototype[method];
    if (typeof untaintedMethod !== 'function')
        return instance[method];
    untaintedMethodCache[cacheKey] = untaintedMethod;
    return untaintedMethod.bind(instance);
}
export function childNodes(n) {
    return getUntaintedAccessor('Node', n, 'childNodes');
}
export function parentNode(n) {
    return getUntaintedAccessor('Node', n, 'parentNode');
}
export function parentElement(n) {
    return getUntaintedAccessor('Node', n, 'parentElement');
}
export function textContent(n) {
    return getUntaintedAccessor('Node', n, 'textContent');
}
export function contains(n, other) {
    return getUntaintedMethod('Node', n, 'contains')(other);
}
export function getRootNode(n) {
    return getUntaintedMethod('Node', n, 'getRootNode')();
}
export function host(n) {
    if (!n || !('host' in n))
        return null;
    return getUntaintedAccessor('ShadowRoot', n, 'host');
}
export function styleSheets(n) {
    return n.styleSheets;
}
export function shadowRoot(n) {
    if (!n || !('shadowRoot' in n))
        return null;
    return getUntaintedAccessor('Element', n, 'shadowRoot');
}
export function querySelector(n, selectors) {
    return getUntaintedAccessor('Element', n, 'querySelector')(selectors);
}
export function querySelectorAll(n, selectors) {
    return getUntaintedAccessor('Element', n, 'querySelectorAll')(selectors);
}
export function mutationObserverCtor() {
    return getUntaintedPrototype('MutationObserver').constructor;
}
export function patch(source, name, replacement) {
    try {
        if (!(name in source)) {
            return () => {
            };
        }
        const original = source[name];
        const wrapped = replacement(original);
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
    }
    catch {
        return () => {
        };
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
//# sourceMappingURL=index.js.map