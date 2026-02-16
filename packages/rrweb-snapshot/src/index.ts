import snapshot, {
  serializeNodeWithId,
  transformAttribute,
  ignoreAttribute,
  slimDOMDefaults,
  visitSnapshot,
  cleanupSnapshot,
  needMaskingText,
  classMatchesRegex,
  IGNORED_NODE,
  genId,
} from './snapshot';
import rebuild, {
  buildNodeWithSN,
  adaptCssForReplay,
  createCache,
} from './rebuild';
export * from './types';
// Legacy broad export kept for compatibility. New internal imports should
// prefer snapshot-utils.ts / rebuild-utils.ts domain entrypoints.
export * from './utils';

export {
  snapshot,
  serializeNodeWithId,
  rebuild,
  buildNodeWithSN,
  adaptCssForReplay,
  createCache,
  transformAttribute,
  ignoreAttribute,
  slimDOMDefaults,
  visitSnapshot,
  cleanupSnapshot,
  needMaskingText,
  classMatchesRegex,
  IGNORED_NODE,
  genId,
};
