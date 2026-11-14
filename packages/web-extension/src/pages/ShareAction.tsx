import { lazy, Suspense } from 'react';
import type { RecordingKind } from '~/types';

// Same test as `config.cloudEnabled`, written inline so the bundler folds it
// and the Firefox build, which has no Cloud, contains no Share code.
const ShareSession =
  import.meta.env.VITE_TARGET_BROWSER !== 'firefox'
    ? lazy(() =>
        import('./ShareSession').then((m) => ({ default: m.ShareSession })),
      )
    : 'share-disabled';

/** "Share" for an offline session, on Chromium only. */
export function ShareAction({
  sessionId,
  recordedAs,
}: {
  sessionId: string;
  recordedAs: RecordingKind;
}) {
  if (ShareSession === 'share-disabled') return null;
  return (
    <Suspense fallback={null}>
      <ShareSession sessionId={sessionId} recordedAs={recordedAs} />
    </Suspense>
  );
}
