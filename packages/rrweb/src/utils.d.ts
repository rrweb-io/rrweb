import type { throttleOptions, listenerHandler, hookResetter, blockClass, addedNodeMutation, DocumentDimension, IWindow, DeprecatedMirror, textMutation, IMirror } from '@newrelic/rrweb-types';
import type { Mirror, SlimDOMOptions } from '@newrelic/rrweb-snapshot';
import { RRNode, RRIFrameElement } from '@newrelic/rrdom';
export declare function on(type: string, fn: EventListenerOrEventListenerObject, target?: Document | IWindow): listenerHandler;
export declare let _mirror: DeprecatedMirror;
export declare function throttle<T>(func: (arg: T) => void, wait: number, options?: throttleOptions): (...args: T[]) => void;
export declare function hookSetter<T>(target: T, key: string | number | symbol, d: PropertyDescriptor, isRevoked?: boolean, win?: Window & typeof globalThis): hookResetter;
declare let nowTimestamp: () => number;
export { nowTimestamp };
export declare function getWindowScroll(win: Window): {
    left: number;
    top: number;
};
export declare function getWindowHeight(): number;
export declare function getWindowWidth(): number;
export declare function closestElementOfNode(node: Node | null): HTMLElement | null;
export declare function isBlocked(node: Node | null, blockClass: blockClass, blockSelector: string | null, checkAncestors: boolean): boolean;
export declare function isSerialized(n: Node, mirror: Mirror): boolean;
export declare function isIgnored(n: Node, mirror: Mirror, slimDOMOptions: SlimDOMOptions): boolean;
export declare function isAncestorRemoved(target: Node, mirror: Mirror): boolean;
export declare function legacy_isTouchEvent(event: MouseEvent | TouchEvent | PointerEvent): event is TouchEvent;
export declare function polyfill(win?: Window & typeof globalThis): void;
type ResolveTree = {
    value: addedNodeMutation;
    children: ResolveTree[];
    parent: ResolveTree | null;
};
export declare function queueToResolveTrees(queue: addedNodeMutation[]): ResolveTree[];
export declare function iterateResolveTree(tree: ResolveTree, cb: (mutation: addedNodeMutation) => unknown): void;
export type AppendedIframe = {
    mutationInQueue: addedNodeMutation;
    builtNode: HTMLIFrameElement | RRIFrameElement;
};
export declare function isSerializedIframe<TNode extends Node | RRNode>(n: TNode, mirror: IMirror<TNode>): boolean;
export declare function isSerializedStylesheet<TNode extends Node | RRNode>(n: TNode, mirror: IMirror<TNode>): boolean;
export declare function getBaseDimension(node: Node, rootIframe: Node): DocumentDimension;
export declare function hasShadowRoot<T extends Node | RRNode>(n: T): n is T & {
    shadowRoot: ShadowRoot;
};
export declare function getNestedRule(rules: CSSRuleList, position: number[]): CSSGroupingRule;
export declare function getPositionsAndIndex(nestedIndex: number[]): {
    positions: number[];
    index: number | undefined;
};
export declare function uniqueTextMutations(mutations: textMutation[]): textMutation[];
export declare class StyleSheetMirror {
    private id;
    private styleIDMap;
    private idStyleMap;
    getId(stylesheet: CSSStyleSheet): number;
    has(stylesheet: CSSStyleSheet): boolean;
    add(stylesheet: CSSStyleSheet, id?: number): number;
    getStyle(id: number): CSSStyleSheet | null;
    reset(): void;
    generateId(): number;
}
export declare function getShadowHost(n: Node): Element | null;
export declare function getRootShadowHost(n: Node): Node;
export declare function shadowHostInDom(n: Node): boolean;
export declare function inDom(n: Node): boolean;
