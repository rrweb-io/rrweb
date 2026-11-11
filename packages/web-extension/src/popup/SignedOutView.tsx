import { Button, Flex, IconButton, Link, Stack, Text } from '@chakra-ui/react';
import { FiList, FiSettings } from 'react-icons/fi';
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
import { recordingNote } from './account';

/** Firefox has no sign-in, so only offline recording is offered there. */
export type CloudOffer =
  | { name: 'unavailable' }
  | { name: 'available'; onSignUp: () => void; onLogIn: () => void };

export function SignedOutView({
  cloud,
  recorder,
  newSession,
  onOpenSessions,
  onOpenSettings,
  sessionUrl,
}: {
  cloud: CloudOffer;
  recorder: RecorderControls;
  newSession: Session | null;
  onOpenSessions: () => void;
  onOpenSettings: () => void;
  sessionUrl: (session: Session) => string;
}) {
  return (
    <PopupFrame>
      <Flex align="center" justify="space-between" mb="20px">
        <Logo />
        <Stack direction="row" spacing="6px">
          <IconButton
            onClick={onOpenSessions}
            size="xs"
            variant="ghost"
            color="white"
            _hover={{ bg: 'whiteAlpha.200' }}
            _active={{ bg: 'whiteAlpha.300' }}
            icon={<FiList />}
            aria-label="Session list"
            title="Session list"
          />
          <IconButton
            onClick={onOpenSettings}
            size="xs"
            variant="ghost"
            color="white"
            _hover={{ bg: 'whiteAlpha.200' }}
            _active={{ bg: 'whiteAlpha.300' }}
            icon={<FiSettings />}
            aria-label="Account"
            title="Account"
          />
        </Stack>
      </Flex>
      {cloud.name === 'available' && (
        <>
          <Text fontSize="14px" lineHeight="1.55" color="brand.pitch" mb="20px">
            Save every recording to rrweb and share it with a link. Free to
            start.
          </Text>
          <Button variant="signup" w="100%" onClick={cloud.onSignUp} autoFocus>
            Sign up free
          </Button>
          <Link
            as="button"
            onClick={cloud.onLogIn}
            alignSelf="center"
            fontSize="13px"
            mt="14px"
          >
            I already have an account · Log in
          </Link>
          <Flex
            align="center"
            gap="10px"
            color="brand.muted"
            fontSize="12px"
            my="20px"
            role="separator"
            aria-label="or"
          >
            <Flex flex="1" h="1px" bg="brand.line" />
            <Text as="span">or</Text>
            <Flex flex="1" h="1px" bg="brand.line" />
          </Flex>
        </>
      )}
      <RecordingControls recorder={recorder} />
      <RecordButton
        recorder={recorder}
        idleLabel="Record offline"
        autoFocus={cloud.name === 'unavailable'}
      />
      <Note>{recordingNote(recorder.active)}</Note>
      <RecorderError recorder={recorder} />
      {newSession && (
        <Text fontSize="13px" mt="12px">
          <Text as="b">New session: </Text>
          <Link href={sessionUrl(newSession)} isExternal>
            {newSession.name}
          </Link>
        </Text>
      )}
    </PopupFrame>
  );
}
