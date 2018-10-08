import { snapshot } from 'rrweb-snapshot';
import initObservers from './observer';
import { mirror } from '../utils';
import {
  EventType,
  event,
  eventWithTime,
  recordOptions,
  IncrementalSource,
} from '../types';

function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target = document,
) {
  target.addEventListener(type, fn, { capture: true, passive: true });
}

function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

function record(options: recordOptions) {
  try {
    const { emit } = options;
    // runtime checks for user options
    if (!emit) {
      throw new Error('emit function is required');
    }
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
    on('load', () => {
      emit(wrapEvent({ type: EventType.Load, data: {} }));
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
      });
    });
  } catch (error) {
    // TODO: handle internal error
  }
}

export default record;
