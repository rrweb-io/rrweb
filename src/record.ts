import { snapshot } from 'rrweb-snapshot';
import { EventType, event } from './types';

function on(
  type: string,
  fn: EventListenerOrEventListenerObject,
  target = document,
) {
  target.addEventListener(type, fn);
}

function createEvent(type: EventType, data: any): event {
  return {
    type,
    data,
    timestamp: Date.now(),
  };
}

function emit(e: event) {}

function record() {
  on('DOMContentLoaded', () => {
    emit(
      createEvent(EventType.DomContentLoaded, { href: window.location.href }),
    );
  });
  on('load', () => {
    emit(createEvent(EventType.Load, null));
    const node = snapshot(document);
    emit(createEvent(EventType.FullSnapshot, { node }));
  });
}

export default record;
