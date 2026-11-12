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
import { OrgPicker, type OrgOption, type OrgSwitch } from '~/cloud/OrgPicker';
import { SetupSlow, SettingUpText } from '~/popup/SettingUpView';
import type { CloudAccount } from '~/types';

/** Firefox has no sign-in, so only the offline lines are shown there. */
export type AccountOffer =
  | { name: 'unavailable' }
  | { name: 'available'; signUpUrl: string; logInUrl: string };

/** The Account page in the page chrome; `end` is the right of the bar. */
export function AccountPage({
  end,
  children,
}: {
  end?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageChrome current="account" end={end}>
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

export function SignedOutAccount({ offer }: { offer: AccountOffer }) {
  return (
    <Column>
      {offer.name === 'available' && (
        <>
          <Button
            as="a"
            href={offer.signUpUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="signup"
            px="32px"
          >
            Sign up free
          </Button>
          <Link href={offer.logInUrl} target="_blank" rel="noopener noreferrer">
            Log in
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

export function SettingUpAccount({
  slow,
  dashboardUrl,
  onTryAgain,
}: {
  slow: boolean;
  dashboardUrl: string;
  onTryAgain: () => void;
}) {
  return (
    <Box maxW="340px">
      <SettingUpText />
      {slow && (
        <SetupSlow dashboardUrl={dashboardUrl} onTryAgain={onTryAgain} />
      )}
    </Box>
  );
}

export function SignedInAccount({
  account,
  orgs,
  orgSwitch,
  pickerDisabled,
  onPickOrg,
  onLogOut,
}: {
  account: CloudAccount;
  orgs: OrgOption[];
  orgSwitch: OrgSwitch;
  /** True while a recording runs, so the organization cannot change under it. */
  pickerDisabled: boolean;
  onPickOrg: (org: OrgOption) => void;
  onLogOut: () => void;
}) {
  return (
    <Column>
      <Box>
        <Text fontSize="12px" color="brand.muted" mb="6px">
          Organization
        </Text>
        <OrgPicker
          account={account}
          orgs={orgs}
          disabled={orgSwitch.name === 'switching' || pickerDisabled}
          onPick={onPickOrg}
        />
        {orgSwitch.name === 'failed' && (
          <Text color="brand.danger" fontSize="13px" mt="8px" role="alert">
            Could not switch organization. Try again.
          </Text>
        )}
      </Box>
      <Button variant="quiet" onClick={onLogOut}>
        Log out
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
