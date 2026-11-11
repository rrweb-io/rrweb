import { Button, Flex, Link, Text } from '@chakra-ui/react';
import { FiArrowUpRight } from 'react-icons/fi';
import {
  Logo,
  PopupFrame,
  RecordButton,
  RecorderError,
  RecordingControls,
  type RecorderControls,
} from './PopupParts';
import { RecorderStatus } from '~/types';

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
        Open dashboard{' '}
        <FiArrowUpRight aria-hidden="true" style={{ display: 'inline' }} />
      </Link>
    </>
  );
}

/**
 * validating: a stored account is being checked against the signed-in user.
 * Recording cannot start until it is checked or set up again.
 */
export type SetupStage = 'validating' | 'setting-up' | 'setup-slow';

export function SettingUpView({
  stage,
  recorder,
  dashboardUrl,
  onTryAgain,
}: {
  stage: SetupStage;
  recorder: RecorderControls;
  dashboardUrl: string;
  onTryAgain: () => void;
}) {
  return (
    <PopupFrame>
      <Flex align="center" mb="20px">
        <Logo />
      </Flex>
      <SettingUpText
        label={
          stage === 'validating'
            ? 'Checking your account…'
            : 'Setting up your account…'
        }
      />
      <RecordingControls recorder={recorder} />
      {/* Stays usable as a stop button if a recording is already running. */}
      <RecordButton
        recorder={recorder}
        idleLabel="Start recording"
        tall
        disabled={recorder.status === RecorderStatus.IDLE}
      />
      <RecorderError recorder={recorder} />
      {stage === 'setup-slow' && <SetupSlow dashboardUrl={dashboardUrl} onTryAgain={onTryAgain} />}
    </PopupFrame>
  );
}
