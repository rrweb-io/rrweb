import { useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Image,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { FiList, FiPause, FiPlay } from 'react-icons/fi';
import { RecorderStatus, type FailedUpload, type StartRequest } from '~/types';
import { Timer } from './Timer';
import { recordButtonLook, type ActiveRecording } from './account';

export type RecorderControls = {
  status: RecorderStatus;
  active: ActiveRecording;
  startTime: number | null;
  errorMessage: string | null;
  /** Start recording to `startAs`, or stop the running recording. */
  toggle: (startAs: StartRequest) => void;
  pause: () => void;
  resume: () => void;
  failedUploads: FailedUpload[];
  retryUpload: (recordingId: string) => void;
  discardUpload: (recordingId: string) => void;
};

export function PopupFrame({ children }: { children: ReactNode }) {
  return (
    <Flex direction="column" w="340px" p="22px" bg="brand.bg" color="white">
      {children}
    </Flex>
  );
}

/** Shown while Clerk or the stored account is loading, or while signing out. */
export function LoadingView({ label = 'Loading' }: { label?: string }) {
  return (
    <PopupFrame>
      <Flex align="center" justify="space-between" minH="24px">
        <Logo />
        <Spinner size="sm" color="brand.muted" label={label} />
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

/**
 * Opens the Offline Stored Sessions page. A labelled outline button, the
 * same in the signed-out and signed-in views, so it is always easy to find.
 */
export function OfflineSessionsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="sm"
      h="32px"
      px="12px"
      fontSize="13px"
      fontWeight={600}
      color="white"
      bg="transparent"
      border="1px solid"
      borderColor="whiteAlpha.400"
      borderRadius="0.625rem"
      _hover={{ bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.600' }}
      _active={{ bg: 'whiteAlpha.200' }}
      leftIcon={<FiList aria-hidden="true" />}
      flexShrink={0}
    >
      Offline sessions
    </Button>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="12px" color="brand.muted" textAlign="center" mt="8px">
      {children}
    </Text>
  );
}

/**
 * `startAs` is the destination this button shows. 'cannot-start' keeps the
 * button usable only to stop a recording that is already running.
 */
export function RecordButton({
  recorder,
  idleLabel,
  startAs,
  tall = false,
  disabled = false,
  autoFocus = false,
}: {
  recorder: RecorderControls;
  idleLabel: string;
  startAs: StartRequest | 'cannot-start';
  tall?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const cannotStart =
    startAs === 'cannot-start' && recorder.status === RecorderStatus.IDLE;
  const look = recordButtonLook(recorder.status, disabled || cannotStart);
  const press = () => {
    // a stop needs no destination; toggle ignores it while recording
    recorder.toggle(startAs === 'cannot-start' ? { mode: 'offline' } : startAs);
  };
  const mark = tall ? '14px' : '10px';
  return (
    <Button
      variant="record"
      w="100%"
      h={tall ? '66px' : undefined}
      fontSize={tall ? '16px' : undefined}
      leftIcon={
        <Box
          w={mark}
          h={mark}
          bg="white"
          borderRadius={look.mark === 'dot' ? '50%' : '2px'}
          aria-hidden="true"
        />
      }
      // Busy keeps the idle look under the cursor; `toggle` ignores the click.
      onClick={look.press === 'enabled' ? press : undefined}
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
  if (
    recorder.status === RecorderStatus.IDLE ||
    recorder.status === RecorderStatus.STARTING ||
    recorder.startTime === null
  )
    return null;
  const recording = recorder.status === RecorderStatus.RECORDING;
  return (
    <Flex align="center" justify="center" gap="12px" mb="16px">
      <Timer startTime={recorder.startTime} ticking={recording} />
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

/**
 * Cloud recordings whose upload failed: their events are kept in this
 * browser until "Retry upload" delivers them or the person discards them.
 * The caller passes only the signed-in user's uploads.
 */
export function FailedUploads({
  uploads,
  recorder,
}: {
  uploads: FailedUpload[];
  recorder: RecorderControls;
}) {
  const shown = uploads.filter((u) => u.state.name !== 'delivered');
  if (shown.length === 0) return null;
  return (
    <Flex direction="column" gap="10px" mt="12px">
      {shown.map((upload) => (
        <FailedUploadItem
          key={upload.recordingId}
          upload={upload}
          recorder={recorder}
        />
      ))}
    </Flex>
  );
}

/** showing: the upload and its actions; confirming-discard: asking first. */
type ItemView = 'showing' | 'confirming-discard';

function FailedUploadItem({
  upload,
  recorder,
}: {
  upload: FailedUpload;
  recorder: RecorderControls;
}) {
  const [view, setView] = useState<ItemView>('showing');
  const retrying = upload.state.name === 'retrying';
  const outline = {
    size: 'sm',
    flex: '1',
    variant: 'outline',
    color: 'white',
    borderColor: 'brand.line',
    _hover: { bg: 'brand.field' },
  } as const;
  return (
    <Box role="alert">
      <Text color="brand.danger" fontSize="13px" noOfLines={2}>
        Upload failed: {upload.title}
      </Text>
      {upload.state.name === 'retry-failed' && (
        <Text color="brand.danger" fontSize="12px">
          Retry failed: {upload.state.errorMessage}
        </Text>
      )}
      {view === 'confirming-discard' ? (
        <>
          <Text fontSize="12px" color="brand.muted" mb="6px">
            Discard this recording? It cannot be recovered.
          </Text>
          <Flex gap="8px">
            <Button
              {...outline}
              onClick={() => recorder.discardUpload(upload.recordingId)}
            >
              Discard recording
            </Button>
            <Button {...outline} onClick={() => setView('showing')}>
              Keep
            </Button>
          </Flex>
        </>
      ) : (
        <>
          <Text fontSize="12px" color="brand.muted" mb="6px">
            The recording is kept in this browser until it uploads.
          </Text>
          <Flex gap="8px">
            <Button
              {...outline}
              isDisabled={retrying}
              onClick={() => recorder.retryUpload(upload.recordingId)}
            >
              {retrying ? 'Retrying upload' : 'Retry upload'}
            </Button>
            <Button
              {...outline}
              isDisabled={retrying}
              onClick={() => setView('confirming-discard')}
            >
              Discard
            </Button>
          </Flex>
        </>
      )}
    </Box>
  );
}

export function RecorderError({ recorder }: { recorder: RecorderControls }) {
  if (recorder.errorMessage === null) return null;
  return (
    <Text color="brand.danger" fontSize="13px" mt="12px" role="alert">
      {recorder.errorMessage}
      <br />
      Maybe refresh your current tab.
    </Text>
  );
}
