import {
  snapshot,
  MaskInputOptions,
  SlimDOMOptions,
  NodeType,
} from 'rrweb-snapshot';
import { initObservers, mutationBuffer } from './observer';
import {
  mirror,
  on,
  getWindowWidth,
  getWindowHeight,
  polyfill,
  getIframeDimensions,
  initDimension,
} from '../utils';
import {
  EventType,
  event,
  eventWithTime,
  recordOptions,
  IncrementalSource,
  listenerHandler,
  LogRecordOptions,
  DocumentDimension,
} from '../types';

function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

let wrappedEmit!: (e: eventWithTime, isCheckout?: boolean) => void;

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
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    maskInputFn,
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
      mutationBuffer.isFrozen() &&
      e.type !== EventType.FullSnapshot &&
      !(
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Mutation
      )
    ) {
      // we've got a user initiated event so first we need to apply
      // all DOM changes that have been buffering during paused state
      mutationBuffer.unfreeze();
    }

    emit(((packFn ? packFn(e) : e) as unknown) as T, isCheckout);
    if (e.type === EventType.FullSnapshot) {
      lastFullSnapshotEvent = e;
      incrementalSnapshotCount = 0;
    } else if (e.type === EventType.IncrementalSnapshot) {
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

  const iframes: HTMLIFrameElement[] = [];

  function takeFullSnapshot(isCheckout = false) {
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

    let wasFrozen = mutationBuffer.isFrozen();
    mutationBuffer.lock(); // don't allow any mirror modifications during snapshotting
    const [node, idNodeMap] = snapshot(document, {
      blockClass,
      blockSelector,
      inlineStylesheet,
      maskAllInputs: maskInputOptions,
      slimDOM: slimDOMOptions,
      recordCanvas,
      onSerialize: (n) => {
        if (n.__sn.type === NodeType.Element && n.__sn.tagName === 'iframe') {
          iframes.push((n as unknown) as HTMLIFrameElement);
        }
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
    mutationBuffer.unlock(); // generate & emit any mutations that happened during snapshotting, as can now apply against the newly built mirror
  }

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
    const observe = (doc: Document, dimension: DocumentDimension) => {
      return initObservers(
        {
          mutationCb: (m) =>
            wrappedEmit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Mutation,
                  ...m,
                },
              }),
            ),
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
          maskInputOptions,
          inlineStylesheet,
          sampling,
          recordCanvas,
          collectFonts,
          doc,
          dimension,
          maskInputFn,
          logOptions,
          blockSelector,
          slimDOMOptions,
        },
        hooks,
      );
    };
    const init = () => {
      takeFullSnapshot();
      const iframeMap = getIframeDimensions();
      handlers.push(
        observe(document, initDimension),
        ...iframes.map((iframe) => {
          const dimension = iframeMap.get(iframe);
          console.assert(dimension, 'iframe not found in the dimension map');
          return observe(iframe.contentDocument!, dimension || initDimension);
        }),
      );
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
  mutationBuffer.freeze();
};

export default record;
