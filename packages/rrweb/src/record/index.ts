import {
  snapshot,
  MaskInputOptions,
  SlimDOMOptions,
  createMirror,
  DataURLOptions,
} from '@sentry-internal/rrweb-snapshot';
import { initObservers, mutationBuffers } from './observer';
import {
  on,
  getWindowWidth,
  getWindowHeight,
  getWindowScroll,
  polyfill,
  hasShadowRoot,
  isSerializedIframe,
  isSerializedStylesheet,
  nowTimestamp,
} from '../utils';
import type { recordOptions } from '../types';
import {
  EventType,
  event,
  eventWithTime,
  IncrementalSource,
  listenerHandler,
  mutationCallbackParam,
  scrollCallback,
  canvasMutationParam,
  adoptedStyleSheetParam,
} from '@sentry-internal/rrweb-types';
import type { CrossOriginIframeMessageEventContent } from '../types';
import {
  IframeManager,
  IframeManagerInterface,
  IframeManagerNoop,
} from './iframe-manager';
import {
  ShadowDomManager,
  ShadowDomManagerInterface,
  ShadowDomManagerNoop,
} from './shadow-dom-manager';
import {
  CanvasManager,
  CanvasManagerConstructorOptions,
  CanvasManagerInterface,
  CanvasManagerNoop,
} from './observers/canvas/canvas-manager';
import { StylesheetManager } from './stylesheet-manager';
import ProcessedNodeManager from './processed-node-manager';
import {
  callbackWrapper,
  registerErrorHandler,
  unregisterErrorHandler,
} from './error-handler';

function wrapEvent(e: event): eventWithTime {
  const eWithTime = e as eventWithTime;
  eWithTime.timestamp = nowTimestamp();
  return eWithTime;
}

declare global {
  const __RRWEB_EXCLUDE_SHADOW_DOM__: boolean;
  const __RRWEB_EXCLUDE_IFRAME__: boolean;
}

// These are stored in module scope because we access them in other exported methods
let _wrappedEmit:
  | undefined
  | ((e: eventWithTime, isCheckout?: boolean) => void);
let _takeFullSnapshot: undefined | ((isCheckout?: boolean) => void);

export const mirror = createMirror();

function record<T = eventWithTime>(
  options: recordOptions<T> = {},
): listenerHandler | undefined {
  const {
    emit,
    checkoutEveryNms,
    checkoutEveryNth,
    blockClass = 'rr-block',
    blockSelector = null,
    unblockSelector = null,
    ignoreClass = 'rr-ignore',
    ignoreSelector = null,
    maskAllText = false,
    maskTextClass = 'rr-mask',
    unmaskTextClass = null,
    maskTextSelector = null,
    unmaskTextSelector = null,
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    maskAttributeFn,
    maskInputFn,
    maskTextFn,
    packFn,
    sampling = {},
    dataURLOptions = {},
    mousemoveWait,
    recordCanvas = false,
    recordCrossOriginIframes = false,
    recordAfter = options.recordAfter === 'DOMContentLoaded'
      ? options.recordAfter
      : 'load',
    userTriggeredOnInput = false,
    collectFonts = false,
    inlineImages = false,
    plugins,
    keepIframeSrcFn = () => false,
    ignoreCSSAttributes = new Set([]),
    errorHandler,
    onMutation,
    getCanvasManager,
  } = options;

  registerErrorHandler(errorHandler);

  const inEmittingFrame = recordCrossOriginIframes
    ? window.parent === window
    : true;

  let passEmitsToParent = false;
  if (!inEmittingFrame) {
    try {
      // throws if parent is cross-origin
      if (window.parent.document) {
        passEmitsToParent = false; // if parent is same origin we collect iframe events from the parent
      }
    } catch (e) {
      passEmitsToParent = true;
    }
  }

  // runtime checks for user options
  if (inEmittingFrame && !emit) {
    throw new Error('emit function is required');
  }
  // move departed options to new options
  if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
    sampling.mousemove = mousemoveWait;
  }

  // reset mirror in case `record` this was called earlier
  mirror.reset();

  const maskInputOptions: MaskInputOptions =
    maskAllInputs === true
      ? {
          color: true,
          date: true,
          'datetime-local': true,
          email: true,
          month: true,
          number: true,
          range: true,
          search: true,
          tel: true,
          text: true,
          time: true,
          url: true,
          week: true,
          textarea: true,
          select: true,
          radio: true,
          checkbox: true,
        }
      : _maskInputOptions !== undefined
      ? _maskInputOptions
      : {};

  const slimDOMOptions: SlimDOMOptions =
    _slimDOMOptions === true || _slimDOMOptions === 'all'
      ? {
          script: true,
          comment: true,
          headFavicon: true,
          headWhitespace: true,
          headMetaSocial: true,
          headMetaRobots: true,
          headMetaHttpEquiv: true,
          headMetaVerification: true,
          // the following are off for slimDOMOptions === true,
          // as they destroy some (hidden) info:
          headMetaAuthorship: _slimDOMOptions === 'all',
          headMetaDescKeywords: _slimDOMOptions === 'all',
        }
      : _slimDOMOptions
      ? _slimDOMOptions
      : {};

  polyfill();

  let lastFullSnapshotEvent: eventWithTime;
  let incrementalSnapshotCount = 0;

  const eventProcessor = (e: eventWithTime): T => {
    for (const plugin of plugins || []) {
      if (plugin.eventProcessor) {
        e = plugin.eventProcessor(e);
      }
    }
    if (
      packFn &&
      // Disable packing events which will be emitted to parent frames.
      !passEmitsToParent
    ) {
      e = packFn(e) as unknown as eventWithTime;
    }
    return e as unknown as T;
  };
  const wrappedEmit = (e: eventWithTime, isCheckout?: boolean) => {
    if (
      mutationBuffers[0]?.isFrozen() &&
      e.type !== EventType.FullSnapshot &&
      !(
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Mutation
      )
    ) {
      // we've got a user initiated event so first we need to apply
      // all DOM changes that have been buffering during paused state
      mutationBuffers.forEach((buf) => buf.unfreeze());
    }

    if (inEmittingFrame) {
      emit?.(eventProcessor(e), isCheckout);
    } else if (passEmitsToParent) {
      const message: CrossOriginIframeMessageEventContent<T> = {
        type: 'rrweb',
        event: eventProcessor(e),
        origin: window.location.origin,
        isCheckout,
      };
      window.parent.postMessage(message, '*');
    }

    if (e.type === EventType.FullSnapshot) {
      lastFullSnapshotEvent = e;
      incrementalSnapshotCount = 0;
    } else if (e.type === EventType.IncrementalSnapshot) {
      // attach iframe should be considered as full snapshot
      if (
        e.data.source === IncrementalSource.Mutation &&
        e.data.isAttachIframe
      ) {
        return;
      }

      incrementalSnapshotCount++;
      const exceedCount =
        checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
      const exceedTime =
        checkoutEveryNms &&
        e.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
      if (exceedCount || exceedTime) {
        takeFullSnapshot(true);
      }
    }
  };
  _wrappedEmit = wrappedEmit;

  const wrappedMutationEmit = (m: mutationCallbackParam) => {
    wrappedEmit(
      wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Mutation,
          ...m,
        },
      }),
    );
  };
  const wrappedScrollEmit: scrollCallback = (p) =>
    wrappedEmit(
      wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.Scroll,
          ...p,
        },
      }),
    );
  const wrappedCanvasMutationEmit = (p: canvasMutationParam) =>
    wrappedEmit(
      wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.CanvasMutation,
          ...p,
        },
      }),
    );

  const wrappedAdoptedStyleSheetEmit = (a: adoptedStyleSheetParam) =>
    wrappedEmit(
      wrapEvent({
        type: EventType.IncrementalSnapshot,
        data: {
          source: IncrementalSource.AdoptedStyleSheet,
          ...a,
        },
      }),
    );

  const stylesheetManager = new StylesheetManager({
    mutationCb: wrappedMutationEmit,
    adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit,
  });

  const iframeManager: IframeManagerInterface =
    typeof __RRWEB_EXCLUDE_IFRAME__ === 'boolean' && __RRWEB_EXCLUDE_IFRAME__
      ? new IframeManagerNoop()
      : new IframeManager({
          mirror,
          mutationCb: wrappedMutationEmit,
          stylesheetManager: stylesheetManager,
          recordCrossOriginIframes,
          wrappedEmit,
        });

  /**
   * Exposes mirror to the plugins
   */
  for (const plugin of plugins || []) {
    if (plugin.getMirror)
      plugin.getMirror({
        nodeMirror: mirror,
        crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
        crossOriginIframeStyleMirror:
          iframeManager.crossOriginIframeStyleMirror,
      });
  }

  const processedNodeManager = new ProcessedNodeManager();

  const canvasManager: CanvasManagerInterface = getCanvasManager
    ? getCanvasManager({
        recordCanvas,
        blockClass,
        blockSelector,
        unblockSelector,
        sampling: sampling['canvas'],
        dataURLOptions,
      })
    : new CanvasManagerNoop();

  const shadowDomManager: ShadowDomManagerInterface =
    typeof __RRWEB_EXCLUDE_SHADOW_DOM__ === 'boolean' &&
    __RRWEB_EXCLUDE_SHADOW_DOM__
      ? new ShadowDomManagerNoop()
      : new ShadowDomManager({
          mutationCb: wrappedMutationEmit,
          scrollCb: wrappedScrollEmit,
          bypassOptions: {
            onMutation,
            blockClass,
            blockSelector,
            unblockSelector,
            maskAllText,
            maskTextClass,
            unmaskTextClass,
            maskTextSelector,
            unmaskTextSelector,
            inlineStylesheet,
            maskInputOptions,
            dataURLOptions,
            maskAttributeFn,
            maskTextFn,
            maskInputFn,
            recordCanvas,
            inlineImages,
            sampling,
            slimDOMOptions,
            iframeManager,
            stylesheetManager,
            canvasManager,
            keepIframeSrcFn,
            processedNodeManager,
          },
          mirror,
        });

  const takeFullSnapshot = (isCheckout = false) => {
    wrappedEmit(
      wrapEvent({
        type: EventType.Meta,
        data: {
          href: window.location.href,
          width: getWindowWidth(),
          height: getWindowHeight(),
        },
      }),
      isCheckout,
    );

    // When we take a full snapshot, old tracked StyleSheets need to be removed.
    stylesheetManager.reset();

    shadowDomManager.init();

    mutationBuffers.forEach((buf) => buf.lock()); // don't allow any mirror modifications during snapshotting
    const node = snapshot(document, {
      mirror,
      blockClass,
      blockSelector,
      unblockSelector,
      maskAllText,
      maskTextClass,
      unmaskTextClass,
      maskTextSelector,
      unmaskTextSelector,
      inlineStylesheet,
      maskAllInputs: maskInputOptions,
      maskAttributeFn,
      maskInputFn,
      maskTextFn,
      slimDOM: slimDOMOptions,
      dataURLOptions,
      recordCanvas,
      inlineImages,
      onSerialize: (n) => {
        if (isSerializedIframe(n, mirror)) {
          iframeManager.addIframe(n as HTMLIFrameElement);
        }
        if (isSerializedStylesheet(n, mirror)) {
          stylesheetManager.trackLinkElement(n as HTMLLinkElement);
        }
        if (hasShadowRoot(n)) {
          shadowDomManager.addShadowRoot(n.shadowRoot, document);
        }
      },
      onIframeLoad: (iframe, childSn) => {
        iframeManager.attachIframe(iframe, childSn);
        shadowDomManager.observeAttachShadow(iframe);
      },
      onStylesheetLoad: (linkEl, childSn) => {
        stylesheetManager.attachLinkElement(linkEl, childSn);
      },
      keepIframeSrcFn,
    });

    if (!node) {
      return console.warn('Failed to snapshot the document');
    }

    wrappedEmit(
      wrapEvent({
        type: EventType.FullSnapshot,
        data: {
          node,
          initialOffset: getWindowScroll(window),
        },
      }),
    );
    mutationBuffers.forEach((buf) => buf.unlock()); // generate & emit any mutations that happened during snapshotting, as can now apply against the newly built mirror

    // Some old browsers don't support adoptedStyleSheets.
    if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
      stylesheetManager.adoptStyleSheets(
        document.adoptedStyleSheets,
        mirror.getId(document),
      );
  };
  _takeFullSnapshot = takeFullSnapshot;

  try {
    const handlers: listenerHandler[] = [];

    const observe = (doc: Document) => {
      return callbackWrapper(initObservers)(
        {
          onMutation,
          mutationCb: wrappedMutationEmit,
          mousemoveCb: (positions, source) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source,
                  positions,
                },
              }),
            ),
          mouseInteractionCb: (d) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.MouseInteraction,
                  ...d,
                },
              }),
            ),
          scrollCb: wrappedScrollEmit,
          viewportResizeCb: (d) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.ViewportResize,
                  ...d,
                },
              }),
            ),
          inputCb: (v) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Input,
                  ...v,
                },
              }),
            ),
          mediaInteractionCb: (p) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.MediaInteraction,
                  ...p,
                },
              }),
            ),
          styleSheetRuleCb: (r) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.StyleSheetRule,
                  ...r,
                },
              }),
            ),
          styleDeclarationCb: (r) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.StyleDeclaration,
                  ...r,
                },
              }),
            ),
          canvasMutationCb: wrappedCanvasMutationEmit,
          fontCb: (p) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Font,
                  ...p,
                },
              }),
            ),
          selectionCb: (p) => {
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Selection,
                  ...p,
                },
              }),
            );
          },
          customElementCb: (c) => {
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.CustomElement,
                  ...c,
                },
              }),
            );
          },
          blockClass,
          ignoreClass,
          ignoreSelector,
          maskAllText,
          maskTextClass,
          unmaskTextClass,
          maskTextSelector,
          unmaskTextSelector,
          maskInputOptions,
          inlineStylesheet,
          sampling,
          recordCanvas,
          inlineImages,
          userTriggeredOnInput,
          collectFonts,
          doc,
          maskAttributeFn,
          maskInputFn,
          maskTextFn,
          keepIframeSrcFn,
          blockSelector,
          unblockSelector,
          slimDOMOptions,
          dataURLOptions,
          mirror,
          iframeManager,
          stylesheetManager,
          shadowDomManager,
          processedNodeManager,
          canvasManager,
          ignoreCSSAttributes,
          plugins:
            plugins
              ?.filter((p) => p.observer)
              ?.map((p) => ({
                observer: p.observer!,
                options: p.options,
                callback: (payload: object) =>
                  wrappedEmit(
                    wrapEvent({
                      type: EventType.Plugin,
                      data: {
                        plugin: p.name,
                        payload,
                      },
                    }),
                  ),
              })) || [],
        },
        {},
      );
    };

    iframeManager.addLoadListener((iframeEl) => {
      try {
        handlers.push(observe(iframeEl.contentDocument!));
      } catch (error) {
        // TODO: handle internal error
        console.warn(error);
      }
    });

    const init = () => {
      takeFullSnapshot();
      handlers.push(observe(document));
    };
    if (
      document.readyState === 'interactive' ||
      document.readyState === 'complete'
    ) {
      init();
    } else {
      handlers.push(
        on('DOMContentLoaded', () => {
          wrappedEmit(
            wrapEvent({
              type: EventType.DomContentLoaded,
              data: {},
            }),
          );
          if (recordAfter === 'DOMContentLoaded') init();
        }),
      );
      handlers.push(
        on(
          'load',
          () => {
            wrappedEmit(
              wrapEvent({
                type: EventType.Load,
                data: {},
              }),
            );
            if (recordAfter === 'load') init();
          },
          window,
        ),
      );
    }
    return () => {
      handlers.forEach((h) => h());
      processedNodeManager.destroy();
      _takeFullSnapshot = undefined;
      unregisterErrorHandler();
    };
  } catch (error) {
    // TODO: handle internal error
    console.warn(error);
  }
}

export function addCustomEvent<T>(tag: string, payload: T) {
  if (!_wrappedEmit) {
    throw new Error('please add custom event after start recording');
  }
  _wrappedEmit(
    wrapEvent({
      type: EventType.Custom,
      data: {
        tag,
        payload,
      },
    }),
  );
}

export function freezePage() {
  mutationBuffers.forEach((buf) => buf.freeze());
}

export function takeFullSnapshot(isCheckout?: boolean) {
  if (!_takeFullSnapshot) {
    throw new Error('please take full snapshot after start recording');
  }
  _takeFullSnapshot(isCheckout);
}

function wrappedEmit(e: eventWithTime) {
  if (!_wrappedEmit) {
    return;
  }

  _wrappedEmit(e);
}

// record.addCustomEvent is removed because Sentry Session Replay does not use it
// record.freezePage is removed because Sentry Session Replay does not use it

// For backwards compatibility - we can eventually remove this when we migrated to using the exported `mirror` & `takeFullSnapshot`
record.mirror = mirror;
record.takeFullSnapshot = takeFullSnapshot;

export default record;

const wrappedCanvasMutationEmit = (p: canvasMutationParam) =>
  wrappedEmit(
    wrapEvent({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.CanvasMutation,
        ...p,
      },
    }),
  );

export function getCanvasManager(
  options: Omit<
    CanvasManagerConstructorOptions,
    'mutationCb' | 'win' | 'mirror'
  >,
): CanvasManagerInterface {
  return new CanvasManager({
    ...options,
    mutationCb: wrappedCanvasMutationEmit,
    win: window,
    mirror,
  });
}
