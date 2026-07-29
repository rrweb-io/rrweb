import type { RecordPlugin } from '@rrweb/types';
import { semanticSelector } from 'semantic-selector';

export const PLUGIN_NAME = 'rrweb/click-track@1';

// The stable, identity-only CSS selector generator lives in its own package
// (`semantic-selector`) — this plugin was where it was first drafted, but it is
// use-case-agnostic and now maintained standalone. Re-exported for consumers who
// want the raw selector without the click-tracking machinery.
export { semanticSelector } from 'semantic-selector';

// --- Types ---

export type ClickTrackPayload = {
  targetSelector: string;
  targetTagName: string;
  /** Click position as percentage of element width (0–100) */
  percentX: number;
  /** Click position as percentage of element height (0–100) */
  percentY: number;
  /** Element aspect ratio: width / height (>1 landscape, <1 portrait, 1 square) */
  aspect: number;
  /** Viewport width in CSS pixels at click time */
  viewportWidth: number;
  /** Viewport height in CSS pixels at click time */
  viewportHeight: number;
  hrefAttr?: string;
  srcAttr?: string;
  targetText?: string;
  sigTargetTagName?: string;
  sigTargetInternal?: boolean;
  /**
   * 1-based ordinal of the significant element among all elements the stable
   * `targetSelector` matched at record time. `semantic-selector`'s contract
   * permits a selector to match several same-identity elements, so the plugin
   * records which one was actually clicked for replay to disambiguate.
   * Present only when the selector matched more than one element.
   */
  selectorMatchIndex?: number;
  /** Total number of elements `targetSelector` matched at record time. Present only when > 1. */
  selectorMatchCount?: number;
  pointerType?: 'mouse' | 'touch' | 'pen';
};

export type ClickTrackOptions = {
  /**
   * Control innerText extraction for click targets.
   * - true: extract from all elements
   * - false: never extract
   * - string: comma-separated tag names to extract from (e.g. 'button,a')
   */
  targetText: boolean | string;
};

const defaultOptions: ClickTrackOptions = {
  targetText: 'button,a',
};

// --- Significant element detection ---

const CLICKABLE_SELECTOR =
  'a[href],area[href],button,input[type="submit"],input[type="button"]';

function findSignificantElement(target: HTMLElement): HTMLElement {
  // Walk up to find a meaningful clickable ancestor
  const clickable = target.closest(CLICKABLE_SELECTOR) as HTMLElement | null;
  return clickable || target;
}

// --- Core click tracking logic ---

function shouldExtractText(el: Element, config: boolean | string): boolean {
  if (config === true) return true;
  if (config === false) return false;
  const tags = (config as string).split(',').map((t) => t.trim().toLowerCase());
  return tags.includes(el.tagName.toLowerCase());
}

function buildPayload(
  e: MouseEvent,
  root: Element,
  opts: ClickTrackOptions,
  lastPointerType: string | null,
): ClickTrackPayload | null {
  const target = e.target;
  if (!target || !(target instanceof HTMLElement)) return null;

  const significantEl = findSignificantElement(target);
  const tag = significantEl.tagName.toLowerCase();

  let targetSelector: string;
  try {
    targetSelector = semanticSelector(significantEl, root);
  } catch {
    return null;
  }
  if (!targetSelector) return null;

  const bounds = target.getBoundingClientRect();
  const w = bounds.width || 1;
  const h = bounds.height || 1;

  const payload: ClickTrackPayload = {
    targetSelector,
    targetTagName: target.tagName,
    percentX: Math.round(10 * ((e.clientX - bounds.x) / w) * 100) / 10,
    percentY: Math.round(10 * ((e.clientY - bounds.y) / h) * 100) / 10,
    aspect: Math.round(100 * (w / h)) / 100,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };

  if (lastPointerType) {
    payload.pointerType = lastPointerType as 'mouse' | 'touch' | 'pen';
  }

  if (significantEl !== target) {
    payload.sigTargetTagName = significantEl.tagName;
    if (target.contains(significantEl)) {
      payload.sigTargetInternal = true;
    }
  }

  // Residual ambiguity (B2): the stable selector may match several
  // same-identity elements. Record where the significant element falls among
  // them so replay can disambiguate with geometry/aspect instead of relying on
  // brittle positional ordinals baked into the selector string. This stays in
  // the plugin rather than semanticSelector because the library's contract
  // permits returning a selector that matches several same-identity elements;
  // only the click tracker knows which one was actually hit.
  try {
    const matches = root.querySelectorAll(targetSelector);
    if (matches.length > 1) {
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] === significantEl) {
          payload.selectorMatchIndex = i + 1;
          payload.selectorMatchCount = matches.length;
          break;
        }
      }
    }
  } catch {
    // querySelectorAll can throw on exotic selectors; just skip the index.
  }
  if (tag === 'img') {
    const srcAttr = significantEl.getAttribute('src');
    if (srcAttr && !srcAttr.startsWith('data:')) {
      payload.srcAttr = srcAttr.substring(0, 300);
    }
  }

  if (opts.targetText !== false) {
    if (shouldExtractText(significantEl, opts.targetText)) {
      let text: string | null = null;
      if (tag === 'input') {
        text = (significantEl as HTMLInputElement).value;
      } else {
        text =
          (significantEl as HTMLElement).innerText || significantEl.textContent;
      }
      if (text) {
        payload.targetText = text.substring(0, 40);
      }
    }
  }

  return payload;
}

/**
 * Attach click-tracking listeners to a window/document.
 * Returns a cleanup function to remove the listeners.
 */
function attachClickListeners(
  win: Window | typeof globalThis,
  root: Element,
  opts: ClickTrackOptions,
  cb: (payload: ClickTrackPayload) => void,
): () => void {
  let lastPointerType: string | null = null;

  const onPointerDown = (e: PointerEvent) => {
    lastPointerType = e.pointerType || null;
  };

  const onClick = (e: MouseEvent) => {
    const payload = buildPayload(e, root, opts, lastPointerType);
    lastPointerType = null;
    if (payload) cb(payload);
  };

  win.addEventListener('pointerdown', onPointerDown, true);
  win.addEventListener('click', onClick, true);

  return () => {
    win.removeEventListener('pointerdown', onPointerDown, true);
    win.removeEventListener('click', onClick, true);
  };
}

// --- rrweb Plugin ---

export const getRecordClickTrackPlugin: (
  options?: Partial<ClickTrackOptions>,
) => RecordPlugin<ClickTrackOptions> = (options) => {
  const opts: ClickTrackOptions = { ...defaultOptions, ...options };

  return {
    name: PLUGIN_NAME,
    observer(cb, win, _pluginOptions) {
      const root = win.document.body;
      if (!root) return () => {};
      return attachClickListeners(
        win,
        root,
        opts,
        cb as (payload: ClickTrackPayload) => void,
      );
    },
    options: opts,
  };
};

// --- Standalone API ---

export type StandaloneClickTrackOptions = Partial<ClickTrackOptions> & {
  /** Called for every click with the payload. */
  callback: (payload: ClickTrackPayload) => void;
  /** The window to listen on. Defaults to `window`. */
  win?: Window;
  /** The root element for selector generation. Defaults to `document.body`. */
  root?: Element;
};

/**
 * Standalone click tracker — no rrweb dependency needed.
 *
 * Usage:
 * ```js
 * const stop = createClickTracker({
 *   callback: (payload) => {
 *     fetch('/api/clicks', { method: 'POST', body: JSON.stringify(payload) });
 *   },
 * });
 * // later: stop() to remove listeners
 * ```
 *
 * Listens on `pointerdown` (for pointer type) and `click` (fires for both
 * mouse and touch). Returns a cleanup function.
 */
export function createClickTracker(
  options: StandaloneClickTrackOptions,
): () => void {
  const { callback, win: targetWin, root, ...trackOpts } = options;
  const opts: ClickTrackOptions = { ...defaultOptions, ...trackOpts };
  const w = targetWin || window;
  const r = root || w.document.body;
  return attachClickListeners(w, r, opts, callback);
}
