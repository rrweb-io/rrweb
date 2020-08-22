import { serializedNodeWithId, idNodeMap, INode } from './types';
export declare function addHoverClass(cssText: string): string;
export declare function buildNodeWithSN(n: serializedNodeWithId, doc: Document, map: idNodeMap, skipChild?: boolean, HACK_CSS?: boolean): INode | null;
declare function rebuild(n: serializedNodeWithId, doc: Document, onVisit?: (node: INode) => unknown, HACK_CSS?: boolean): [Node | null, idNodeMap];
export default rebuild;
