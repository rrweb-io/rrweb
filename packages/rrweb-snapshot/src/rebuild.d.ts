import { type serializedNodeWithId, type serializedElementNodeWithId } from '@rrweb/types';
import { type BuildCache } from './types';
import { Mirror } from './utils';
export declare function adaptCssForReplay(cssText: string, cache: BuildCache): string;
export declare function createCache(): BuildCache;
export declare function applyCssSplits(n: serializedElementNodeWithId, cssText: string, hackCss: boolean, cache: BuildCache): void;
export declare function buildStyleNode(n: serializedElementNodeWithId, styleEl: HTMLStyleElement, cssText: string, options: {
    doc: Document;
    hackCss: boolean;
    cache: BuildCache;
}): void;
export declare function buildNodeWithSN(n: serializedNodeWithId, options: {
    doc: Document;
    mirror: Mirror;
    skipChild?: boolean;
    hackCss: boolean;
    afterAppend?: (n: Node, id: number) => unknown;
    cache: BuildCache;
}): Node | null;
declare function rebuild(n: serializedNodeWithId, options: {
    doc: Document;
    onVisit?: (node: Node) => unknown;
    hackCss?: boolean;
    afterAppend?: (n: Node, id: number) => unknown;
    cache: BuildCache;
    mirror: Mirror;
}): Node | null;
export default rebuild;
