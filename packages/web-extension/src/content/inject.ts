import { record } from 'rrweb';
import type { recordOptions } from 'rrweb/typings/types';
import type { eventWithTime } from '@rrweb/types';
import { MessageName, RecordStartedMessage } from '../types';

const events: eventWithTime[] = [];
let stopFn: (() => void) | null = null;

// When mouse leaves the page, cache the stored events in case the tab is closed or changed. This is a backup mechanism in case the events are not cached before page unloaded.
const mouseLeaveHandler = () => {
  window.postMessage({
    message: MessageName.CacheEvents,
    events,
  });
};

function startRecord(config: recordOptions<eventWithTime>) {
  events.length = 0;
  stopFn =
    record({
      emit: (event) => {
        events.push(event);
      },
      ...config,
    }) || null;
  window.postMessage({
    message: MessageName.RecordStarted,
    startTimestamp: Date.now(),
  } as RecordStartedMessage);
  document.documentElement.addEventListener('mouseleave', mouseLeaveHandler);
}

const messageHandler = (event: {
  data: {
    message: MessageName;
    config?: recordOptions<eventWithTime>;
  };
}) => {
  const data = event.data;
  const eventHandler = {
    [MessageName.StartRecord]: () => {
      startRecord(data.config || {});
    },
    [MessageName.StopRecord]: () => {
      if (stopFn) stopFn();
      window.postMessage({
        message: MessageName.RecordStopped,
        events,
        endTimestamp: Date.now(),
      });
      window.removeEventListener('message', messageHandler);
      document.documentElement.removeEventListener(
        'mouseleave',
        mouseLeaveHandler,
      );
    },
  } as Record<MessageName, () => void>;
  if (eventHandler[data.message]) eventHandler[data.message]();
};

window.addEventListener('message', messageHandler);

window.postMessage({
  message: MessageName.RecordScriptReady,
});
