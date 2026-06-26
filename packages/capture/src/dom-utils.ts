const OVERFLOW_SCROLLABLE = new Set(['auto', 'scroll', 'overlay', 'hidden']);
const MAX_ELEMENTS_TO_CHECK = 2000;

export type PageDimensions = {
  pageHeight: number;
  pageWidth: number;
};

/**
 * Returns full page height and width in a single DOM pass.
 *
 * Combines standard document/body measurements with a scan for nested scroll
 * containers. Handles the common SPA pattern where html/body are
 * `height:100%; overflow:hidden` and a deeper descendant is the real scroll
 * container.
 *
 * This is more efficient than calling `getFullPageDimension` twice because
 * it only queries `querySelectorAll('*')` and `getComputedStyle` once per
 * element.
 *
 * @param targetDocument - The document to measure. Defaults to the global
 *                    `document`. Pass an iframe's `contentDocument` to measure
 *                    a page rendered inside a device frame.
 * @param excludeEl - An optional element to skip during the scan (e.g. an
 *                    injected host element that should not influence measurements).
 */
export function getFullPageDimensions(
  targetDocument: Document = document,
  excludeEl?: HTMLElement | null,
): PageDimensions {
  const doc = targetDocument.documentElement;
  const body = targetDocument.body;
  const view = targetDocument.defaultView ?? window;

  let maxHeight = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    doc.scrollHeight,
    doc.offsetHeight,
    doc.clientHeight,
  );
  let maxWidth = Math.max(
    body.scrollWidth,
    body.offsetWidth,
    doc.scrollWidth,
    doc.offsetWidth,
    doc.clientWidth,
  );

  const els = body.querySelectorAll('*');
  const limit = Math.min(els.length, MAX_ELEMENTS_TO_CHECK);
  const HTMLElementCtor = view.HTMLElement ?? HTMLElement;
  for (let i = 0; i < limit; i++) {
    const el = els[i];
    if (el === excludeEl || !(el instanceof HTMLElementCtor)) continue;

    const sh = el.scrollHeight;
    const sw = el.scrollWidth;
    const ch = el.clientHeight;
    const cw = el.clientWidth;

    // Skip elements that aren't overflowing in either dimension
    if (sh <= ch && sw <= cw) continue;

    const style = view.getComputedStyle(el);

    if (sh > ch && OVERFLOW_SCROLLABLE.has(style.overflowY)) {
      if (sh > maxHeight) maxHeight = sh;
    }
    if (sw > cw && OVERFLOW_SCROLLABLE.has(style.overflowX)) {
      if (sw > maxWidth) maxWidth = sw;
    }
  }

  return { pageHeight: maxHeight, pageWidth: maxWidth };
}

/**
 * Returns the full page dimension (height or width).
 *
 * Prefer `getFullPageDimensions` when you need both dimensions — it avoids
 * a duplicate DOM query and halves the `getComputedStyle` calls.
 */
export function getFullPageDimension(
  axis: 'height' | 'width',
  targetDocument: Document = document,
  excludeEl?: HTMLElement | null,
): number {
  const dims = getFullPageDimensions(targetDocument, excludeEl);
  return axis === 'height' ? dims.pageHeight : dims.pageWidth;
}

const FREEZE_ANIMATIONS_CSS = `*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}`;

/**
 * Finishes all running animations/transitions so the DOM reflects end-state,
 * then injects a stylesheet that prevents them from replaying when the
 * snapshot is rendered.
 *
 * @param targetDocument - The document whose animations to freeze. Defaults to
 *                    the global `document`. Pass an iframe's `contentDocument`
 *                    to freeze a page rendered inside a device frame.
 * @returns A cleanup function that removes the injected stylesheet.
 */
export function freezeAnimations(
  targetDocument: Document = document,
): () => void {
  // `getAnimations` is not implemented in every environment (e.g. jsdom).
  const getAnimations = targetDocument.getAnimations?.bind(targetDocument);
  for (const anim of getAnimations?.() ?? []) {
    try {
      anim.finish();
    } catch {
      // finish() throws on infinite animations; cancel them instead
      // so they don't leave elements in a mid-animation state.
      anim.cancel();
    }
  }

  const style = targetDocument.createElement('style');
  style.setAttribute('data-amp-freeze', '');
  style.textContent = FREEZE_ANIMATIONS_CSS;
  targetDocument.head.appendChild(style);

  return () => style.remove();
}
