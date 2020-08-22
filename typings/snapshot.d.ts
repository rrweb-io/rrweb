import { serializedNodeWithId, INode, idNodeMap, MaskInputOptions } from './types';
export declare function absoluteToStylesheet(cssText: string | null, href: string): string;
export declare function absoluteToDoc(doc: Document, attributeValue: string): string;
export declare function transformAttribute(doc: Document, name: string, value: string): string;
export declare function serializeNodeWithId(n: Node | INode, doc: Document, map: idNodeMap, blockClass: string | RegExp, skipChild?: boolean, inlineStylesheet?: boolean, maskInputOptions?: MaskInputOptions): serializedNodeWithId | null;
declare function snapshot(n: Document, blockClass: string | RegExp | undefined, inlineStylesheet: boolean | undefined, maskAllInputsOrOptions: boolean | MaskInputOptions): [serializedNodeWithId | null, idNodeMap];
export declare function visitSnapshot(node: serializedNodeWithId, onVisit: (node: serializedNodeWithId) => unknown): void;
export default snapshot;
