import type { RecordPlugin } from '@rrweb/types';

export const PLUGIN_NAME = 'rrweb/click-track@1';

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
  hrefAttr?: string;
  srcAttr?: string;
  targetText?: string;
  sigTargetTagName?: string;
  sigTargetInternal?: boolean;
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

// --- CSS Selector Generator ---

const regexSingleEscape = /[ -,\.\/:-@\[\]\^`\{-~]/;

function cssEsc(str: string, isIdent: boolean): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i);
    const cp = ch.charCodeAt(0);
    if (cp < 0x20 || cp > 0x7e) {
      out += '\\' + cp.toString(16).toUpperCase() + ' ';
    } else if (
      isIdent
        ? regexSingleEscape.test(ch)
        : ch === '"' || ch === "'" || ch === '\\'
    ) {
      out += '\\' + ch;
    } else {
      out += ch;
    }
  }
  if (isIdent && /^-[-\d]/.test(out)) {
    out = '\\-' + out.slice(1);
  } else if (isIdent && /^\d/.test(out)) {
    out = '\\3' + out.charAt(0) + ' ' + out.slice(1);
  }
  return out;
}

/** Reject framework-generated IDs (ember, yui, etc.) and numeric IDs */
function isStableId(id: string): boolean {
  if (/^ember\d+$/.test(id)) return false;
  if (/^yui/.test(id)) return false;
  if (/[0-9a-f]{8,}/i.test(id)) return false; // UUIDs / hex hashes
  if (/^\d+$/.test(id)) return false; // purely numeric
  return true;
}

/** Reject framework-generated class names */
function isStableClass(cn: string): boolean {
  if (cn.startsWith('styled__') || cn.startsWith('sc-') || cn.includes('__sc-'))
    return false;
  if (/^css-/.test(cn)) return false; // emotion
  if (/^_[a-zA-Z0-9]{5,}$/.test(cn)) return false; // CSS modules hash
  if (/active|hover|focus|selected|open|closed|visible|hidden|disabled/i.test(cn))
    return false; // state classes
  if (/\d{4,}/.test(cn)) return false; // contains long numeric sequences
  return true;
}

/**
 * Generate a single, stable CSS selector for an element.
 *
 * Strategy:
 * 1. Walk up the tree collecting segment info at each level
 * 2. At each level, prefer: id > stable classes > tag:nth-of-type
 * 3. Stop at an element with a stable ID (it's a reliable anchor)
 * 4. Validate with querySelectorAll — must match exactly 1 element
 * 5. If the "smart" path isn't unique, fall back to full nth-of-type chain
 */
export function uniqueSelector(el: Element, root: Element = document.body): string {
  if (el === root) return el.tagName.toLowerCase();
  if (!el.tagName) return ''; // e.g. document node

  // Try a direct ID selector first
  if (el.id && isStableId(el.id)) {
    const sel = '#' + cssEsc(el.id, true);
    try {
      if (root.querySelectorAll(sel).length === 1) return sel;
    } catch { /* invalid selector, continue */ }
  }

  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current !== root && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();

    // If this element has a stable ID, use it as anchor and stop
    if (current.id && isStableId(current.id)) {
      segments.push(tag + '#' + cssEsc(current.id, true));
      break;
    }

    // Try stable classes that narrow things down
    const parent = current.parentElement;
    const stableClasses = current.classList
      ? Array.from(current.classList).filter(isStableClass)
      : [];
    let usedClasses = false;

    if (stableClasses.length > 0 && parent) {
      // Try each class — pick one that makes this element unique
      // among direct children of the same tag
      for (const cn of stableClasses) {
        if (isUniqueClassAmongSiblings(current, parent, tag, cn)) {
          segments.push(tag + '.' + cssEsc(cn, true));
          usedClasses = true;
          break;
        }
      }
    }

    if (!usedClasses) {
      // Fall back to nth-of-type
      if (parent) {
        const siblingCount = countChildrenOfTag(parent, tag);
        if (siblingCount === 1 && tag !== 'div' && tag !== 'span') {
          // Only child of this tag type — use tag alone
          // (but not for div/span which are too common/fragile)
          segments.push(tag);
        } else {
          const idx = nthOfType(current, parent, tag);
          segments.push(tag + ':nth-of-type(' + idx + ')');
        }
      } else {
        segments.push(tag);
      }
    }

    current = current.parentElement;
  }

  // Build selector from segments (segments[0] is the target, last is highest ancestor)
  const selector = segments.reverse().join(' > ');

  // Validate uniqueness
  try {
    const matches = root.querySelectorAll(selector);
    if (matches.length === 1 && matches[0] === el) {
      return selector;
    }
  } catch {
    // invalid selector
  }

  // Fallback: full nth-of-type structural path
  return structuralSelector(el, root);
}

function nthOfType(el: Element, parent: Element, tag: string): number {
  let idx = 0;
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName.toLowerCase() === tag) {
      idx++;
      if (parent.children[i] === el) return idx;
    }
  }
  return idx;
}

function countChildrenOfTag(parent: Element, tag: string): number {
  let count = 0;
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName.toLowerCase() === tag) count++;
  }
  return count;
}

function isUniqueClassAmongSiblings(
  _el: Element,
  parent: Element,
  tag: string,
  className: string,
): boolean {
  let matches = 0;
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (
      child.tagName.toLowerCase() === tag &&
      child.classList.contains(className)
    ) {
      matches++;
      if (matches > 1) return false;
    }
  }
  return matches === 1;
}

/** Pure structural fallback — always produces a unique selector */
function structuralSelector(el: Element, root: Element): string {
  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current !== root && current !== document.documentElement) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;

    if (current.id && isStableId(current.id)) {
      segments.push(tag + '#' + cssEsc(current.id, true));
      break;
    }

    if (parent) {
      const idx = nthOfType(current, parent, tag);
      segments.push(tag + ':nth-of-type(' + idx + ')');
    } else {
      segments.push(tag);
    }

    current = current.parentElement;
  }

  return segments.reverse().join(' > ');
}

// --- Significant element detection ---

const CLICKABLE_SELECTOR =
  'a[href],area[href],button,input[type="submit"],input[type="button"]';

function findSignificantElement(target: HTMLElement): HTMLElement {
  // Walk up to find a meaningful clickable ancestor
  const clickable = target.closest(CLICKABLE_SELECTOR) as HTMLElement | null;
  return clickable || target;
}

// --- Core click tracking logic ---

function shouldExtractText(
  el: HTMLElement,
  config: boolean | string,
): boolean {
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
    targetSelector = uniqueSelector(target, root);
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

  if (tag === 'a' || tag === 'area') {
    const hrefAttr = significantEl.getAttribute('href');
    if (hrefAttr && !hrefAttr.startsWith('data:')) {
      payload.hrefAttr = hrefAttr.substring(0, 300);
    }
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
        text = significantEl.innerText || significantEl.textContent;
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
      return attachClickListeners(win, root, opts, cb as (payload: ClickTrackPayload) => void);
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
export function createClickTracker(options: StandaloneClickTrackOptions): () => void {
  const { callback, win: targetWin, root, ...trackOpts } = options;
  const opts: ClickTrackOptions = { ...defaultOptions, ...trackOpts };
  const w = targetWin || window;
  const r = root || w.document.body;
  return attachClickListeners(w, r, opts, callback);
}
