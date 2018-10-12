import { serializedNodeWithId, idNodeMap } from './src/types';
export * from './src/types';

export function snapshot(n: Document): [serializedNodeWithId | null, idNodeMap];
export function rebuild(n: serializedNodeWithId): [Node | null, idNodeMap];
export function serializeNodeWithId(
  n: Node,
  doc: Document,
  map: idNodeMap,
): serializedNodeWithId | null;
