import { Box, Button, Flex, Link, Text } from '@chakra-ui/react';
import { RecorderStatus } from '~/types';
import { FiArrowUpRight } from 'react-icons/fi';
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
import { recordingNote, shownMode } from './account';

/** The status line shared by the popup and the account page. */
export function SettingUpText({
  label = 'Setting up your account…',
}: {
  label?: string;
}) {
  return (
    <Text fontSize="14px" color="brand.pitch" mb="20px" role="status">
      {label}
    </Text>
  );
}

/** Shown once setup has taken over a minute. */
export function SetupSlow({
  dashboardUrl,
  onTryAgain,
}: {
  dashboardUrl: string;
  onTryAgain: () => void;
}) {
  return (
    <>
      <Text fontSize="13px" color="brand.pitch" mt="16px">
        This is taking longer than usual.
      </Text>
      <Button
        mt="12px"
        w="100%"
        variant="outline"
        borderColor="brand.line"
        color="white"
        _hover={{ bg: 'brand.field' }}
        _active={{ bg: 'brand.line' }}
        onClick={onTryAgain}
        autoFocus
      >
        Try again
      </Button>
      <Link
        href={dashboardUrl}
        isExternal
        alignSelf="center"
        fontSize="13px"
        mt="12px"
      >
        Cloud dashboard{' '}
        <FiArrowUpRight aria-hidden="true" style={{ display: 'inline' }} />
      </Link>
    </>
  );
}

/**
 * validating: a stored account is being checked against the signed-in user.
 * Cloud recording waits until it is checked or set up again; offline
 * recording works throughout.
 */
export type SetupStage = 'validating' | 'setting-up' | 'setup-slow';

export function SettingUpView({
  stage,
  recorder,
  dashboardUrl,
  onTryAgain,
  onOpenSessions,
}: {
  stage: SetupStage;
  recorder: RecorderControls;
  dashboardUrl: string;
  onTryAgain: () => void;
  onOpenSessions: () => void;
}) {
  // Offline, unless a cloud recording is still running.
  const mode = shownMode({
    active: recorder.active,
    cloud: 'not-ready',
    stored: 'not-stored',
  });
  return (
    <PopupFrame>
      <Flex align="center" mb="20px">
        <Logo />
      </Flex>
      <ModeSwitch
        shown={mode}
        cloud={{
          name: 'unavailable',
          hint: stage === 'validating' ? 'checking' : 'setting up',
        }}
        disabled={recorder.status !== RecorderStatus.IDLE}
        onChoose={() => undefined}
        onOpenSessions={onOpenSessions}
      />
      <Box mt="16px">
        <SettingUpText
          label={
            stage === 'validating'
              ? 'Checking your account…'
              : 'Setting up your account…'
          }
        />
      </Box>
      <RecordingControls recorder={recorder} />
      <RecordButton
        recorder={recorder}
        idleLabel="Record offline"
        startAs={{ mode: 'offline' }}
        // Try again takes the focus once setup is slow.
        autoFocus={stage !== 'setup-slow'}
      />
      <Note>{recordingNote(mode, { name: 'setting-up' })}</Note>
      <RecorderError recorder={recorder} />
      {stage === 'setup-slow' && (
        <SetupSlow dashboardUrl={dashboardUrl} onTryAgain={onTryAgain} />
      )}
    </PopupFrame>
  );
}
