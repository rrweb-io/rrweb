import { record } from 'rrweb';
import type { recordOptions } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import {
  MessageName,
  type EmitEventMessage,
  type RecordStartedMessage,
} from '~/types';

/**
 * This script runs rrweb in the page world of the recorded tab's top frame.
 * Chrome injects it with chrome.scripting; on Firefox the content script adds
 * it as a <script> tag. A fresh copy runs for every start and resume, and
 * stops listening once it stops recording.
 */

// Marks a copy that is still listening, so a second copy defers to it.
const LISTENING = Symbol.for('rrweb-extension-recorder');
type MarkedWindow = Window & { [LISTENING]?: true };

let stopFn: (() => void) | null = null;

/** `token` names the recording; every event carries it back. */
function startRecord(config: recordOptions<eventWithTime>, token: string) {
  stopFn =
    record({
      emit: (event) => {
        postMessage({
          message: MessageName.EmitEvent,
          event,
          token,
        } as EmitEventMessage);
      },
      ...config,
    }) || null;
  postMessage({
    message: MessageName.RecordStarted,
    startTimestamp: Date.now(),
  } as RecordStartedMessage);
}

const messageHandler = (
  event: MessageEvent<{
    message: MessageName;
    config?: recordOptions<eventWithTime>;
    token?: string;
  }>,
) => {
  if (event.source !== window) return;
  const data = event.data;
  const eventHandler = {
    [MessageName.StartRecord]: () => {
      startRecord(data.config || {}, data.token ?? 'no-token');
    },
    [MessageName.StopRecord]: () => {
      if (stopFn) {
        try {
          stopFn();
        } catch (e) {
          //
        }
      }
      postMessage({
        message: MessageName.RecordStopped,
        endTimestamp: Date.now(),
      });
      window.removeEventListener('message', messageHandler);
      delete (window as MarkedWindow)[LISTENING];
    },
  } as Record<MessageName, () => void>;
  if (eventHandler[data.message]) eventHandler[data.message]();
};

function postMessage(message: unknown) {
  window.postMessage(message, location.origin);
}

if (!(window as MarkedWindow)[LISTENING]) {
  (window as MarkedWindow)[LISTENING] = true;
  window.addEventListener('message', messageHandler);
}

window.postMessage(
  {
    message: MessageName.RecordScriptReady,
  },
  location.origin,
);
