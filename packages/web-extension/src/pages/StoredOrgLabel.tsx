import { BarLabel } from '~/components/PageChrome';
import { useConnection } from '~/utils/useConnection';

/** The session list bar's right side: the connected organization's name. */
export function StoredOrgLabel() {
  const connection = useConnection();
  if (connection.name !== 'connected') return null;
  return <BarLabel label={connection.account.orgName} />;
}
