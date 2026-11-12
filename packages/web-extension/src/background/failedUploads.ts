import type { postEvents } from '@rrweb/browser-client';
import type { FailedUpload, FailedUploadState } from '~/types';
import {
  CLOUD_SERVER_URL,
  dashboardRecordingUrl,
  type UnsentUpload,
} from './sinks';

/** The part of a failed upload kept out of the popup's storage: its events. */
export type StoredUpload = {
  recordingId: string;
  publicKey: string;
  /** Serialized events the server has not accepted yet, in order. */
  events: string[];
};

export type FailedUploadsDeps = {
  readList: () => Promise<FailedUpload[]>;
  writeList: (list: FailedUpload[]) => Promise<void>;
  putUpload: (upload: StoredUpload) => Promise<void>;
  getUpload: (recordingId: string) => Promise<StoredUpload | undefined>;
  deleteUpload: (recordingId: string) => Promise<void>;
  postEvents: typeof postEvents;
  openTab: (url: string) => Promise<unknown>;
  /** The user of the stored cloud account, if any. */
  currentUserId: () => Promise<string | null>;
};

export const WRONG_USER_ERROR =
  'Log in as the account that made this recording to upload it.';
export const EVENTS_MISSING_ERROR =
  'This recording is no longer saved in this browser. Discard it.';

/**
 * Cloud recordings whose upload failed. Their events stay in this browser
 * until a retry delivers them to the same recording ID, the person discards
 * them, or the user who made them logs out. The popup lists them from
 * `readList`'s storage. No method rejects: a failure becomes a named state.
 */
export function createFailedUploads(deps: FailedUploadsDeps) {
  // Users who logged out while a recording of theirs could still fail. A
  // recording finishing later keeps nothing for them, until they log back in.
  const loggedOut = new Set<string>();
  const isLoggedOut = async (userId: string) => {
    if (!loggedOut.has(userId)) return false;
    if ((await deps.currentUserId()) !== userId) return true;
    loggedOut.delete(userId);
    return false;
  };
  // Read-modify-write of the list, one at a time.
  let updating: Promise<unknown> = Promise.resolve();
  const updateList = (change: (list: FailedUpload[]) => FailedUpload[]) => {
    const next = updating.then(async () =>
      deps.writeList(change(await deps.readList())),
    );
    updating = next.catch(() => undefined);
    return next;
  };
  const find = async (recordingId: string) =>
    (await deps.readList()).find((u) => u.recordingId === recordingId);
  const setState = (recordingId: string, state: FailedUploadState) =>
    updateList((list) =>
      list.map((u) => (u.recordingId === recordingId ? { ...u, state } : u)),
    );
  /** Delete the events first, so a listed upload always has them. */
  const remove = async (recordingId: string) => {
    await deps.deleteUpload(recordingId);
    await updateList((list) =>
      list.filter((u) => u.recordingId !== recordingId),
    );
  };
  /** Claim it for a retry; false if it is not waiting for one. */
  const claim = async (recordingId: string) => {
    let claimed = false;
    await updateList((list) =>
      list.map((u) => {
        if (
          u.recordingId !== recordingId ||
          (u.state.name !== 'upload-failed' && u.state.name !== 'retry-failed')
        )
          return u;
        claimed = true;
        return { ...u, state: { name: 'retrying' } };
      }),
    );
    return claimed;
  };

  /** One upload attempt; 'delivered' is stored before anything is deleted. */
  async function send(
    upload: FailedUpload,
  ): Promise<'delivered' | FailedUploadState> {
    if ((await deps.currentUserId()) !== upload.userId)
      return { name: 'retry-failed', errorMessage: WRONG_USER_ERROR };
    const stored = await deps.getUpload(upload.recordingId);
    if (!stored)
      return { name: 'retry-failed', errorMessage: EVENTS_MISSING_ERROR };
    const result = await deps.postEvents(
      {
        publicApiKey: stored.publicKey,
        recordingId: upload.recordingId,
        serverUrl: CLOUD_SERVER_URL,
      },
      stored.events,
    );
    if (!result.delivered) {
      // logged out or discarded meanwhile: keep nothing behind
      if (await find(upload.recordingId))
        await deps.putUpload({ ...stored, events: result.unsent });
      return { name: 'retry-failed', errorMessage: result.error.message };
    }
    await setState(upload.recordingId, { name: 'delivered' });
    return 'delivered';
  }

  return {
    async keep(upload: UnsentUpload) {
      const { recordingId, userId, publicKey, title, unsent } = upload;
      if (await isLoggedOut(userId)) return;
      // events first, so a listed upload always has them
      await deps.putUpload({ recordingId, publicKey, events: unsent });
      let listed = false;
      await updateList((list) => {
        if (loggedOut.has(userId)) return list; // logged out meanwhile
        listed = true;
        return [
          ...list.filter((u) => u.recordingId !== recordingId),
          { recordingId, userId, title, state: { name: 'upload-failed' } },
        ];
      });
      if (!listed) await deps.deleteUpload(recordingId);
    },

    async retry(recordingId: string) {
      const upload = await find(recordingId);
      if (!upload) return;
      if (upload.state.name === 'delivered') {
        await remove(recordingId).catch(() => undefined); // cleanup only
        return;
      }
      if (!(await claim(recordingId))) return; // a retry is in flight
      let outcome: 'delivered' | FailedUploadState;
      try {
        outcome = await send(upload);
      } catch (error) {
        outcome = { name: 'retry-failed', errorMessage: messageOf(error) };
      }
      if (outcome !== 'delivered') {
        await setState(recordingId, outcome);
        return;
      }
      await deps.openTab(dashboardRecordingUrl(recordingId));
      // left 'delivered' if this fails: the next retry or restart cleans up
      await remove(recordingId).catch(() => undefined);
    },

    /** Delete a failed upload the person no longer wants, unless retrying. */
    async discard(recordingId: string) {
      const upload = await find(recordingId);
      if (!upload || upload.state.name === 'retrying') return;
      await remove(recordingId);
    },

    /** The user logged out: delete every failed upload they made. */
    async forgetUser(userId: string) {
      loggedOut.add(userId);
      const theirs = (await deps.readList()).filter((u) => u.userId === userId);
      for (const upload of theirs) await remove(upload.recordingId);
    },

    /**
     * A worker restart ends any retry in flight: let it be pressed again,
     * and finish the cleanup of one that was delivered.
     */
    async recoverAfterRestart() {
      await updateList((list) =>
        list.map((u) =>
          u.state.name === 'retrying'
            ? { ...u, state: { name: 'upload-failed' } }
            : u,
        ),
      );
      const delivered = (await deps.readList()).filter(
        (u) => u.state.name === 'delivered',
      );
      for (const upload of delivered)
        await remove(upload.recordingId).catch(() => undefined);
    },
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
