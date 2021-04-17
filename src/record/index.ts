import { snapshot, MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { initObservers, mutationBuffers } from './observer';
import {
  mirror,
  on,
  getWindowWidth,
  getWindowHeight,
  polyfill,
  isIframeINode,
  hasShadowRoot,
} from '../utils';
import {
  EventType,
  event,
  eventWithTime,
  recordOptions,
  IncrementalSource,
  listenerHandler,
  LogRecordOptions,
  mutationCallbackParam,
} from '../types';
import { IframeManager } from './iframe-manager';
import { ShadowDomManager } from './shadow-dom-manager';

function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

let wrappedEmit!: (e: eventWithTime, isCheckout?: boolean) => void;

let takeFullSnapshot!: (isCheckout?: boolean) => void;

function record<T = eventWithTime>(
  options: recordOptions<T> = {},
): listenerHandler | undefined {
  const {
    emit,
    checkoutEveryNms,
    checkoutEveryNth,
    blockClass = 'rr-block',
    blockSelector = null,
    ignoreClass = 'rr-ignore',
    maskClass = 'rr-mask',
    maskSelector = null,
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    maskInputFn,
    maskTextFn,
    hooks,
    packFn,
    sampling = {},
    mousemoveWait,
    recordCanvas = false,
    collectFonts = false,
    recordLog = false,
  } = options;
  // runtime checks for user options
  if (!emit) {
    throw new Error('emit function is required');
  }
  // move departed options to new options
  if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
    sampling.mousemove = mousemoveWait;
  }

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
  const defaultLogOptions: LogRecordOptions = {
    level: [
      'assert',
      'clear',
      'count',
      'countReset',
      'debug',
      'dir',
      'dirxml',
      'error',
      'group',
      'groupCollapsed',
      'groupEnd',
      'info',
      'log',
      'table',
      'time',
      'timeEnd',
      'timeLog',
      'trace',
      'warn',
    ],
    lengthThreshold: 1000,
    logger: console,
  };

  const logOptions: LogRecordOptions = recordLog
    ? recordLog === true
      ? defaultLogOptions
      : Object.assign({}, defaultLogOptions, recordLog)
    : {};

  polyfill();

  let lastFullSnapshotEvent: eventWithTime;
  let incrementalSnapshotCount = 0;
  wrappedEmit = (e: eventWithTime, isCheckout?: boolean) => {
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

    emit(((packFn ? packFn(e) : e) as unknown) as T, isCheckout);
    if (e.type === EventType.FullSnapshot) {
      lastFullSnapshotEvent = e;
      incrementalSnapshotCount = 0;
    } else if (e.type === EventType.IncrementalSnapshot) {
      // attch iframe should be considered as full snapshot
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

  const iframeManager = new IframeManager({
    mutationCb: wrappedMutationEmit,
  });

  const shadowDomManager = new ShadowDomManager({
    mutationCb: wrappedMutationEmit,
    bypassOptions: {
      blockClass,
      blockSelector,
      maskClass,
      maskSelector,
      inlineStylesheet,
      maskInputOptions,
      maskTextFn,
      recordCanvas,
      slimDOMOptions,
      iframeManager,
    },
  });

  takeFullSnapshot = (isCheckout = false) => {
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

    mutationBuffers.forEach((buf) => buf.lock()); // don't allow any mirror modifications during snapshotting
    const [node, idNodeMap] = snapshot(document, {
      blockClass,
      blockSelector,
      maskClass,
      maskSelector,
      inlineStylesheet,
      maskAllInputs: maskInputOptions,
      maskTextFn,
      slimDOM: slimDOMOptions,
      recordCanvas,
      onSerialize: (n) => {
        if (isIframeINode(n)) {
          iframeManager.addIframe(n);
        }
        if (hasShadowRoot(n)) {
          shadowDomManager.addShadowRoot(n.shadowRoot, document);
        }
      },
      onIframeLoad: (iframe, childSn) => {
        iframeManager.attachIframe(iframe, childSn);
      },
    });

    if (!node) {
      return console.warn('Failed to snapshot the document');
    }

    mirror.map = idNodeMap;
    wrappedEmit(
      wrapEvent({
        type: EventType.FullSnapshot,
        data: {
          node,
          initialOffset: {
            left:
              window.pageXOffset !== undefined
                ? window.pageXOffset
                : document?.documentElement.scrollLeft ||
                  document?.body?.parentElement?.scrollLeft ||
                  document?.body.scrollLeft ||
                  0,
            top:
              window.pageYOffset !== undefined
                ? window.pageYOffset
                : document?.documentElement.scrollTop ||
                  document?.body?.parentElement?.scrollTop ||
                  document?.body.scrollTop ||
                  0,
          },
        },
      }),
    );
    mutationBuffers.forEach((buf) => buf.unlock()); // generate & emit any mutations that happened during snapshotting, as can now apply against the newly built mirror
  };

  try {
    const handlers: listenerHandler[] = [];
    handlers.push(
      on('DOMContentLoaded', () => {
        wrappedEmit(
          wrapEvent({
            type: EventType.DomContentLoaded,
            data: {},
          }),
        );
      }),
    );

    const observe = (doc: Document) => {
      return initObservers(
        {
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
          scrollCb: (p) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Scroll,
                  ...p,
                },
              }),
            ),
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
          canvasMutationCb: (p) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.CanvasMutation,
                  ...p,
                },
              }),
            ),
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
          logCb: (p) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Log,
                  ...p,
                },
              }),
            ),
          blockClass,
          ignoreClass,
          maskClass,
          maskSelector,
          maskInputOptions,
          inlineStylesheet,
          sampling,
          recordCanvas,
          collectFonts,
          doc,
          maskInputFn,
          maskTextFn,
          logOptions,
          blockSelector,
          slimDOMOptions,
          iframeManager,
          shadowDomManager,
        },
        hooks,
      );
    };

    iframeManager.addLoadListener((iframeEl) => {
      handlers.push(observe(iframeEl.contentDocument!));
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
        on(
          'load',
          () => {
            wrappedEmit(
              wrapEvent({
                type: EventType.Load,
                data: {},
              }),
            );
            init();
          },
          window,
        ),
      );
    }
    return () => {
      handlers.forEach((h) => h());
    };
  } catch (error) {
    // TODO: handle internal error
    console.warn(error);
  }
}

record.addCustomEvent = <T>(tag: string, payload: T) => {
  if (!wrappedEmit) {
    throw new Error('please add custom event after start recording');
  }
  wrappedEmit(
    wrapEvent({
      type: EventType.Custom,
      data: {
        tag,
        payload,
      },
    }),
  );
};

record.freezePage = () => {
  mutationBuffers.forEach((buf) => buf.freeze());
};

record.takeFullSnapshot = (isCheckout?: boolean) => {
  if (!takeFullSnapshot) {
    throw new Error('please take full snapshot after start recording');
  }
  takeFullSnapshot(isCheckout);
};

export default record;
