import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  List,
  ListItem,
  Text,
} from '@chakra-ui/react';
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
import { recordingNote, type SignedOutPanel } from './account';

/**
 * Firefox has no sign-in, so only offline recording is offered there.
 * `modeSwitch` is passed in, so the Firefox build holds no switch code.
 */
export type CloudOffer =
  | { name: 'unavailable' }
  | {
      name: 'available';
      modeSwitch: ReactNode;
      panel: SignedOutPanel;
      onSignUp: () => void;
      onLogIn: () => void;
    };

const PITCH_POINTS = [
  'Share any recording with a link',
  'AI narration explains what happened in each session',
];

function CloudPitch() {
  return (
    <Box mt="16px">
      <Heading as="h2" fontSize="16px" mb="8px">
        Save recordings to rrweb Cloud
      </Heading>
      <List mb="14px">
        {PITCH_POINTS.map((point) => (
          <ListItem
            key={point}
            fontSize="13px"
            py="5px"
            pl="18px"
            position="relative"
            _before={{
              content: '""',
              position: 'absolute',
              left: '2px',
              top: '11px',
              w: '6px',
              h: '6px',
              borderRadius: '50%',
              bg: '#EEC202',
            }}
          >
            {point}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

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
  const pitching = cloud.name === 'available' && cloud.panel === 'cloud-pitch';
  return (
    <PopupFrame>
      <Flex align="center" mb="20px">
        <Logo />
      </Flex>
      {cloud.name === 'available' && cloud.modeSwitch}
      {pitching ? (
        <CloudPitch />
      ) : (
        <>
          <Flex direction="column" mt={cloud.name === 'available' ? '12px' : 0}>
            <RecordingControls recorder={recorder} />
            <RecordButton
              recorder={recorder}
              idleLabel="Record offline"
              startAs={{ mode: 'offline' }}
              autoFocus
            />
          </Flex>
          <Note>{recordingNote('offline', { name: 'signed-out' })}</Note>
          <RecorderError recorder={recorder} />
          {newSession && (
            <Text fontSize="13px" mt="12px">
              <Text as="b">New session: </Text>
              <Link href={sessionUrl(newSession)} isExternal>
                {newSession.name}
              </Link>
            </Text>
          )}
        </>
      )}
      {cloud.name === 'available' ? (
        <>
          <Button
            variant="signup"
            w="100%"
            mt={pitching ? '4px' : '16px'}
            onClick={cloud.onSignUp}
          >
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
