import type { RecordPlugin } from '@rrweb/types';
import { semanticSelector } from 'semantic-selector';

export const PLUGIN_NAME = 'rrweb/click-track@1';

// --- Types ---

/**
 * How to descend from the element a node locates to its `inner` target. A CSS
 * selector can't cross a document boundary, so each crossing is a separate hop:
 * `'shadow'` descends into the element's own open shadow root; (future: other
 * document boundaries such as `'iframe'`). Absent when `inner` is simply a
 * descendant reachable within the same root (`element.querySelector`).
 */
export type InnerBoundary = 'shadow';

/**
 * A resolved element paired with where within it the click landed: a CSS
 * selector locating the element (within its own root), the click position
 * relative to that element's box, and — recursively — the next, more precise
 * target below it. Used for the top-level target and for every hop down toward
 * the real clicked node (a shadow host, or a plain descendant).
 */
export type PositionedTarget = {
  targetSelector: string;
  /** Click position as percentage of the element's width (0–100) */
  percentX: number;
  /** Click position as percentage of the element's height (0–100) */
  percentY: number;
  /** Element's aspect ratio: width / height (>1 landscape, <1 portrait) */
  aspect: number;
  /**
   * 0-based ordinal of this element among all `targetSelector` matched within
   * its root at record time. `semantic-selector`'s contract permits a selector
   * to match several same-identity elements, so the plugin records which one
   * was hit for reconstruction to disambiguate. Present only when > 1 matched.
   */
  selectorMatchIndex?: number;
  /** Total elements `targetSelector` matched within its root. Present only when > 1. */
  selectorMatchCount?: number;
  /**
   * The next, more precise target reached from this element — a shadow host's
   * inner content, or the descendant actually clicked when it differs from this
   * (significant) element. `innerBoundary` says how to descend to it;
   * reconstruction can stop at the deepest `inner` it is able to resolve.
   */
  inner?: PositionedTarget;
  /**
   * How to descend to `inner`: `'shadow'` = this element's open shadow root;
   * absent = a descendant within the same root. Only open shadow roots (the
   * ones that expose `.shadowRoot`) are reachable, and only when the `shadow`
   * option is on.
   */
  innerBoundary?: InnerBoundary;
};

export type ClickTrackPayload = PositionedTarget & {
  /** Viewport width in CSS pixels at click time */
  viewportWidth: number;
  /** Viewport height in CSS pixels at click time */
  viewportHeight: number;
  targetText?: string;
  pointerType?: 'mouse' | 'touch' | 'pen';
};

export type ClickTrackOptions = {
  /**
   * Control innerText extraction for click targets.
   * - true: extract from all elements
   * - false: never extract
   * - string: comma-separated CSS selectors; extract when the element matches
   *   any of them (e.g. 'button,a,input[type="submit"]')
   */
  targetText: boolean | string;
  /**
   * Descend into open shadow roots, recording the click target as a chain of
   * `inner` hops. Off by default: when disabled, a click inside a shadow tree is
   * recorded against the shadow host in the regular document instead.
   */
  shadow: boolean;
  /**
   * CSS selector for the "significant" element a click is attributed to: the
   * plugin walks up from the real target and stops at the first ancestor that
   * matches (the button / link / control level), recording any finer clicked
   * descendant as an `inner` hop. Falls back to the clicked element itself when
   * nothing matches.
   */
  significantSelector: string;
};

// --- Significant element detection ---

const DEFAULT_SIGNIFICANT_SELECTOR =
  'a[href],area[href],button,input[type="submit"],input[type="button"]';

const defaultOptions: ClickTrackOptions = {
  targetText: 'button,a,input[type="submit"],input[type="button"],[role="button"]',
  shadow: false,
  significantSelector: DEFAULT_SIGNIFICANT_SELECTOR,
};

function findSignificantElement(
  target: HTMLElement,
  significantSelector: string,
): HTMLElement {
  // Walk up to the first ancestor matching the significant selector — the
  // element the click is attributed to — or the target itself if none match.
  const significant = target.closest(significantSelector) as HTMLElement | null;
  return significant || target;
}

// --- Shadow DOM ---

/**
 * Recover the real innermost event target. A window-level capture listener sees
 * `event.target` retargeted to the shadow host for clicks inside an open shadow
 * root; `composedPath()[0]` is the actual clicked node (truncated at the host
 * for closed roots, degrading gracefully). Mirrors rrweb's own getEventTarget.
 */
function getEventTarget(e: Event): EventTarget | null {
  try {
    const path = e.composedPath?.();
    if (path && path.length) return path[0];
  } catch {
    // fall through to e.target
  }
  return e.target;
}

/** The ShadowRoot a node lives directly inside, or null if it is in a document. */
function shadowRootOf(node: Node): ShadowRoot | null {
  const rn = node.getRootNode();
  // nodeType 11 = DOCUMENT_FRAGMENT_NODE; a ShadowRoot is one with a `.host`.
  if (rn.nodeType === 11 && (rn as ShadowRoot).host) return rn as ShadowRoot;
  return null;
}

/** One resolvable step of the path to an element: the element, a selector that
 * locates it within `root`, and that root (the regular document, or a shadow
 * root when the step is inside one). Linked into the payload's `inner` chain. */
type SelectorHop = {
  el: Element;
  targetSelector: string;
  root: Element | ShadowRoot;
};

/**
 * Resolve `el` to a chain of hops, one per open shadow boundary crossed
 * (outermost → innermost). The first hop locates `el`'s outermost host within
 * `documentRoot`; each later hop locates the next host — or finally `el` itself
 * — within the shadow root exposed by the previous hop. A chain of length 1
 * means `el` is in the regular document, with no shadow boundary to cross.
 */
function shadowHops(el: Element, documentRoot: Element): SelectorHop[] {
  const hops: SelectorHop[] = [];
  let node: Element = el;
  let shadow = shadowRootOf(node);
  while (shadow) {
    hops.push({
      el: node,
      targetSelector: semanticSelector(node, shadow),
      root: shadow,
    });
    node = shadow.host;
    shadow = shadowRootOf(node);
  }
  hops.push({
    el: node,
    targetSelector: semanticSelector(node, documentRoot),
    root: documentRoot,
  });
  return hops.reverse();
}

// --- Core click tracking logic ---

function shouldExtractText(el: Element, config: boolean | string): boolean {
  if (config === true) return true;
  if (config === false) return false;
  return (config as string).split(',').some((sel) => {
    const s = sel.trim();
    if (!s) return false;
    try {
      return el.matches(s);
    } catch {
      return false;
    }
  });
}

function buildPayload(
  e: MouseEvent,
  root: Element,
  opts: ClickTrackOptions,
  lastPointerType: string | null,
): ClickTrackPayload | null {
  // With shadow recording off we stay shadow-unaware: for a click inside a
  // shadow tree `event.target` is retargeted to the host, so we naturally record
  // the host in the regular document. With it on we recover the real inner node
  // via composedPath() and cross the boundaries below.
  const target = opts.shadow ? getEventTarget(e) : e.target;
  if (!target || !(target instanceof HTMLElement)) return null;

  const significantTarget = findSignificantElement(
    target,
    opts.significantSelector,
  );
  const tag = significantTarget.tagName.toLowerCase();

  let hops: SelectorHop[];
  try {
    hops = shadowHops(significantTarget, root);
  } catch {
    return null;
  }
  if (!hops[0].targetSelector) return null;

  // A PositionedTarget for one element: its selector, the click position
  // relative to its box, and — when the selector matches several same-identity
  // elements within `searchRoot` — which one was hit. Residual ambiguity is
  // recorded per node because it can occur at any hop; it stays in the plugin
  // (not semanticSelector) because only the click tracker knows the real hit.
  const nodeFor = (
    el: Element,
    targetSelector: string,
    searchRoot: Element | ShadowRoot,
  ): PositionedTarget => {
    const b = el.getBoundingClientRect();
    const w = b.width || 1;
    const h = b.height || 1;
    const node: PositionedTarget = {
      targetSelector,
      percentX: Math.round(10 * ((e.clientX - b.x) / w) * 100) / 10,
      percentY: Math.round(10 * ((e.clientY - b.y) / h) * 100) / 10,
      aspect: Math.round(100 * (w / h)) / 100,
    };
    try {
      const matches = searchRoot.querySelectorAll(targetSelector);
      if (matches.length > 1) {
        for (let i = 0; i < matches.length; i++) {
          if (matches[i] === el) {
            node.selectorMatchIndex = i;
            node.selectorMatchCount = matches.length;
            break;
          }
        }
      }
    } catch {
      // querySelectorAll can throw on exotic selectors; just skip the index.
    }
    return node;
  };

  // Link the hops into a chain from the outermost element (the payload itself)
  // down to the significant element, each shadow boundary tagged on its parent.
  const head = nodeFor(hops[0].el, hops[0].targetSelector, hops[0].root);
  let tail = head;
  for (let i = 1; i < hops.length; i++) {
    tail.innerBoundary = 'shadow';
    tail.inner = nodeFor(hops[i].el, hops[i].targetSelector, hops[i].root);
    tail = tail.inner;
  }

  // When the click actually landed on a descendant of the significant element
  // (e.g. an icon inside a button), append it as a same-root `inner` hop so its
  // precise selector and position are recorded too.
  if (target !== significantTarget) {
    try {
      const innerSelector = semanticSelector(target, significantTarget);
      if (innerSelector) {
        tail.inner = nodeFor(target, innerSelector, significantTarget);
      }
    } catch {
      // invalid/exotic selector — omit the inner hop
    }
  }

  const payload: ClickTrackPayload = {
    ...head,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };

  if (lastPointerType) {
    payload.pointerType = lastPointerType as 'mouse' | 'touch' | 'pen';
  }

  if (opts.targetText !== false) {
    if (shouldExtractText(significantTarget, opts.targetText)) {
      let text: string | null = null;
      if (tag === 'input') {
        const inputType = (significantTarget as HTMLInputElement).type;
        if (inputType === 'submit' || inputType === 'button') {
          text = (significantTarget as HTMLInputElement).value;
        }
      } else {
        text =
          (significantTarget as HTMLElement).innerText || significantTarget.textContent;
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
