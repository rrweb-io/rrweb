/**
 * Rebuild-domain utility entrypoint.
 *
 * Intent:
 * - Keep rebuild.ts imports explicit and isolated from snapshot-only helpers.
 * - Serve as a stable seam for future extraction into rebuild-only modules.
 * - Preserve current public API behavior by re-exporting from legacy utils.ts.
 */
export { isElement, Mirror, isNodeMetaEqual, extractFileExtension } from './utils';
