/**
 * Snapshot-domain utility entrypoint.
 *
 * Intent:
 * - Keep snapshot.ts imports explicit and decoupled from rebuild concerns.
 * - Serve as a stable seam for future extraction into snapshot-only modules.
 * - Preserve current public API behavior by re-exporting from legacy utils.ts.
 */
export {
  Mirror,
  is2DCanvasBlank,
  isElement,
  isShadowRoot,
  maskInputValue,
  isNativeShadowDom,
  stringifyStylesheet,
  getInputType,
  toLowerCase,
  extractFileExtension,
  absolutifyURLs,
  markCssSplits,
} from './utils';
