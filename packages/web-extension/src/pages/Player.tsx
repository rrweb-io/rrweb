import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Browser from 'webextension-polyfill';
import type rrwebPlayer from 'rrweb-player';
import { RRwebPlayerOptions } from 'rrweb-player';
import { LocalData } from '../types';
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Center,
} from '@chakra-ui/react';

export default function Player() {
  const playerElRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<rrwebPlayer | null>(null);
  const { sessionId } = useParams();
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    void Browser.storage.local.get().then((data) => {
      if (!playerElRef.current || !sessionId) return;
      const localData = data as LocalData;
      const session = localData.sessions[sessionId];
      if (!session) return;
      setSessionName(session.name);

      eval(localData.player_code + 'window.rrwebPlayer = rrwebPlayer;');

      const Player = (
        window as Window &
          typeof globalThis & {
            rrwebPlayer: new (options: RRwebPlayerOptions) => rrwebPlayer;
          }
      ).rrwebPlayer;
      if (!Player) return;

      const linkEl = document.createElement('link');
      linkEl.href =
        'https://cdn.jsdelivr.net/npm/rrweb-player@1.0.0-alpha.1/dist/style.css';
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
      playerRef.current = new Player({
        target: playerElRef.current as HTMLElement,
        props: {
          events: session.events,
          autoPlay: true,
        },
      });
    });
  }, []);

  return (
    <>
      <Breadcrumb mb={5} fontSize="md">
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Sessions</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink>{sessionName}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      <Center>
        <Box ref={playerElRef}></Box>
      </Center>
    </>
  );
}
