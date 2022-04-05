import { MaskInputFn, MaskInputOptions, serializedNode } from './types';
export declare function isElement(n: Node): n is Element;
export declare function isShadowRoot(n: Node): n is ShadowRoot;
export declare class Mirror {
    private idNodeMap;
    private nodeIdMap;
    private nodeMetaMap;
    getId(n: Node | undefined | null): number;
    getNode(id: number): Node | null;
    getIds(): number[];
    getMeta(n: Node): serializedNode | null;
    removeNodeFromMap(n: Node): void;
    has(id: number): boolean;
    hasNode(node: Node): boolean;
    add(n: Node, id: number, meta?: serializedNode): void;
    reset(): void;
}
export declare function createMirror(): Mirror;
export declare function maskInputValue({ maskInputOptions, tagName, type, value, maskInputFn, }: {
    maskInputOptions: MaskInputOptions;
    tagName: string;
    type: string | number | boolean | null;
    value: string | null;
    maskInputFn?: MaskInputFn;
}): string;
export declare function is2DCanvasBlank(canvas: HTMLCanvasElement): boolean;
