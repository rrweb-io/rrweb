import { snapshot } from 'rrweb-snapshot';
import initObservers from './observer';
import {
  mirror,
  on,
  getWindowWidth,
  getWindowHeight,
  polyfill,
} from '../utils';
import {
  EventType,
  event,
  eventWithTime,
  recordOptions,
  IncrementalSource,
  listenerHandler,
} from '../types';

function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

let wrappedEmit!: (e: eventWithTime, isCheckout?: boolean) => void;

function record(options: recordOptions = {}): listenerHandler | undefined {
  const {
    emit,
    checkoutEveryNms,
    checkoutEveryNth,
    blockClass = 'rr-block',
    ignoreClass = 'rr-ignore',
    inlineStylesheet = true,
    maskAllInputs = false,
    hooks,
    mousemoveWait = 50,
  } = options;
  // runtime checks for user options
  if (!emit) {
    throw new Error('emit function is required');
  }

  polyfill();

  let lastFullSnapshotEvent: eventWithTime;
  let incrementalSnapshotCount = 0;
  wrappedEmit = (e: eventWithTime, isCheckout?: boolean) => {
    emit(e, isCheckout);
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
    const [node, idNodeMap] = snapshot(
      document,
      blockClass,
      inlineStylesheet,
      maskAllInputs,
    );
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
            left: document.documentElement!.scrollLeft,
            top: document.documentElement!.scrollTop,
          },
        },
      }),
    );
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
    const init = () => {
      takeFullSnapshot();

      handlers.push(
        initObservers(
          {
            mutationCb: m =>
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
            mouseInteractionCb: d =>
              wrappedEmit(
                wrapEvent({
                  type: EventType.IncrementalSnapshot,
                  data: {
                    source: IncrementalSource.MouseInteraction,
                    ...d,
                  },
                }),
              ),
            scrollCb: p =>
              wrappedEmit(
                wrapEvent({
                  type: EventType.IncrementalSnapshot,
                  data: {
                    source: IncrementalSource.Scroll,
                    ...p,
                  },
                }),
              ),
            viewportResizeCb: d =>
              wrappedEmit(
                wrapEvent({
                  type: EventType.IncrementalSnapshot,
                  data: {
                    source: IncrementalSource.ViewportResize,
                    ...d,
                  },
                }),
              ),
            inputCb: v =>
              wrappedEmit(
                wrapEvent({
                  type: EventType.IncrementalSnapshot,
                  data: {
                    source: IncrementalSource.Input,
                    ...v,
                  },
                }),
              ),
            mediaInteractionCb: p =>
              wrappedEmit(
                wrapEvent({
                  type: EventType.IncrementalSnapshot,
                  data: {
                    source: IncrementalSource.MediaInteraction,
                    ...p,
                  },
                }),
              ),
            blockClass,
            ignoreClass,
            maskAllInputs,
            inlineStylesheet,
            mousemoveWait,
          },
          hooks,
        ),
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
      handlers.forEach(h => h());
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

export default record;
