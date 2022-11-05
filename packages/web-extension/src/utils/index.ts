import Browser from 'webextension-polyfill';
import type { eventWithTime } from 'rrweb/typings/types';
import { openDB } from 'idb';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  RecordStartedMessage,
  RecordStoppedMessage,
  ServiceName,
  Session,
} from '../types';
import type Channel from './channel';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatTime(ms: number): string {
  if (ms <= 0) {
    return '00:00';
  }
  const hour = Math.floor(ms / HOUR);
  ms = ms % HOUR;
  const minute = Math.floor(ms / MINUTE);
  ms = ms % MINUTE;
  const second = Math.floor(ms / SECOND);
  if (hour) {
    return `${padZero(hour)}:${padZero(minute)}:${padZero(second)}`;
  }
  return `${padZero(minute)}:${padZero(second)}`;
}

function padZero(num: number, len = 2): string {
  let str = String(num);
  const threshold = Math.pow(10, len - 1);
  if (num < threshold) {
    while (String(threshold).length > str.length) {
      str = `0${num}`;
    }
  }
  return str;
}

// Pause recording.
export async function pauseRecording(
  channel: Channel,
  newStatus: RecorderStatus,
  status?: LocalData[LocalDataKey.recorderStatus],
) {
  if (!status)
    status = (await Browser.storage.local.get(LocalDataKey.recorderStatus))[
      LocalDataKey.recorderStatus
    ] as LocalData[LocalDataKey.recorderStatus];
  const { startTimestamp, activeTabId } = status;
  const stopResponse = (await channel.requestToTab(
    activeTabId,
    ServiceName.PauseRecord,
    {},
  )) as RecordStoppedMessage;
  if (!stopResponse) return;
  const statusData: LocalData[LocalDataKey.recorderStatus] = {
    status: newStatus,
    activeTabId,
    startTimestamp,
    pausedTimestamp: stopResponse.endTimestamp,
  };
  await Browser.storage.local.set({
    [LocalDataKey.recorderStatus]: statusData,
  });
  return {
    status: statusData,
    bufferedEvents: stopResponse.events,
  };
}

// Resume recording after change to a new tab.
export async function resumeRecording(
  channel: Channel,
  newTabId: number,
  status?: LocalData[LocalDataKey.recorderStatus],
  bufferedEvents?: eventWithTime[],
) {
  if (!status)
    status = (await Browser.storage.local.get(LocalDataKey.recorderStatus))[
      LocalDataKey.recorderStatus
    ] as LocalData[LocalDataKey.recorderStatus];
  if (!bufferedEvents)
    bufferedEvents = ((await Browser.storage.local.get(
      LocalDataKey.bufferedEvents,
    )) as LocalData)[LocalDataKey.bufferedEvents];
  const { startTimestamp, pausedTimestamp } = status;
  const startResponse = (await channel.requestToTab(
    newTabId,
    ServiceName.ResumeRecord,
    { events: bufferedEvents, pausedTimestamp },
  )) as RecordStartedMessage;
  if (!startResponse) return;
  const pausedTime = pausedTimestamp
    ? startResponse.startTimestamp - pausedTimestamp
    : 0;
  const statusData: LocalData[LocalDataKey.recorderStatus] = {
    status: RecorderStatus.RECORDING,
    activeTabId: newTabId,
    startTimestamp:
      (startTimestamp || bufferedEvents[0].timestamp) + pausedTime,
  };
  await Browser.storage.local.set({
    [LocalDataKey.recorderStatus]: statusData,
  });
  return statusData;
}

const EventStoreName = 'events';
type EventData = {
  id: string;
  events: eventWithTime[];
};

export async function getEventStore() {
  return openDB<EventData>(EventStoreName, 1, {
    upgrade(db) {
      db.createObjectStore(EventStoreName, {
        keyPath: 'id',
        autoIncrement: false,
      });
    },
  });
}

export async function getEvents(id: string) {
  const db = await getEventStore();
  const data = (await db.get(EventStoreName, id)) as EventData;
  return data.events;
}

const SessionStoreName = 'sessions';
export async function getSessionStore() {
  return openDB<Session>(SessionStoreName, 1, {
    upgrade(db) {
      // Create a store of objects
      db.createObjectStore(SessionStoreName, {
        // The 'id' property of the object will be the key.
        keyPath: 'id',
        // If it isn't explicitly set, create a value by auto incrementing.
        autoIncrement: false,
      });
    },
  });
}

export async function saveSession(session: Session, events: eventWithTime[]) {
  const eventStore = await getEventStore();
  await eventStore.put(EventStoreName, { id: session.id, events });
  const store = await getSessionStore();
  await store.add(SessionStoreName, session);
}

export async function getSession(id: string) {
  const store = await getSessionStore();
  return store.get(SessionStoreName, id) as Promise<Session>;
}

export async function getAllSessions() {
  const store = await getSessionStore();
  const sessions = (await store.getAll(SessionStoreName)) as Session[];
  return sessions.sort((a, b) => b.createTimestamp - a.createTimestamp);
}

export async function deleteSession(id: string) {
  const eventStore = await getEventStore();
  const sessionStore = await getSessionStore();
  await Promise.all([
    eventStore.delete(EventStoreName, id),
    sessionStore.delete(SessionStoreName, id),
  ]);
}

export async function deleteSessions(ids: string[]) {
  const eventStore = await getEventStore();
  const sessionStore = await getSessionStore();
  const eventTransition = eventStore.transaction(EventStoreName, 'readwrite');
  const sessionTransition = sessionStore.transaction(
    SessionStoreName,
    'readwrite',
  );
  const promises = [];
  for (const id of ids) {
    promises.push(eventTransition.store.delete(id));
    promises.push(sessionTransition.store.delete(id));
  }
  await Promise.all(promises).then(() => {
    return Promise.all([eventTransition.done, sessionTransition.done]);
  });
}
