import { serializedNodeWithId, idNodeMap, INode } from './types';
export declare function addHoverClass(cssText: string): string;
export declare function buildNodeWithSN(n: serializedNodeWithId, options: {
    doc: Document;
    map: idNodeMap;
    skipChild?: boolean;
    hackCss: boolean;
    afterAppend?: (n: INode) => unknown;
}): INode | null;
declare function rebuild(n: serializedNodeWithId, options: {
    doc: Document;
    onVisit?: (node: INode) => unknown;
    hackCss?: boolean;
    afterAppend?: (n: INode) => unknown;
}): [Node | null, idNodeMap];
export default rebuild;
