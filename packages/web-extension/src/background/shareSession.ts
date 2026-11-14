import { EventType, type eventWithTime } from '@rrweb/types';
import type {
  CloudAccount,
  Connection,
  SessionShare,
  SharedSessions,
  ShareRequest,
  ShareResult,
} from '~/types';
import { dashboardRecordingUrl } from '~/config';
import { filled } from '~/utils';
import type { StoredUnsentEvents } from '~/utils/storage';
import { checkStoredAccount, hostnameOf, NO_HOSTNAME_ERROR } from './sinks';
import type { uploadEvents } from './upload';

export type SessionSharingDeps = {
  getConnection: () => Promise<Connection>;
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
  putUnsent: (upload: StoredUnsentEvents) => Promise<void>;
  getUnsent: (recordingId: string) => Promise<StoredUnsentEvents | undefined>;
  deleteUnsent: (recordingId: string) => Promise<void>;
  /** `uploadEvents` with the API address filled in. */
  postEvents: (
    target: { recordingId: string; publicKey: string },
    lines: string[],
    /** Saves what is still unsent after each accepted chunk. */
    onDelivered: (unsent: string[]) => Promise<void>,
  ) => ReturnType<typeof uploadEvents>;
  randomId: () => string;
  openTab: (url: string) => Promise<unknown>;
  now: () => number;
};

export const INVALID_SHARE_ERROR =
  'The Share button sent a request this version cannot read. Reload the page and try again.';
export const SHARE_ACCOUNT_CHANGED_ERROR =
  'The connected rrweb organization changed since this page opened. Check the organization and press Share again.';
export const PENDING_ELSEWHERE_ERROR = (orgName: string) =>
  `This recording started uploading to ${orgName}. Connect that organization again to finish sharing it.`;
export const SESSION_MISSING_ERROR =
  'This recording is no longer saved in this browser.';
/** The share message as it arrives from a page, if it is well formed. */
export function parseShareRequest(value: unknown): ShareRequest | 'invalid' {
  if (typeof value !== 'object' || value === null) return 'invalid';
  const { sessionId, orgId } = value as Record<string, unknown>;
  if (filled(sessionId) && filled(orgId)) return { sessionId, orgId };
  return 'invalid';
}

/**
 * Uploads stored sessions to an organization, each under one cloud recording
 * ID: offline sessions with Share, and cloud recordings when they stop.
 * Before the first POST the events are kept and the share stored as pending;
 * a failure keeps what did not arrive, and the next Share sends only that, to
 * the same recording. It is stored as shared only once every event, the
 * close included, was delivered. `share` and `uploadStopped` never reject.
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
  /** Drop the sessions' entries from the shared map. */
  const forget = (sessionIds: string[]): Promise<void> => {
    const next = updating.then(async () => {
      const shared = await deps.readShared();
      if (!sessionIds.some((id) => shared[id])) return;
      const rest = { ...shared };
      for (const id of sessionIds) delete rest[id];
      await deps.writeShared(rest);
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
    recordingId: string | undefined,
  ): Promise<Extract<StoredUnsentEvents, { state: 'unsent' }> | ShareResult> {
    const session = await deps.loadSession(sessionId);
    if (!session || session.events.length === 0)
      return failed(SESSION_MISSING_ERROR);
    const meta = session.events.find((e) => e.type === EventType.Meta);
    const domain = hostnameOf(
      meta?.type === EventType.Meta ? meta.data.href : undefined,
    );
    if (domain === undefined) return failed(NO_HOSTNAME_ERROR);

    // Start the recording now, keeping its timing: billing and the dashboard
    // file a recording under its first event, and late usage is not counted.
    const shift = deps.now() - session.events[0].timestamp;
    const events = session.events.map((e) => ({
      ...e,
      timestamp: e.timestamp + shift,
    }));
    // The server reads the recording's details from this first event.
    const metaEvent = {
      type: EventType.Custom,
      timestamp: events[0].timestamp,
      data: {
        tag: 'recording-meta',
        payload: {
          domain,
          includePii: false,
          jsEntrypoint: 'chrome-extension',
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
      state: 'unsent',
      events: [metaEvent, ...events, closeEvent].map((e) => JSON.stringify(e)),
    };
  }

  /** Every event arrived: store it as shared first, then clean up. */
  async function finish(sessionId: string, recordingId: string) {
    try {
      await remember(sessionId, { state: 'shared', recordingId });
    } catch (error) {
      // Still shared. Keep it pending as delivered, so Share sends nothing.
      console.error('Could not store the shared session:', error);
      await deps
        .putUnsent({ recordingId, state: 'delivered' })
        .catch((e) => console.error('Could not store the shared session:', e));
      return;
    }
    await deps.deleteUnsent(recordingId).catch(() => undefined); // cleanup only
  }

  /**
   * Upload the session to the account `resolveAccount` gives, or say why
   * not. A session already shared is not checked against any account.
   */
  async function upload(
    sessionId: string,
    resolveAccount: () => Promise<CloudAccount | ShareResult>,
  ): Promise<ShareResult> {
    const earlier = (await deps.readShared())[sessionId];
    if (earlier?.state === 'shared')
      return { name: 'shared', recordingId: earlier.recordingId };
    const account = await resolveAccount();
    if ('name' in account) return account;

    if (earlier?.state === 'pending' && earlier.orgId !== account.orgId)
      return failed(PENDING_ELSEWHERE_ERROR(earlier.orgName));

    // A pending share resumes with what did not arrive, to the same
    // recording, with the key of the organization connected now: one session
    // is only ever one recording, and a reconnect may have rotated the key.
    let pending =
      earlier?.state === 'pending'
        ? await deps.getUnsent(earlier.recordingId)
        : undefined;
    if (pending) {
      // The kept events outlive a deleted session; they are not shared.
      if (!(await deps.loadSession(sessionId)))
        return failed(SESSION_MISSING_ERROR);
    } else {
      // Kept events lost (storage cleared): send it all again, same recording.
      const prepared = await prepare(sessionId, earlier?.recordingId);
      if ('name' in prepared) return prepared;
      pending = prepared;
      // events first, so a pending share always has them
      await deps.putUnsent(pending);
      try {
        await remember(sessionId, {
          state: 'pending',
          recordingId: pending.recordingId,
          orgId: account.orgId,
          orgName: account.orgName,
        });
      } catch (error) {
        // Without the map entry, deleting the session could not find these
        // events; drop them so nothing is left behind.
        await deps.deleteUnsent(pending.recordingId).catch(() => undefined);
        throw error;
      }
    }

    if (deleting.has(sessionId)) return failed(SESSION_MISSING_ERROR);
    if (pending.state === 'unsent') {
      const unsent = pending;
      const result = await deps.postEvents(
        { recordingId: unsent.recordingId, publicKey: account.publicKey },
        unsent.events,
        (events) => deps.putUnsent({ ...unsent, events }),
      );
      if (deleting.has(sessionId)) return failed(SESSION_MISSING_ERROR);
      if (result.state === 'not-delivered') {
        await deps.putUnsent({ ...pending, events: result.unsent });
        return failed(result.error.message);
      }
    }
    await finish(sessionId, pending.recordingId);
    return { name: 'shared', recordingId: pending.recordingId };
  }

  /** One upload per session at a time; a second request joins the first. */
  function run(
    sessionId: string,
    resolveAccount: () => Promise<CloudAccount | ShareResult>,
  ): Promise<ShareResult> {
    if (deleting.has(sessionId))
      return Promise.resolve(failed(SESSION_MISSING_ERROR));
    const running = inFlight.get(sessionId);
    if (running) return running;
    const attempt = upload(sessionId, resolveAccount)
      .catch(
        (error): ShareResult =>
          failed(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => inFlight.delete(sessionId));
    inFlight.set(sessionId, attempt);
    return attempt;
  }

  return {
    /** `value` is untrusted: it comes from a runtime message. */
    async share(value: unknown): Promise<ShareResult> {
      const request = parseShareRequest(value);
      if (request === 'invalid') return failed(INVALID_SHARE_ERROR);
      const result = await run(request.sessionId, async () => {
        const account = checkStoredAccount(await deps.getConnection(), request);
        return account === 'changed'
          ? failed(SHARE_ACCOUNT_CHANGED_ERROR)
          : account;
      });
      // Shared even if the tab does not open: "Open in rrweb" opens it later.
      if (result.name === 'shared')
        await deps
          .openTab(dashboardRecordingUrl(result.recordingId))
          .catch(() => undefined);
      return result;
    },
    /**
     * Upload a cloud recording that just stopped, to the account connected
     * when it started. The caller opens the result.
     */
    uploadStopped(sessionId: string, account: CloudAccount) {
      return run(sessionId, () => Promise.resolve(account));
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
