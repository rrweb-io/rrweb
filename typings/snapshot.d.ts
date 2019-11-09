import { serializedNodeWithId, INode, idNodeMap } from './types';
export declare function absoluteToStylesheet(cssText: string, href: string): string;
export declare function absoluteToDoc(doc: Document, attributeValue: string): string;
export declare function transformAttribute(doc: Document, name: string, value: string): string;
export declare function serializeNodeWithId(n: Node | INode, doc: Document, map: idNodeMap, blockClass: string | RegExp, skipChild?: boolean, inlineStylesheet?: boolean, maskAllInputs?: boolean): serializedNodeWithId | null;
declare function snapshot(n: Document, blockClass?: string | RegExp, inlineStylesheet?: boolean, maskAllInputs?: boolean): [serializedNodeWithId | null, idNodeMap];
export default snapshot;
