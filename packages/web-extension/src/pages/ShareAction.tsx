import { lazy, Suspense } from 'react';

// Same test as `config.cloudEnabled`, written inline so the bundler folds it
// and the Firefox build, which has no sign-in, contains no Share code.
const ShareSession =
  import.meta.env.VITE_TARGET_BROWSER !== 'firefox'
    ? lazy(() =>
        import('./ShareSession').then((m) => ({ default: m.ShareSession })),
      )
    : 'share-disabled';

/** "Share" for an offline session, on Chromium only. */
export function ShareAction({ sessionId }: { sessionId: string }) {
  if (ShareSession === 'share-disabled') return null;
  return (
    <Suspense fallback={null}>
      <ShareSession sessionId={sessionId} />
    </Suspense>
  );
}
