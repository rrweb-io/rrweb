import { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import {
  Box,
  Flex,
  IconButton,
  Link,
  Spacer,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FiSettings, FiList, FiPause, FiPlay } from 'react-icons/fi';
import Channel from '~/utils/channel';
import { LocalDataKey, RecorderStatus, EventName } from '~/types';
import type { LocalData, Session } from '~/types';

import { CircleButton } from '~/components/CircleButton';
import { Timer } from './Timer';
const RECORD_BUTTON_SIZE = 3;

const channel = new Channel();

export function App() {
  const [status, setStatus] = useState<RecorderStatus>(RecorderStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [newSession, setNewSession] = useState<Session | null>(null);

  useEffect(() => {
    const parseStatusData = (data: LocalData[LocalDataKey.recorderStatus]) => {
      const { status, startTimestamp, pausedTimestamp } = data;
      setStatus(status);
      if (startTimestamp && pausedTimestamp)
        setStartTime(Date.now() - pausedTimestamp + startTimestamp);
      else if (startTimestamp) setStartTime(startTimestamp);
    };
    void Browser.storage.local.get(LocalDataKey.recorderStatus).then((data) => {
      if (!data || !data[LocalDataKey.recorderStatus]) return;
      parseStatusData((data as LocalData)[LocalDataKey.recorderStatus]);
    });
    void Browser.storage.local.onChanged.addListener((changes) => {
      if (!changes[LocalDataKey.recorderStatus]) return;
      const data = changes[LocalDataKey.recorderStatus]
        .newValue as LocalData[LocalDataKey.recorderStatus];
      parseStatusData(data);
      if (data.errorMessage) setErrorMessage(data.errorMessage);
    });
    channel.on(EventName.SessionUpdated, (data) => {
      setNewSession((data as { session: Session }).session);
    });
  }, []);

  return (
    <Flex direction="column" w={300} padding="5%">
      <Flex>
        <Text fontSize="md" fontWeight="bold">
          RRWeb Recorder
        </Text>
        <Spacer />
        <Stack direction="row">
          <IconButton
            onClick={() => {
              void Browser.tabs.create({ url: '/pages/index.html#/' });
            }}
            size="xs"
            icon={<FiList />}
            aria-label={'Session List'}
            title="Session List"
          ></IconButton>
          <IconButton
            onClick={() => {
              void Browser.runtime.openOptionsPage();
            }}
            size="xs"
            icon={<FiSettings />}
            aria-label={'Settings button'}
            title="Settings"
          ></IconButton>
        </Stack>
      </Flex>
      {status !== RecorderStatus.IDLE && startTime && (
        <Timer
          startTime={startTime}
          ticking={status === RecorderStatus.RECORDING}
        />
      )}
      <Flex justify="center" gap="10" mt="5" mb="5">
        {
          <CircleButton
            diameter={RECORD_BUTTON_SIZE}
            title={
              status === RecorderStatus.IDLE
                ? 'Start Recording'
                : 'Stop Recording'
            }
            onClick={() => {
              if (status === RecorderStatus.IDLE)
                void channel.emit(EventName.StartButtonClicked, {});
              else void channel.emit(EventName.StopButtonClicked, {});
            }}
          >
            <Box
              w={`${RECORD_BUTTON_SIZE}rem`}
              h={`${RECORD_BUTTON_SIZE}rem`}
              borderRadius={status === RecorderStatus.IDLE ? 9999 : 6}
              margin="0"
              bgColor="red.500"
            />
          </CircleButton>
        }
        {status !== RecorderStatus.IDLE && (
          <CircleButton
            diameter={RECORD_BUTTON_SIZE}
            title={
              status === RecorderStatus.RECORDING
                ? 'Pause Recording'
                : 'Resume Recording'
            }
            onClick={() => {
              if (status === RecorderStatus.RECORDING) {
                void channel.emit(EventName.PauseButtonClicked, {});
              } else {
                void channel.emit(EventName.ResumeButtonClicked, {});
              }
            }}
          >
            <Box
              w={`${RECORD_BUTTON_SIZE}rem`}
              h={`${RECORD_BUTTON_SIZE}rem`}
              borderRadius={9999}
              margin="0"
              color="gray.600"
            >
              {[RecorderStatus.PAUSED, RecorderStatus.PausedSwitch].includes(
                status,
              ) && (
                <FiPlay
                  style={{
                    paddingLeft: '0.5rem',
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
              {status === RecorderStatus.RECORDING && (
                <FiPause
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
            </Box>
          </CircleButton>
        )}
      </Flex>
      {newSession && (
        <Text>
          <Text as="b">New Session: </Text>
          <Link
            href={Browser.runtime.getURL(
              `pages/index.html#/session/${newSession.id}`,
            )}
            isExternal
          >
            {newSession.name}
          </Link>
        </Text>
      )}
      {errorMessage !== '' && (
        <Text color="red.500" fontSize="md">
          {errorMessage}
          <br />
          Maybe refresh your current tab.
        </Text>
      )}
    </Flex>
  );
}
