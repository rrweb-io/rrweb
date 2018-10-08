import { serializedNodeWithId } from './src/types';
export * from './src/types';

export function snapshot(n: Document): serializedNodeWithId | null;
export function rebuild(n: serializedNodeWithId): Node | null;
