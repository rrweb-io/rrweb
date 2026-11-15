/// <reference types="chrome"/>
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Replayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { Box, Flex, Heading, Link } from '@chakra-ui/react';
import { getEvents, getSession } from '~/utils/storage';
import type { RecordingKind } from '~/types';
import { recordingKindOf } from '~/utils';
import { ShareAction } from './ShareAction';

export default function Player() {
  const playerElRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Replayer | null>(null);
  const { sessionId } = useParams();
  const [sessionName, setSessionName] = useState('');
  const [recordedAs, setRecordedAs] = useState<RecordingKind>('offline');

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((session) => {
        setSessionName(session.name);
        setRecordedAs(recordingKindOf(session));
      })
      .catch((err) => {
        console.error(err);
      });
    getEvents(sessionId)
      .then((events) => {
        if (!events || !playerElRef.current) return;
        if (playerRef.current) return;

        playerRef.current = new Replayer({
          target: playerElRef.current as HTMLElement,
          props: {
            events,
            autoPlay: true,
          },
        });
      })
      .catch((err) => {
        console.error(err);
      });
    return () => {
      // eslint-disable-next-line
      playerRef.current?.pause();
      // eslint-disable-next-line
      playerRef.current?.$destroy();
    };
  }, [sessionId]);

  return (
    <>
      <Link href="#/" fontSize="14px">
        All sessions
      </Link>
      <Flex
        justify="space-between"
        align="flex-start"
        gap="16px"
        mt="8px"
        mb="24px"
      >
        <Heading
          as="h1"
          fontSize="24px"
          fontWeight={600}
          minW={0}
          noOfLines={1}
          wordBreak="break-all"
          title={sessionName}
        >
          {sessionName}
        </Heading>
        {sessionId && (
          <Box flexShrink={0}>
            <ShareAction sessionId={sessionId} recordedAs={recordedAs} />
          </Box>
        )}
      </Flex>
      <Box
        bg="brand.surface"
        border="1px solid"
        borderColor="brand.rule"
        borderRadius="12px"
        p="16px"
        overflowX="auto"
      >
        <Box ref={playerElRef} w="fit-content" mx="auto"></Box>
      </Box>
    </>
  );
}
