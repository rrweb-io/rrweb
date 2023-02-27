import { throttleOptions, listenerHandler, hookResetter, addedNodeMutation, removedNodeMutation, textMutation, attributeMutation, mutationData, scrollData, inputData, DocumentDimension, IWindow, DeprecatedMirror, eventWithTime } from './types';
import { Mirror } from '@fullview/rrweb-snapshot';
export declare function on(type: string, fn: EventListenerOrEventListenerObject, target?: Document | IWindow): listenerHandler;
export declare let _mirror: DeprecatedMirror;
export declare function throttle<T>(func: (arg: T) => void, wait: number, options?: throttleOptions): (arg: T) => void;
export declare function hookSetter<T>(target: T, key: string | number | symbol, d: PropertyDescriptor, isRevoked?: boolean, win?: Window & typeof globalThis): hookResetter;
export declare function patch(source: {
    [key: string]: any;
}, name: string, replacement: (...args: any[]) => any): () => void;
export declare function getWindowHeight(): number;
export declare function getWindowWidth(): number;
export declare function isBlocked(node: Node | null, blockSelector: string | null): boolean;
export declare function isSerialized(n: Node, mirror: Mirror): boolean;
export declare function isIgnored(n: Node, mirror: Mirror): boolean;
export declare function isAncestorRemoved(target: Node, mirror: Mirror): boolean;
export declare function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent;
export declare function polyfill(win?: Window & typeof globalThis): void;
export declare type TreeNode = {
    id: number;
    mutation: addedNodeMutation;
    parent?: TreeNode;
    children: Record<number, TreeNode>;
    texts: textMutation[];
    attributes: attributeMutation[];
};
export declare class TreeIndex {
    tree: Record<number, TreeNode>;
    private removeNodeMutations;
    private textMutations;
    private attributeMutations;
    private indexes;
    private removeIdSet;
    private scrollMap;
    private inputMap;
    constructor();
    add(mutation: addedNodeMutation): void;
    remove(mutation: removedNodeMutation, mirror: Mirror): void;
    text(mutation: textMutation): void;
    attribute(mutation: attributeMutation): void;
    scroll(d: scrollData): void;
    input(d: inputData): void;
    flush(): {
        mutationData: mutationData;
        scrollMap: TreeIndex['scrollMap'];
        inputMap: TreeIndex['inputMap'];
    };
    private reset;
    idRemoved(id: number): boolean;
}
declare type ResolveTree = {
    value: addedNodeMutation;
    children: ResolveTree[];
    parent: ResolveTree | null;
};
export declare function queueToResolveTrees(queue: addedNodeMutation[]): ResolveTree[];
export declare function iterateResolveTree(tree: ResolveTree, cb: (mutation: addedNodeMutation) => unknown): void;
export declare type AppendedIframe = {
    mutationInQueue: addedNodeMutation;
    builtNode: HTMLIFrameElement;
};
export declare function isSerializedIframe(n: Node, mirror: Mirror): n is HTMLIFrameElement;
export declare function getBaseDimension(node: Node, rootIframe: Node): DocumentDimension;
export declare function hasShadowRoot<T extends Node>(n: T): n is T & {
    shadowRoot: ShadowRoot;
};
export declare function isUserInteraction(event: eventWithTime): boolean;
export {};
