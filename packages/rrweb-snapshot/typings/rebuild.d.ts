import { serializedNodeWithId, idNodeMap, INode, BuildCache } from './types';
export declare function addHoverClass(cssText: string, cache: BuildCache): string;
export declare function createCache(): BuildCache;
export declare function buildNodeWithSN(n: serializedNodeWithId, options: {
    doc: Document;
    map: idNodeMap;
    skipChild?: boolean;
    hackCss: boolean;
    afterAppend?: (n: INode) => unknown;
    cache: BuildCache;
}): INode | null;
declare function rebuild(n: serializedNodeWithId, options: {
    doc: Document;
    onVisit?: (node: INode) => unknown;
    hackCss?: boolean;
    afterAppend?: (n: INode) => unknown;
    cache: BuildCache;
}): [Node | null, idNodeMap];
export default rebuild;
