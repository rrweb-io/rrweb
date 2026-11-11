import type { createTransport } from '@rrweb/browser-client';
import type { eventWithTime } from '@rrweb/types';
import type { recordOptions } from 'rrweb';
import { config } from '~/config';
import type { CloudAccount, RecordingKind, Session } from '~/types';
import type { addSession } from '~/utils/storage';

export type RecordingSink = {
  kind: RecordingKind;
  recordConfig: recordOptions<eventWithTime>; // sent to the page with StartRecord
  add(event: eventWithTime): void;
  /** Deliver anything buffered. Cloud only; offline events stay in memory. */
  flush(): void;
  finish(title: string): Promise<{ openUrl: string; session?: Session }>;
  /**
   * Offline only: close the gap left by a pause by moving stored events later.
   * Cloud sinks have none, since events already sent cannot be rewritten.
   */
  shiftEvents?(ms: number): void;
};

type SinkDeps = {
  createTransport: typeof createTransport;
  addSession: typeof addSession;
  randomId: () => string;
  getURL: (path: string) => string;
  recorderVersion: string;
};

/**
 * Signed-in recordings mask everything; offline keeps the rrweb defaults.
 * The recorder runs in the top frame only (it is injected through activeTab,
 * which covers the tab's own origin), so cross-origin iframes are not recorded.
 */
export function recordConfigFor(
  account: CloudAccount | null,
): recordOptions<eventWithTime> {
  return account
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
  | { kind: 'cloud'; account: CloudAccount; domain: string };

export function createSink(target: SinkTarget, deps: SinkDeps): RecordingSink {
  if (target.kind === 'cloud')
    return createCloudSink(target.account, target.domain, deps);
  return createOfflineSink(deps);
}

/** The hostname a cloud recording is filed under, if the tab has one. */
export function hostnameOf(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

function createCloudSink(
  account: CloudAccount,
  domain: string,
  deps: SinkDeps,
): RecordingSink {
  const recordingId = deps.randomId();
  const transport = deps.createTransport({
    publicApiKey: account.publicKey,
    recordingId,
    serverUrl: `${config.apiUrl}/recordings/{recordingId}/events/ws`,
    meta: {
      domain,
      includePii: false,
      jsEntrypoint: 'chrome-extension',
    },
  });
  return {
    kind: 'cloud',
    recordConfig: recordConfigFor(account),
    add: (event) => transport.send(event),
    flush: () => transport.flush(),
    finish: async () => {
      await transport.stop(true); // delivers anything still buffered
      return { openUrl: `${config.dashboardUrl}/recordings/${recordingId}` };
    },
  };
}

function createOfflineSink(deps: SinkDeps): RecordingSink {
  const events: eventWithTime[] = [];
  return {
    kind: 'offline',
    recordConfig: recordConfigFor(null),
    add: (event) => {
      events.push(event);
    },
    flush: () => undefined,
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
      };
      await deps.addSession(session, events);
      return {
        openUrl: deps.getURL(`pages/index.html#/session/${session.id}`),
        session,
      };
    },
  };
}

export type StartRecordingResult =
  | { state: 'started'; sink: RecordingSink; startTimestamp: number }
  | { state: 'refused'; errorMessage: string } // nothing started
  | { state: 'failed'; errorMessage: string }; // the tab started, then was stopped again

export const NO_HOSTNAME_ERROR = 'This tab has no web address to upload from.';
export const ACCOUNT_NOT_SET_UP_ERROR =
  'Open the rrweb popup to finish setting up your account.';

/**
 * Ask the tab to record first, and only then create the sink, so a tab that
 * refuses to record never opens a transport. A cloud recording needs the
 * tab's hostname, so a tab without one is refused before anything starts.
 * An account stored without its user (by an older version) is refused too:
 * the popup cannot check it, so it sets the account up again.
 */
export async function startRecording(deps: {
  getAccount: () => Promise<CloudAccount | null>;
  getTabUrl: () => Promise<string | undefined>;
  requestStart: (
    config: recordOptions<eventWithTime>,
  ) => Promise<{ startTimestamp: number }>;
  requestStop: () => Promise<unknown>;
  createSink: (target: SinkTarget) => RecordingSink;
}): Promise<StartRecordingResult> {
  const account = await deps.getAccount();
  let target: SinkTarget = { kind: 'offline' };
  if (account && !account.userId)
    return { state: 'refused', errorMessage: ACCOUNT_NOT_SET_UP_ERROR };
  if (account) {
    const domain = hostnameOf(await deps.getTabUrl());
    if (domain === undefined)
      return { state: 'refused', errorMessage: NO_HOSTNAME_ERROR };
    target = { kind: 'cloud', account, domain };
  }
  let startTimestamp: number;
  try {
    ({ startTimestamp } = await deps.requestStart(recordConfigFor(account)));
  } catch (error) {
    return { state: 'refused', errorMessage: (error as Error).message };
  }
  try {
    return { state: 'started', sink: deps.createSink(target), startTimestamp };
  } catch (error) {
    // Do not leave the page recording with nowhere to send events.
    await deps.requestStop().catch(() => undefined);
    return { state: 'failed', errorMessage: (error as Error).message };
  }
}
