/**
 * Legacy shared utility module.
 *
 * This file is part of the public API surface, re-exported from index.ts.
 * Keep it as a compatibility shim for external users while internal snapshot
 * and rebuild code consume the narrower domain entrypoints.
 */
export {
  Mirror,
  createMirror,
  extractFileExtension,
  isElement,
} from './shared-utils';
export {
  absolutifyURLs,
  escapeImportStatement,
  fixSafariColons,
  getInputType,
  is2DCanvasBlank,
  isCSSImportRule,
  isCSSStyleRule,
  isNativeShadowDom,
  isShadowRoot,
  markCssSplits,
  maskInputValue,
  normalizeCssString,
  splitCssText,
  stringifyRule,
  stringifyStylesheet,
  toLowerCase,
} from './snapshot-utils';
export { isNodeMetaEqual } from './rebuild-utils';
