import { Flex, Link, Text } from '@chakra-ui/react';
import { RecorderStatus, type CloudAccount, type RecordingKind } from '~/types';
import {
  Logo,
  Note,
  PopupFrame,
  RecordButton,
  RecorderError,
  RecordingControls,
  type RecorderControls,
} from './PopupParts';
import { ModeSwitch } from './ModeSwitch';
import { recordingNote, shownMode, type StoredMode } from './account';

/** The popup once the dashboard has connected an organization. */
export function ConnectedView({
  account,
  recorder,
  dashboardUrl,
  storedMode,
  onChooseMode,
  onChangeOrg,
  onDisconnect,
  onOpenSessions,
}: {
  account: CloudAccount;
  recorder: RecorderControls;
  dashboardUrl: string;
  storedMode: StoredMode;
  onChooseMode: (mode: RecordingKind) => void;
  onChangeOrg: () => void;
  onDisconnect: () => void;
  onOpenSessions: () => void;
}) {
  // An offline recording started before connecting keeps showing as offline.
  const mode = shownMode({ active: recorder.active, stored: storedMode });
  const idle = recorder.status === RecorderStatus.IDLE;
  return (
    <PopupFrame>
      <Flex align="center" justify="space-between" gap="12px" mb="20px">
        <Logo />
        <Text
          bg="brand.field"
          border="1px solid"
          borderColor="brand.line"
          borderRadius="999px"
          fontSize="13px"
          maxW="170px"
          px="10px"
          py="4px"
          noOfLines={1}
          title={account.orgName}
        >
          {account.orgName}
        </Text>
      </Flex>
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
          startAs={mode === 'cloud' ? { mode, orgId: account.orgId } : { mode }}
          autoFocus
        />
      </Flex>
      <Note>
        {recordingNote(mode, {
          name: 'connected',
          // A running recording uploads where it started, even if the
          // dashboard has connected another organization since.
          orgName:
            recorder.uploadsTo.name === 'organization'
              ? recorder.uploadsTo.orgName
              : account.orgName,
        })}
      </Note>
      <RecorderError recorder={recorder} />
      <Flex
        justify="space-between"
        align="center"
        gap="12px"
        fontSize="12px"
        mt="16px"
        pt="12px"
        borderTop="1px solid"
        borderColor="brand.rule"
      >
        <Link as="button" onClick={onChangeOrg} fontSize="12px">
          Change organization
        </Link>
        <Link as="button" onClick={onDisconnect} fontSize="12px">
          Disconnect
        </Link>
      </Flex>
    </PopupFrame>
  );
}
