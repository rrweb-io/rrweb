import type { postEvents } from '@rrweb/browser-client';
import { EventType, type eventWithTime } from '@rrweb/types';
import type {
  CloudAccount,
  SessionShare,
  SharedSessions,
  ShareRequest,
  ShareResult,
} from '~/types';
import type { StoredUpload } from './failedUploads';
import {
  ACCOUNT_NOT_SET_UP_ERROR,
  checkStoredAccount,
  CLOUD_SERVER_URL,
  dashboardRecordingUrl,
  hostnameOf,
} from './sinks';

export type SessionSharingDeps = {
  getAccount: () => Promise<CloudAccount | null>;
  /** The session's events and recorder, or undefined if it is no longer stored. */
  loadSession: (
    sessionId: string,
  ) => Promise<
    { events: eventWithTime[]; recorderVersion: string } | undefined
  >;
  /** Remove the offline sessions' own events and session records. */
  deleteStored: (sessionIds: string[]) => Promise<void>;
  readShared: () => Promise<SharedSessions>;
  writeShared: (shared: SharedSessions) => Promise<void>;
  /** The events of a pending share the server has not accepted yet. */
  putUnsent: (upload: StoredUpload) => Promise<void>;
  getUnsent: (recordingId: string) => Promise<StoredUpload | undefined>;
  deleteUnsent: (recordingId: string) => Promise<void>;
  postEvents: typeof postEvents;
  randomId: () => string;
  openTab: (url: string) => Promise<unknown>;
  now: () => number;
};

export const INVALID_SHARE_ERROR =
  'The Share button sent a request this version cannot read. Reload the page and try again.';
export const SHARE_ACCOUNT_CHANGED_ERROR =
  'Your rrweb account changed since this page opened. Check the organization and press Share again.';
export const PENDING_ELSEWHERE_ERROR = (orgName: string) =>
  `This recording started uploading to ${orgName}. Switch back to that organization to finish sharing it.`;
export const SESSION_MISSING_ERROR =
  'This recording is no longer saved in this browser.';
export const NO_PAGE_ADDRESS_ERROR =
  'This recording has no web address to file it under, so it cannot be shared.';
/** The share message as it arrives from a page, if it is well formed. */
export function parseShareRequest(value: unknown): ShareRequest | 'invalid' {
  if (typeof value !== 'object' || value === null) return 'invalid';
  const { sessionId, userId, orgId } = value as Record<string, unknown>;
  const filled = (v: unknown): v is string => typeof v === 'string' && v !== '';
  if (filled(sessionId) && filled(userId) && filled(orgId))
    return { sessionId, userId, orgId };
  return 'invalid';
}

/**
 * Uploads offline sessions to the stored account's organization, each under
 * one cloud recording ID. Before the first POST the events are kept and the
 * share stored as pending; a failure keeps what did not arrive, and the next
 * Share sends only that, to the same recording. It is stored as shared only
 * once every event, the close included, was delivered. `share` never rejects.
 */
export function createSessionSharing(deps: SessionSharingDeps) {
  // One upload per session at a time: a second press joins the first.
  const inFlight = new Map<string, Promise<ShareResult>>();
  // Read-modify-write of the shared map, one at a time.
  let updating: Promise<unknown> = Promise.resolve();
  const remember = (sessionId: string, share: SessionShare) => {
    const next = updating.then(async () =>
      deps.writeShared({ ...(await deps.readShared()), [sessionId]: share }),
    );
    updating = next.catch(() => undefined);
    return next;
  };
  // Sessions being deleted: nothing may be stored for them meanwhile.
  const deleting = new Set<string>();
  /** Drop the sessions' entries from the shared map, and say what they were. */
  const forget = (sessionIds: string[]) => {
    const next = updating.then(async () => {
      const shared = await deps.readShared();
      const removed = sessionIds.flatMap((id) =>
        shared[id] ? [shared[id]] : [],
      );
      if (removed.length === 0) return [];
      const rest = { ...shared };
      for (const id of sessionIds) delete rest[id];
      await deps.writeShared(rest);
      return removed.map((share) => share.recordingId);
    });
    updating = next.catch(() => undefined);
    return next;
  };
  const failed = (errorMessage: string): ShareResult => ({
    name: 'share-failed',
    errorMessage,
  });

  /**
   * An upload of the whole session, to `recordingId` or a new one, or why it
   * cannot be shared.
   */
  async function prepare(
    sessionId: string,
    account: CloudAccount,
    recordingId: string | undefined,
  ): Promise<StoredUpload | ShareResult> {
    const session = await deps.loadSession(sessionId);
    if (!session || session.events.length === 0)
      return failed(SESSION_MISSING_ERROR);
    const meta = session.events.find((e) => e.type === EventType.Meta);
    const domain = hostnameOf(
      meta?.type === EventType.Meta ? meta.data.href : undefined,
    );
    if (domain === undefined) return failed(NO_PAGE_ADDRESS_ERROR);

    // Start the recording now, keeping its timing: billing and the dashboard
    // file a recording under its first event, and late usage is not counted.
    const shift = deps.now() - session.events[0].timestamp;
    const events = session.events.map((e) => ({
      ...e,
      timestamp: e.timestamp + shift,
    }));
    // The same recording-meta event the cloud sink's transport sends first.
    const metaEvent = {
      type: EventType.Custom,
      timestamp: events[0].timestamp,
      data: {
        tag: 'recording-meta',
        payload: {
          domain,
          includePii: false,
          jsEntrypoint: 'chrome-extension',
          offlineShare: true,
          recordVersion: session.recorderVersion,
        },
      },
    };
    const closeEvent = {
      type: EventType.Custom,
      timestamp: events[events.length - 1].timestamp,
      data: { tag: 'close-permanent', payload: {} },
    };
    return {
      recordingId: recordingId ?? deps.randomId(),
      publicKey: account.publicKey,
      events: [metaEvent, ...events, closeEvent].map((e) => JSON.stringify(e)),
    };
  }

  /** Every event arrived: store it as shared first, then clean up. */
  async function finish(sessionId: string, upload: StoredUpload) {
    const { recordingId } = upload;
    try {
      await remember(sessionId, { state: 'shared', recordingId });
    } catch (error) {
      // Still shared. Keep it pending with nothing left, so Share sends nothing.
      console.error('Could not store the shared session:', error);
      await deps
        .putUnsent({ ...upload, events: [] })
        .catch((e) => console.error('Could not store the shared session:', e));
      return;
    }
    await deps.deleteUnsent(recordingId).catch(() => undefined); // cleanup only
  }

  async function upload(request: ShareRequest): Promise<ShareResult> {
    const earlier = (await deps.readShared())[request.sessionId];
    if (earlier?.state === 'shared')
      return { name: 'shared', recordingId: earlier.recordingId };
    const account = checkStoredAccount(await deps.getAccount(), request);
    if (account === 'not-set-up') return failed(ACCOUNT_NOT_SET_UP_ERROR);
    if (account === 'changed') return failed(SHARE_ACCOUNT_CHANGED_ERROR);

    if (
      earlier?.state === 'pending' &&
      (earlier.userId !== request.userId || earlier.orgId !== request.orgId)
    )
      return failed(PENDING_ELSEWHERE_ERROR(earlier.orgName));

    // A pending share resumes with what did not arrive, under the key it
    // started with: one session is only ever one recording.
    let pending =
      earlier?.state === 'pending'
        ? await deps.getUnsent(earlier.recordingId)
        : undefined;
    if (pending) {
      // The kept events outlive a deleted session; they are not shared.
      if (!(await deps.loadSession(request.sessionId)))
        return failed(SESSION_MISSING_ERROR);
    } else {
      // Kept events lost (storage cleared): send it all again, same recording.
      const prepared = await prepare(
        request.sessionId,
        account,
        earlier?.recordingId,
      );
      if ('name' in prepared) return prepared;
      pending = prepared;
      // events first, so a pending share always has them
      await deps.putUnsent(pending);
      await remember(request.sessionId, {
        state: 'pending',
        recordingId: pending.recordingId,
        userId: account.userId,
        orgId: account.orgId,
        orgName: account.orgName,
      });
    }

    if (deleting.has(request.sessionId)) return failed(SESSION_MISSING_ERROR);
    if (pending.events.length > 0) {
      const result = await deps.postEvents(
        {
          publicApiKey: pending.publicKey,
          recordingId: pending.recordingId,
          serverUrl: CLOUD_SERVER_URL,
        },
        pending.events,
      );
      if (deleting.has(request.sessionId)) return failed(SESSION_MISSING_ERROR);
      if (!result.delivered) {
        await deps.putUnsent({ ...pending, events: result.unsent });
        return failed(result.error.message);
      }
    }
    await finish(request.sessionId, pending);
    // Shared even if the tab does not open: "Open in rrweb" opens it later.
    await deps
      .openTab(dashboardRecordingUrl(pending.recordingId))
      .catch(() => undefined);
    return { name: 'shared', recordingId: pending.recordingId };
  }

  return {
    /** `value` is untrusted: it comes from a runtime message. */
    share(value: unknown): Promise<ShareResult> {
      const request = parseShareRequest(value);
      if (request === 'invalid')
        return Promise.resolve({
          name: 'share-failed',
          errorMessage: INVALID_SHARE_ERROR,
        });
      if (deleting.has(request.sessionId))
        return Promise.resolve(failed(SESSION_MISSING_ERROR));
      const running = inFlight.get(request.sessionId);
      if (running) return running;
      const attempt = upload(request)
        .catch(
          (error): ShareResult => ({
            name: 'share-failed',
            errorMessage:
              error instanceof Error ? error.message : String(error),
          }),
        )
        .finally(() => inFlight.delete(request.sessionId));
      inFlight.set(request.sessionId, attempt);
      return attempt;
    },
    /**
     * Delete offline sessions with everything a share kept for them: the
     * pending share, its events and the shared-map entry. An upload still
     * running is waited for, and stores nothing once it ends.
     */
    async deleteSessions(sessionIds: string[]): Promise<void> {
      for (const id of sessionIds) deleting.add(id);
      try {
        await Promise.all(sessionIds.map((id) => inFlight.get(id)));
        // Delete the kept events first, while the shared map still points at
        // them, so a failure part way can be retried without losing track of
        // unmasked data.
        const shared = await deps.readShared();
        const recordingIds = sessionIds.flatMap((id) =>
          shared[id] ? [shared[id].recordingId] : [],
        );
        await Promise.all(recordingIds.map((id) => deps.deleteUnsent(id)));
        await forget(sessionIds);
        await deps.deleteStored(sessionIds);
      } finally {
        for (const id of sessionIds) deleting.delete(id);
      }
    },
  };
}
