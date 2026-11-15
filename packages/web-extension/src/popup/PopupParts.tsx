import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { FiPause, FiPlay } from 'react-icons/fi';
import {
  isRunning,
  type LastError,
  type RecorderStatus,
  type StartRequest,
} from '~/types';
import { Timer } from './Timer';
import { recordButtonLook } from './account';

export type RecorderControls = {
  status: RecorderStatus;
  /** The last failure reported while this popup is open. */
  error: LastError;
  /** Start recording to `startAs`, or stop the running recording. */
  toggle: (startAs: StartRequest) => void;
  pause: () => void;
  resume: () => void;
};

export function PopupFrame({ children }: { children: ReactNode }) {
  return (
    <Flex direction="column" w="340px" p="22px" bg="brand.bg" color="white">
      {children}
    </Flex>
  );
}

/** Shown while the connected account or the remembered mode is loading. */
export function LoadingView() {
  return (
    <PopupFrame>
      <Flex align="center" justify="space-between" minH="24px">
        <Logo />
        <Spinner size="sm" color="brand.muted" label="Loading" />
      </Flex>
    </PopupFrame>
  );
}

/**
 * The rrweb homepage header logo: the mark in a glass pill, then the wordmark.
 * On the full pages it is the dashboard's size, and the wordmark hides on
 * narrow windows.
 */
export function Logo({ size = 'popup' }: { size?: 'popup' | 'page' }) {
  const page = size === 'page';
  return (
    <Flex align="center" gap="10px" flexShrink={0}>
      <Flex
        as="span"
        align="center"
        px="10px"
        py={page ? '6px' : '7px'}
        borderRadius="14px"
        bg="rgba(255,255,255,0.12)"
        border="1px solid rgba(255,255,255,0.20)"
        boxShadow="inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.15)"
      >
        <Image src="/rrweb-mark.svg" alt="rrweb" h="20px" w="auto" />
      </Flex>
      <Image
        src="/rrweb-wordmark.svg"
        alt=""
        aria-hidden="true"
        h={page ? '28px' : '22px'}
        w="auto"
        display={page ? { base: 'none', sm: 'block' } : undefined}
      />
    </Flex>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="12px" color="brand.muted" textAlign="center" mt="8px">
      {children}
    </Text>
  );
}

/** `startAs` is the destination this button shows; a stop needs none. */
export function RecordButton({
  recorder,
  idleLabel,
  startAs,
  disabled = false,
  autoFocus = false,
}: {
  recorder: RecorderControls;
  idleLabel: string;
  startAs: StartRequest;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const look = recordButtonLook(recorder.status.state, disabled);
  return (
    <Button
      variant="record"
      w="100%"
      h="66px"
      fontSize="16px"
      leftIcon={
        <Box
          w="14px"
          h="14px"
          bg="white"
          borderRadius={look.mark === 'dot' ? '50%' : '2px'}
          aria-hidden="true"
        />
      }
      // Busy keeps the idle look under the cursor; `toggle` ignores the click.
      // While recording, `toggle` stops and ignores `startAs`.
      onClick={
        look.press === 'enabled' ? () => recorder.toggle(startAs) : undefined
      }
      aria-busy={look.press === 'busy'}
      isDisabled={look.press === 'disabled'}
      autoFocus={autoFocus}
    >
      {look.label === 'idle' ? idleLabel : 'Stop recording'}
    </Button>
  );
}

/** Timer and pause/resume, shown only while a recording is running or paused. */
export function RecordingControls({
  recorder,
}: {
  recorder: RecorderControls;
}) {
  const { status } = recorder;
  if (!isRunning(status)) return null;
  const recording = status.state === 'recording';
  // While paused, the timer shows the time recorded until the pause.
  const startTime = recording
    ? status.startTimestamp
    : Date.now() - status.pausedTimestamp + status.startTimestamp;
  return (
    <Flex align="center" justify="center" gap="12px" mb="16px">
      <Timer startTime={startTime} ticking={recording} />
      <IconButton
        aria-label={recording ? 'Pause recording' : 'Resume recording'}
        title={recording ? 'Pause recording' : 'Resume recording'}
        icon={recording ? <FiPause /> : <FiPlay />}
        onClick={recording ? recorder.pause : recorder.resume}
        variant="outline"
        borderColor="brand.line"
        color="white"
        _hover={{ bg: 'brand.field' }}
        _active={{ bg: 'brand.line' }}
      />
    </Flex>
  );
}

export function RecorderError({ recorder }: { recorder: RecorderControls }) {
  if (recorder.error.name === 'none') return null;
  return (
    <Text color="brand.danger" fontSize="13px" mt="12px" role="alert">
      {recorder.error.message}
    </Text>
  );
}
