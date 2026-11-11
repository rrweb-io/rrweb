import { lazy, Suspense } from 'react';
import { AccountLoading, AccountPage, SignedOutAccount } from './AccountViews';

// Same test as `config.cloudEnabled`, written inline so the bundler folds it
// and the Firefox build contains no Clerk code at all.
const CloudAccountPage =
  import.meta.env.VITE_TARGET_BROWSER !== 'firefox'
    ? lazy(() => import('./CloudAccountPage'))
    : 'cloud-disabled';

export default function App() {
  if (CloudAccountPage === 'cloud-disabled')
    return (
      <AccountPage>
        <SignedOutAccount offer={{ name: 'unavailable' }} />
      </AccountPage>
    );
  return (
    <Suspense
      fallback={
        <AccountPage>
          <AccountLoading label="Loading" />
        </AccountPage>
      }
    >
      <CloudAccountPage />
    </Suspense>
  );
}
