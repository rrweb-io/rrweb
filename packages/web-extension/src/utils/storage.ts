import { openDB } from 'idb';
import type { eventWithTime } from '@saola.ai/rrweb-types';
import type { Session } from '~/types';

/**
 * Storage related functions with indexedDB.
 */

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

export async function downloadSessions(ids: string[]) {
  for (const sessionId of ids) {
    const events = await getEvents(sessionId);
    const session = await getSession(sessionId);
    const blob = new Blob([JSON.stringify({ session, events }, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
