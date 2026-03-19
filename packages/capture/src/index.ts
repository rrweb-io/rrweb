import { Mirror, snapshot } from '@amplitude/rrweb-snapshot';
import { EventType, type fullSnapshotEvent } from '@amplitude/rrweb-types';
import { getNextIdFromMirror, injectAllAdoptedStyles } from './snapshot-utils';
import { freezeAnimations, getFullPageDimensions } from './dom-utils';

export type CaptureOptions = {
  /**
   * An element to temporarily exclude from the DOM before capturing
   * (e.g. an injected UI host). It will also be excluded from page
   * dimension measurements.
   */
  excludeEl?: HTMLElement | null;
};

export type CaptureResult = {
  /** The rrweb FullSnapshot event. */
  fullSnapshotEvent: (fullSnapshotEvent & { timestamp: number }) | null;
  pageUrl: string;
  pageTitle: string | null;
  capturedAt: string;
  scrollX: number;
  scrollY: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
  pageHeight: number;
  pageWidth: number;
  innerHeight: number;
  innerWidth: number;
};

/**
 * Performs a full-page DOM capture in a single call:
 *
 * 1. Freezes all running animations/transitions
 * 2. Takes an rrweb DOM snapshot (inlined images + stylesheets)
 * 3. Injects document-level and shadow DOM adopted stylesheets (single tree walk)
 * 4. Builds the rrweb FullSnapshot event
 * 5. Measures full page dimensions (single DOM pass for both height + width)
 * 6. Unfreezes animations
 *
 * Returns a `CaptureResult` with all the data needed to reconstruct
 * or replay the page.
 */
export function captureFullSnapshot(
  options: CaptureOptions = {},
): CaptureResult {
  const { excludeEl = null } = options;

  const unfreezeAnimations = freezeAnimations();

  try {
    const mirror = new Mirror();
    const snap = snapshot(document, {
      mirror,
      inlineImages: false,
      inlineStylesheet: true,
      slimDOM: false,
      recordCanvas: false,
    });

    if (snap) {
      const nextId = { value: getNextIdFromMirror(mirror) };
      injectAllAdoptedStyles(snap, mirror, nextId);
    }

    const fullSnapshotEvent = snap
      ? {
          type: EventType.FullSnapshot as const,
          timestamp: Date.now(),
          data: {
            node: snap,
            initialOffset: {
              left: typeof window.scrollX === 'number' ? window.scrollX : 0,
              top: typeof window.scrollY === 'number' ? window.scrollY : 0,
            },
          },
        }
      : null;

    const { pageHeight, pageWidth } = getFullPageDimensions(excludeEl);

    return {
      fullSnapshotEvent,
      pageUrl: window.location.href,
      pageTitle: document.title || null,
      capturedAt: new Date().toISOString(),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      pageHeight,
      pageWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
    };
  } finally {
    unfreezeAnimations();
  }
}

// Re-export lower-level utilities for consumers who need them individually
export {
  findMaxId,
  getNextIdFromMirror,
  hasChildNodes,
  serializeAdoptedStyleSheets,
  injectAdoptedStyles,
  injectDocumentAdoptedStyles,
  injectAllAdoptedStyles,
} from './snapshot-utils';
export {
  freezeAnimations,
  getFullPageDimension,
  getFullPageDimensions,
} from './dom-utils';
export type { PageDimensions } from './dom-utils';
