import { record } from 'rrweb';
import { eventWithTime, recordOptions } from 'rrweb/typings/types';
import { MessageName, RecordStartedMessage } from '../types';

const events: eventWithTime[] = [];
let stopFn: (() => void) | null = null;
let setIntervalId: number | null = null;

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
  setIntervalId = (setInterval(() => {
    window.postMessage({
      message: MessageName.HeartBeat,
      events,
    });
  }, 50) as unknown) as number;
}

window.addEventListener(
  'message',
  (event: {
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
        if (setIntervalId) clearInterval(setIntervalId);
        window.postMessage({
          message: MessageName.RecordStopped,
          events,
          endTimestamp: Date.now(),
        });
      },
    } as Record<MessageName, () => void>;
    if (eventHandler[data.message]) eventHandler[data.message]();
  },
);

window.postMessage({
  message: MessageName.RecordScriptReady,
});
