/// <reference types="chrome"/>
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Replayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
import { Box, Heading, Link } from '@chakra-ui/react';
import { getEvents, getSession } from '~/utils/storage';

export default function Player() {
  const playerElRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Replayer | null>(null);
  const { sessionId } = useParams();
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then((session) => {
        setSessionName(session.name);
      })
      .catch((err) => {
        console.error(err);
      });
    getEvents(sessionId)
      .then((events) => {
        if (!playerElRef.current) return;
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
      <Heading
        as="h1"
        fontSize="24px"
        fontWeight={600}
        mt="8px"
        mb="24px"
        wordBreak="break-word"
      >
        {sessionName}
      </Heading>
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
