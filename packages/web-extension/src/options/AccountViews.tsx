import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import PageChrome, { SESSIONS_HREF } from '~/components/PageChrome';
import type { CloudAccount } from '~/types';

/** Firefox has no Cloud, so only the offline lines are shown there. */
export type AccountOffer =
  | { name: 'unavailable' }
  | { name: 'available'; connectUrl: string; signUpUrl: string };

/** The Account page in the page chrome. */
export function AccountPage({ children }: { children: ReactNode }) {
  return (
    <PageChrome current="account">
      <Heading as="h1" fontSize="24px" fontWeight={600} mb="24px">
        Account
      </Heading>
      {children}
    </PageChrome>
  );
}

function Column({ children }: { children: ReactNode }) {
  return (
    <Stack spacing="16px" maxW="420px" align="flex-start">
      {children}
    </Stack>
  );
}

export function SessionListLink() {
  return (
    <Link href={SESSIONS_HREF} fontSize="14px">
      Open Offline Stored Sessions
    </Link>
  );
}

export function NotConnectedAccount({ offer }: { offer: AccountOffer }) {
  return (
    <Column>
      {offer.name === 'available' && (
        <>
          <Button
            as="a"
            href={offer.connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="signup"
            px="32px"
          >
            Connect your rrweb account
          </Button>
          <Link
            href={offer.signUpUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Create a free account
          </Link>
        </>
      )}
      <Text fontSize="13px" color="brand.muted">
        Offline recordings are kept in this browser.
      </Text>
      <SessionListLink />
    </Column>
  );
}

export function ConnectedAccount({
  account,
  connectUrl,
  onDisconnect,
}: {
  account: CloudAccount;
  connectUrl: string;
  onDisconnect: () => void;
}) {
  return (
    <Column>
      <Box>
        <Text fontSize="12px" color="brand.muted" mb="6px">
          Organization
        </Text>
        <Text fontSize="16px" fontWeight={600}>
          {account.orgName}
        </Text>
      </Box>
      <Link href={connectUrl} target="_blank" rel="noopener noreferrer">
        Change organization
      </Link>
      <Button variant="quiet" onClick={onDisconnect}>
        Disconnect
      </Button>
      <SessionListLink />
    </Column>
  );
}

export function AccountLoading({ label }: { label: string }) {
  return (
    <Flex align="center" gap="12px" color="brand.muted">
      <Spinner size="sm" label={label} />
      <Text fontSize="14px">{label}</Text>
    </Flex>
  );
}
