import { serializedNodeWithId, idNodeMap, INode } from './src/types';
export * from './src/types';

export function snapshot(n: Document): [serializedNodeWithId | null, idNodeMap];
export function rebuild(
  n: serializedNodeWithId,
  doc: Document,
): [Node | null, idNodeMap];
export function serializeNodeWithId(
  n: Node,
  doc: Document,
  map: idNodeMap,
  skipChild?: boolean,
): serializedNodeWithId | null;
export function resetId(): void;
export function buildNodeWithSN(
  n: serializedNodeWithId,
  doc: Document,
  map: idNodeMap,
  skipChild?: boolean,
): INode | null;
