import { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
} from '@clerk/chrome-extension';
import { config } from '~/config';
import { removeStoredAccount } from './accountActions';

/** Clerk could not load (for example, no network): drop any stored account. */
function Unavailable({ children }: { children: ReactNode }) {
  useEffect(() => {
    void removeStoredAccount();
  }, []);
  return <>{children}</>;
}

/**
 * The one Clerk provider for the popup and the account page. Lazily imported
 * so the Firefox build contains no Clerk code.
 */
export default function CloudGate({
  afterSignOutUrl,
  loading,
  unavailable,
  children,
}: {
  afterSignOutUrl: string;
  loading: ReactNode;
  unavailable: ReactNode;
  children: ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      syncHost={config.clerkSyncHost}
      afterSignOutUrl={afterSignOutUrl}
    >
      <ClerkLoading>{loading}</ClerkLoading>
      <ClerkFailed>
        <Unavailable>{unavailable}</Unavailable>
      </ClerkFailed>
      <ClerkLoaded>{children}</ClerkLoaded>
    </ClerkProvider>
  );
}
