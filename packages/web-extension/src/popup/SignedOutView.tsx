import { Button, Flex, Link, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import type { Session } from '~/types';
import {
  Logo,
  Note,
  PopupFrame,
  RecordButton,
  RecorderError,
  RecordingControls,
  type RecorderControls,
} from './PopupParts';
import { recordingNote, shownMode } from './account';

/**
 * Firefox has no sign-in, so only offline recording is offered there.
 * `modeSwitch` is passed in, so the Firefox build holds no switch code.
 */
export type CloudOffer =
  | { name: 'unavailable' }
  | {
      name: 'available';
      modeSwitch: ReactNode;
      onSignUp: () => void;
      onLogIn: () => void;
    };

export function SignedOutView({
  cloud,
  recorder,
  newSession,
  onOpenSessions,
  sessionUrl,
}: {
  cloud: CloudOffer;
  recorder: RecorderControls;
  newSession: Session | null;
  onOpenSessions: () => void;
  sessionUrl: (session: Session) => string;
}) {
  // Offline, unless a cloud recording from before log out is still stopping.
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
      {cloud.name === 'available' && cloud.modeSwitch}
      <Flex direction="column" mt={cloud.name === 'available' ? '12px' : 0}>
        <RecordingControls recorder={recorder} />
        <RecordButton
          recorder={recorder}
          idleLabel="Record offline"
          startAs={{ mode: 'offline' }}
          autoFocus
        />
      </Flex>
      <Note>{recordingNote(mode, { name: 'signed-out' })}</Note>
      <RecorderError recorder={recorder} />
      {newSession && (
        <Text fontSize="13px" mt="12px">
          <Text as="b">New session: </Text>
          <Link href={sessionUrl(newSession)} isExternal>
            {newSession.name}
          </Link>
        </Text>
      )}
      {cloud.name === 'available' ? (
        <>
          <Button variant="signup" w="100%" mt="16px" onClick={cloud.onSignUp}>
            Sign up free
          </Button>
          <Link
            as="button"
            onClick={cloud.onLogIn}
            alignSelf="center"
            fontSize="13px"
            mt="12px"
          >
            I already have an account · Log in
          </Link>
        </>
      ) : (
        <Link
          as="button"
          onClick={onOpenSessions}
          alignSelf="center"
          fontSize="13px"
          mt="14px"
        >
          Offline sessions
        </Link>
      )}
    </PopupFrame>
  );
}
