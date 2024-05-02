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
  getSourcesFromSrcset,
} from './snapshot';
import rebuild, {
  buildNodeWithSN,
  adaptCssForReplay,
  createCache,
  createSandboxedIframe,
  rebuildIntoSandboxedIframe,
  buildStyleNode,
} from './rebuild';
export * from './types';
// Legacy broad export kept for compatibility. New internal imports should
// prefer snapshot-utils.ts / rebuild-utils.ts domain entrypoints.
export * from './utils';

export {
  snapshot,
  serializeNodeWithId,
  rebuild,
  createSandboxedIframe,
  rebuildIntoSandboxedIframe,
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
  getSourcesFromSrcset,
  buildStyleNode,
};
