import { snapshot } from 'rrweb-snapshot';
import initObservers from './observer';
import { mirror, on, getWindowWidth, getWindowHeight } from '../utils';
import {
  EventType,
  event,
  eventWithTime,
  recordOptions,
  IncrementalSource,
} from '../types';

function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

function record(options: recordOptions = {}) {
  const { emit } = options;
  // runtime checks for user options
  if (!emit) {
    throw new Error('emit function is required');
  }
  try {
    on('DOMContentLoaded', () => {
      emit(
        wrapEvent({
          type: EventType.DomContentLoaded,
          data: {
            href: window.location.href,
          },
        }),
      );
    });
    on(
      'load',
      () => {
        emit(
          wrapEvent({
            type: EventType.Load,
            data: { width: getWindowWidth(), height: getWindowHeight() },
          }),
        );
        const [node, idNodeMap] = snapshot(document);
        if (!node) {
          return console.warn('Failed to snapshot the document');
        }
        mirror.map = idNodeMap;
        emit(wrapEvent({ type: EventType.FullSnapshot, data: { node } }));
        initObservers({
          mutationCb: m =>
            emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Mutation,
                  ...m,
                },
              }),
            ),
          mousemoveCb: positions =>
            emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.MouseMove,
                  positions,
                },
              }),
            ),
          mouseInteractionCb: d =>
            emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.MouseInteraction,
                  ...d,
                },
              }),
            ),
          scrollCb: p =>
            emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Scroll,
                  ...p,
                },
              }),
            ),
          viewportResizeCb: d =>
            emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.ViewportResize,
                  ...d,
                },
              }),
            ),
          inputCb: v =>
            emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Input,
                  ...v,
                },
              }),
            ),
        });
      },
      window,
    );
  } catch (error) {
    // TODO: handle internal error
    console.warn(error);
  }
}

export default record;
