import { config, connectUrl, signUpUrl } from '~/config';
import { disconnect, useConnection } from '~/utils/useConnection';
import {
  AccountLoading,
  AccountPage,
  ConnectedAccount,
  NotConnectedAccount,
} from './AccountViews';

export default function App() {
  if (!config.cloudEnabled)
    return (
      <AccountPage>
        <NotConnectedAccount offer={{ name: 'unavailable' }} />
      </AccountPage>
    );
  return <CloudAccount />;
}

function CloudAccount() {
  const connection = useConnection();
  return (
    <AccountPage>
      {connection.name === 'loading' ? (
        <AccountLoading label="Loading" />
      ) : connection.name === 'connected' ? (
        <ConnectedAccount
          account={connection.account}
          connectUrl={connectUrl()}
          onDisconnect={() =>
            void disconnect().catch((e) =>
              console.error('Could not disconnect:', e),
            )
          }
        />
      ) : (
        <NotConnectedAccount
          offer={{
            name: 'available',
            connectUrl: connectUrl(),
            signUpUrl: signUpUrl(),
          }}
        />
      )}
    </AccountPage>
  );
}
