import type { eventWithTime } from '@rrweb/types';
import type { recordOptions } from 'rrweb';
import { dashboardRecordingUrl, sessionPage } from '~/config';
import type {
  CloudAccount,
  Connection,
  Destination,
  RecordingKind,
  Session,
  ShareResult,
  StartRequest,
} from '~/types';
import type { addSession } from '~/utils/storage';

/**
 * Every recording keeps its events here, in the background, until it
 * finishes. A cloud recording is then stored like an offline one and
 * uploaded from storage.
 */
export type RecordingSink = {
  destination: Destination;
  recordConfig: recordOptions<eventWithTime>; // sent to the page with StartRecord
  add(event: eventWithTime): void;
  finish(title: string): Promise<FinishResult>;
  /** Close the gap left by a pause by moving stored events later. */
  shiftEvents(ms: number): void;
};

/**
 * saved: an offline recording is stored as `session`, shown at `openUrl`.
 * uploaded: a cloud recording is in rrweb at `openUrl`; its local copy is gone.
 * upload-failed: a cloud recording is stored as `session`, shown at
 * `openUrl`, as a pending share that Share finishes.
 */
export type FinishResult =
  | { state: 'saved'; session: Session; openUrl: string }
  | { state: 'uploaded'; openUrl: string }
  | {
      state: 'upload-failed';
      session: Session;
      openUrl: string;
      errorMessage: string;
    };

type SinkDeps = {
  addSession: typeof addSession;
  /** Upload a stored session to `account`'s organization (the Share path). */
  uploadSession: (
    sessionId: string,
    account: CloudAccount,
  ) => Promise<ShareResult>;
  /** Delete a stored session and everything its upload kept. */
  deleteSession: (sessionId: string) => Promise<void>;
  randomId: () => string;
  getURL: (path: string) => string;
  recorderVersion: string;
};

/**
 * Cloud recordings mask everything; offline keeps the rrweb defaults.
 * The recorder runs in the top frame only (it is injected through activeTab,
 * which covers the tab's own origin), so cross-origin iframes are not recorded.
 */
export function recordConfigFor(
  kind: RecordingKind,
): recordOptions<eventWithTime> {
  return kind === 'cloud'
    ? {
        recordCrossOriginIframes: false,
        maskAllInputs: true,
        slimDOMOptions: 'all',
        inlineStylesheet: true,
      }
    : { recordCrossOriginIframes: false };
}

/** What startRecording decided to record into. */
export type SinkTarget =
  | { kind: 'offline' }
  | { kind: 'cloud'; account: CloudAccount };

/** The hostname a cloud recording is filed under, if the page has one. */
export function hostnameOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The account is the one connected when the recording started: a cloud
 * recording uploads there even if the dashboard connects another meanwhile.
 */
export function createSink(target: SinkTarget, deps: SinkDeps): RecordingSink {
  const events: eventWithTime[] = [];
  return {
    destination:
      target.kind === 'cloud'
        ? { name: 'organization', orgName: target.account.orgName }
        : { name: 'stored-only' },
    recordConfig: recordConfigFor(target.kind),
    add: (event) => {
      events.push(event);
    },
    shiftEvents: (ms) => {
      events.forEach((event) => {
        event.timestamp += ms;
      });
    },
    finish: async (title) => {
      const now = Date.now();
      const session: Session = {
        id: deps.randomId(),
        name: title,
        tags: [],
        createTimestamp: now,
        modifyTimestamp: now,
        recorderVersion: deps.recorderVersion,
        recordedAs: target.kind,
      };
      await deps.addSession(session, events);
      const openUrl = deps.getURL(sessionPage(session.id));
      if (target.kind === 'offline')
        return { state: 'saved', session, openUrl };
      const result = await deps.uploadSession(session.id, target.account);
      if (result.name === 'share-failed')
        return {
          state: 'upload-failed',
          session,
          openUrl,
          errorMessage: result.errorMessage,
        };
      // The upload is complete; a local copy left behind is only clutter.
      await deps
        .deleteSession(session.id)
        .catch((e) => console.error('Could not delete the uploaded copy:', e));
      return {
        state: 'uploaded',
        openUrl: dashboardRecordingUrl(result.recordingId),
      };
    },
  };
}

export type StartRecordingResult =
  | { state: 'started'; sink: RecordingSink; startTimestamp: number }
  | { state: 'refused'; errorMessage: string }; // nothing started

/** A cloud start, or a Share, for a page without a hostname to file it under. */
export const NO_HOSTNAME_ERROR =
  'This page has no web address to file the recording under.';
export const INVALID_START_ERROR =
  'The record button sent a request this version cannot read. Reopen the popup and try again.';
export const ACCOUNT_CHANGED_ERROR =
  'The connected rrweb organization changed since this popup opened. Check the organization and press record again.';

/**
 * The connected account, if it is the organization a button promised
 * (`expected`); 'changed' if none is connected or it is another one.
 */
export function checkStoredAccount(
  connection: Connection,
  expected: { orgId: string },
): CloudAccount | 'changed' {
  if (
    connection.name !== 'connected' ||
    connection.account.orgId !== expected.orgId
  )
    return 'changed';
  return connection.account;
}

/** The start message as it arrives from the popup, if it is well formed. */
export function parseStartRequest(value: unknown): StartRequest | 'invalid' {
  if (typeof value !== 'object' || value === null) return 'invalid';
  const { mode, orgId } = value as Record<string, unknown>;
  if (mode === 'offline') return { mode };
  if (mode === 'cloud' && typeof orgId === 'string' && orgId !== '')
    return { mode, orgId };
  return 'invalid';
}

/**
 * Ask the tab to record first, and only then create the sink. The
 * destination is the one the pressed button showed: offline records offline
 * whatever is connected, and a cloud start is refused unless the connected
 * organization is still that one. A cloud recording needs the tab's hostname
 * to be filed under, so a tab without one is refused before anything starts.
 */
export async function startRecording(deps: {
  /** Untrusted: it comes from a runtime message. */
  request: unknown;
  getConnection: () => Promise<Connection>;
  getTabUrl: () => Promise<string | undefined>;
  requestStart: (
    config: recordOptions<eventWithTime>,
  ) => Promise<{ startTimestamp: number }>;
  createSink: (target: SinkTarget) => RecordingSink;
}): Promise<StartRecordingResult> {
  const request = parseStartRequest(deps.request);
  if (request === 'invalid')
    return { state: 'refused', errorMessage: INVALID_START_ERROR };
  let target: SinkTarget = { kind: 'offline' };
  if (request.mode === 'cloud') {
    const account = checkStoredAccount(await deps.getConnection(), request);
    if (account === 'changed')
      return { state: 'refused', errorMessage: ACCOUNT_CHANGED_ERROR };
    const domain = hostnameOf(await deps.getTabUrl());
    if (domain === undefined)
      return { state: 'refused', errorMessage: NO_HOSTNAME_ERROR };
    target = { kind: 'cloud', account };
  }
  let startTimestamp: number;
  try {
    ({ startTimestamp } = await deps.requestStart(
      recordConfigFor(target.kind),
    ));
  } catch (error) {
    return { state: 'refused', errorMessage: (error as Error).message };
  }
  return { state: 'started', sink: deps.createSink(target), startTimestamp };
}
