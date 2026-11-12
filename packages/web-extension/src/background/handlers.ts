import type Channel from '~/utils/channel';
import { EventName, ServiceName } from '~/types';
import type { RecordedEvent, ShareResult } from '~/types';
import type { createFailedUploads } from './failedUploads';
import type { createRecorder } from './recorder';
import type { createSessionSharing } from './shareSession';

/** What the handlers act on, once the background has finished starting. */
export type BackgroundServices = {
  recorder: ReturnType<typeof createRecorder>;
  failedUploads: ReturnType<typeof createFailedUploads>;
  sharing: ReturnType<typeof createSessionSharing>;
};

export const BACKGROUND_NOT_READY_ERROR =
  'The extension could not start. Reload it and try again.';

/**
 * Register every runtime message handler on `channel` right away. A message
 * that wakes a suspended MV3 worker is dispatched during its first synchronous
 * run, so the handlers must exist before any await. Each one waits for
 * `ready` before it acts.
 */
export function registerHandlers(
  channel: Pick<Channel, 'on' | 'provide'>,
  ready: Promise<BackgroundServices>,
  options: { shareEnabled: boolean },
) {
  const logFailure = (action: string) => (error: unknown) =>
    console.error(`Could not ${action}:`, error);
  const whenReady = (
    action: string,
    act: (services: BackgroundServices) => unknown,
  ) => {
    void ready.then(act).catch(logFailure(action));
  };

  channel.on(EventName.StartButtonClicked, (request) =>
    whenReady('start recording', ({ recorder }) => recorder.start(request)),
  );
  channel.on(EventName.StopButtonClicked, () =>
    whenReady('stop recording', ({ recorder }) => recorder.stop()),
  );
  channel.on(EventName.PauseButtonClicked, () =>
    whenReady('pause recording', ({ recorder }) => recorder.pauseClicked()),
  );
  channel.on(EventName.ResumeButtonClicked, () =>
    whenReady('resume recording', ({ recorder }) => recorder.resumeClicked()),
  );
  channel.on(EventName.ContentScriptEmitEvent, (data, sender) =>
    whenReady('record the event', ({ recorder }) =>
      recorder.add(data as RecordedEvent, {
        tabId: sender.tab?.id,
        frameId: sender.frameId,
      }),
    ),
  );
  // Retry never rejects: a failure is stored as the upload's retry-failed
  // state, which the popup shows. Discard and log out can fail on storage.
  channel.on(EventName.RetryUploadClicked, (data) => {
    const recordingId = stringField(data, 'recordingId');
    if (recordingId !== 'invalid')
      whenReady('retry the upload', ({ failedUploads }) =>
        failedUploads.retry(recordingId),
      );
  });
  channel.on(EventName.DiscardUploadClicked, (data) => {
    const recordingId = stringField(data, 'recordingId');
    if (recordingId !== 'invalid')
      whenReady('discard the recording', ({ failedUploads }) =>
        failedUploads.discard(recordingId),
      );
  });
  channel.on(EventName.UserLoggedOut, (data) => {
    const userId = stringField(data, 'userId');
    if (userId !== 'invalid')
      whenReady("delete the user's failed uploads", ({ failedUploads }) =>
        failedUploads.forgetUser(userId),
      );
  });

  // Deleting sessions also removes what Share kept for them, so it runs here.
  // It rejects if the background could not start or storage failed.
  channel.provide(ServiceName.DeleteSessions, async (params) => {
    const sessionIds =
      typeof params === 'object' && params !== null
        ? (params as Record<string, unknown>).sessionIds
        : undefined;
    if (
      !Array.isArray(sessionIds) ||
      !sessionIds.every((id) => typeof id === 'string' && id !== '')
    )
      throw new Error('Delete needs a list of session IDs.');
    const { sharing } = await ready;
    await sharing.deleteSessions(sessionIds as string[]);
    return undefined;
  });

  // Offline sessions are shared with the stored account (Chromium only).
  if (options.shareEnabled) {
    channel.provide(
      ServiceName.ShareSession,
      async (request): Promise<ShareResult> => {
        let services: BackgroundServices;
        try {
          services = await ready;
        } catch (error) {
          logFailure('share the session')(error);
          return {
            name: 'share-failed',
            errorMessage: BACKGROUND_NOT_READY_ERROR,
          };
        }
        return services.sharing.share(request);
      },
    );
  }
}

/** A non-empty string field of a runtime message, or 'invalid'. */
function stringField(data: unknown, key: string): string | 'invalid' {
  if (typeof data !== 'object' || data === null) return 'invalid';
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' && value !== '' ? value : 'invalid';
}
