import { Flex, Link, Text } from '@chakra-ui/react';
import { FiArrowUpRight } from 'react-icons/fi';
import { RecorderStatus, type CloudAccount } from '~/types';
import { OrgPicker, type OrgOption, type OrgSwitch } from '~/cloud/OrgPicker';
import {
  Logo,
  Note,
  PopupFrame,
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
}: {
  account: CloudAccount;
  orgs: OrgOption[];
  email: string | null;
  recorder: RecorderControls;
  orgSwitch: OrgSwitch;
  dashboardUrl: string;
  onPickOrg: (org: OrgOption) => void;
  onLogOut: () => void;
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
      <Link
        href={dashboardUrl}
        isExternal
        alignSelf="center"
        fontSize="13px"
        mt="12px"
      >
        Open dashboard{' '}
        <FiArrowUpRight aria-hidden="true" style={{ display: 'inline' }} />
      </Link>
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
