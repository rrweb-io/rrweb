import { Flex, Link, Text } from '@chakra-ui/react';
import { RecorderStatus, type CloudAccount, type RecordingKind } from '~/types';
import { OrgSwitchNotice } from '~/cloud/OrgSwitchNotice';
import { OrgPicker, type OrgOption, type OrgSwitch } from '~/cloud/OrgPicker';
import {
  Logo,
  Note,
  PopupFrame,
  FailedUploads,
  RecordButton,
  RecorderError,
  RecordingControls,
  type RecorderControls,
} from './PopupParts';
import { ModeSwitch } from './ModeSwitch';
import { recordingNote, shownMode, type StoredMode } from './account';

export function SignedInView({
  account,
  orgs,
  email,
  recorder,
  orgSwitch,
  dashboardUrl,
  storedMode,
  onChooseMode,
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
  storedMode: StoredMode;
  onChooseMode: (mode: RecordingKind) => void;
  onPickOrg: (org: OrgOption) => void;
  onLogOut: () => void;
  onOpenSessions: () => void;
}) {
  // An offline recording started before sign-in keeps showing as offline.
  const mode = shownMode({
    active: recorder.active,
    cloud: 'ready',
    stored: storedMode,
  });
  const idle = recorder.status === RecorderStatus.IDLE;
  return (
    <PopupFrame>
      <Flex align="center" justify="space-between" gap="12px" mb="20px">
        <Logo />
        <OrgPicker
          account={account}
          orgs={orgs}
          disabled={orgSwitch.name === 'switching' || !idle}
          onPick={onPickOrg}
        />
      </Flex>
      <OrgSwitchNotice
        orgSwitch={orgSwitch}
        dashboardUrl={dashboardUrl}
        mb="12px"
      />
      <ModeSwitch
        shown={mode}
        cloud={{ name: 'selectable', dashboardUrl }}
        disabled={!idle}
        onChoose={onChooseMode}
        onOpenSessions={onOpenSessions}
      />
      <Flex direction="column" mt="12px">
        <RecordingControls recorder={recorder} />
        <RecordButton
          recorder={recorder}
          idleLabel={mode === 'cloud' ? 'Start recording' : 'Record offline'}
          startAs={
            mode === 'cloud'
              ? { mode, userId: account.userId, orgId: account.orgId }
              : { mode }
          }
          // Only a cloud start waits for the organization switch.
          disabled={mode === 'cloud' && orgSwitch.name === 'switching'}
          autoFocus
        />
      </Flex>
      <Note>
        {recordingNote(mode, { name: 'signed-in', orgName: account.orgName })}
      </Note>
      <RecorderError recorder={recorder} />
      <FailedUploads
        uploads={recorder.failedUploads.filter(
          (u) => u.userId === account.userId,
        )}
        recorder={recorder}
      />
      <Flex
        justify="space-between"
        align="center"
        gap="12px"
        fontSize="12px"
        color="brand.muted"
        mt="16px"
        pt="12px"
        borderTop="1px solid"
        borderColor="brand.rule"
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
