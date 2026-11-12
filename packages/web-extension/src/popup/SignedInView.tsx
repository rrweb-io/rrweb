import { Flex, Link, Text } from '@chakra-ui/react';
import { FiArrowUpRight } from 'react-icons/fi';
import { RecorderStatus, type CloudAccount } from '~/types';
import { OrgPicker, type OrgOption, type OrgSwitch } from '~/cloud/OrgPicker';
import {
  Logo,
  Note,
  OfflineSessionsButton,
  PopupFrame,
  FailedUploads,
  RecordButton,
  RecorderError,
  RecordingControls,
  type RecorderControls,
} from './PopupParts';
import { recordingNote } from './account';

export function SignedInView({
  account,
  orgs,
  email,
  recorder,
  orgSwitch,
  dashboardUrl,
  onPickOrg,
  onLogOut,
  onOpenSessions,
}: {
  account: CloudAccount;
  orgs: OrgOption[];
  email: string | null;
  recorder: RecorderControls;
  orgSwitch: OrgSwitch;
  dashboardUrl: string;
  onPickOrg: (org: OrgOption) => void;
  onLogOut: () => void;
  onOpenSessions: () => void;
}) {
  return (
    <PopupFrame>
      <Flex align="center" justify="space-between" gap="12px" mb="20px">
        <Logo />
        <OrgPicker
          account={account}
          orgs={orgs}
          disabled={
            orgSwitch.name === 'switching' ||
            recorder.status !== RecorderStatus.IDLE
          }
          onPick={onPickOrg}
        />
      </Flex>
      {orgSwitch.name === 'failed' && (
        <Text color="brand.danger" fontSize="13px" mb="12px" role="alert">
          Could not switch organization. Try again.
        </Text>
      )}
      <RecordingControls recorder={recorder} />
      <RecordButton
        recorder={recorder}
        idleLabel="Start recording"
        startAs={{
          mode: 'cloud',
          userId: account.userId,
          orgId: account.orgId,
        }}
        tall
        disabled={orgSwitch.name === 'switching'}
        autoFocus
      />
      <Note>
        {/* An offline recording started before sign-in keeps its sink. */}
        {recorder.active === 'offline'
          ? recordingNote(recorder.active)
          : 'Uploads to rrweb. Inputs are masked.'}
      </Note>
      <RecorderError recorder={recorder} />
      <FailedUploads
        uploads={recorder.failedUploads.filter(
          (u) => u.userId === account.userId,
        )}
        recorder={recorder}
      />
      <Flex
        justify="center"
        align="center"
        gap="16px"
        fontSize="13px"
        mt="12px"
      >
        <Link href={dashboardUrl} isExternal>
          Cloud dashboard{' '}
          <FiArrowUpRight aria-hidden="true" style={{ display: 'inline' }} />
        </Link>
        <OfflineSessionsButton onClick={onOpenSessions} />
      </Flex>
      <Flex
        justify="space-between"
        align="center"
        gap="12px"
        fontSize="12px"
        color="brand.muted"
        mt="16px"
      >
        {email !== null && (
          <Text noOfLines={1} title={email}>
            {email}
          </Text>
        )}
        <Link
          as="button"
          onClick={onLogOut}
          fontSize="12px"
          flexShrink={0}
          ml="auto"
        >
          Log out
        </Link>
      </Flex>
    </PopupFrame>
  );
}
