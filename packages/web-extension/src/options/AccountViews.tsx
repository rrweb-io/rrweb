import type { ReactNode } from 'react';
import { Box, Button, Flex, Link, Spinner, Stack, Text } from '@chakra-ui/react';
import { OrgPicker, type OrgOption, type OrgSwitch } from '~/cloud/OrgPicker';
import { SetupSlow, SettingUpText } from '~/popup/SettingUpView';
import type { CloudAccount } from '~/types';

export const SESSION_LIST_HREF = '/pages/index.html#/';

/** Firefox has no sign-in, so only the offline lines are shown there. */
export type AccountOffer =
  | { name: 'unavailable' }
  | { name: 'available'; signUpUrl: string; logInUrl: string };

function Column({ children }: { children: ReactNode }) {
  return (
    <Stack spacing="16px" maxW="420px" align="flex-start">
      {children}
    </Stack>
  );
}

export function SessionListLink() {
  return (
    <Link href={SESSION_LIST_HREF} fontSize="14px">
      Open the session list
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
      {slow && <SetupSlow dashboardUrl={dashboardUrl} onTryAgain={onTryAgain} />}
    </Box>
  );
}

export function SignedInAccount({
  account,
  orgs,
  email,
  orgSwitch,
  pickerDisabled,
  onPickOrg,
  onLogOut,
}: {
  account: CloudAccount;
  orgs: OrgOption[];
  email: string | null;
  orgSwitch: OrgSwitch;
  /** True while a recording runs, so the organization cannot change under it. */
  pickerDisabled: boolean;
  onPickOrg: (org: OrgOption) => void;
  onLogOut: () => void;
}) {
  return (
    <Column>
      {email !== null && (
        <Box>
          <Text fontSize="12px" color="brand.muted">
            Signed in as
          </Text>
          <Text fontSize="16px">{email}</Text>
        </Box>
      )}
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
      <Button variant="outline" borderColor="brand.line" onClick={onLogOut}>
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
