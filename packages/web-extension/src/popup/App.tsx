import { useState, useEffect } from 'react';
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
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  ServiceName,
  RecordStartedMessage,
  RecordStoppedMessage,
  Session,
  EventName,
} from '~/types';
import Browser from 'webextension-polyfill';
import { CircleButton } from '~/components/CircleButton';
import { Timer } from './Timer';
import { pauseRecording, resumeRecording } from '~/utils/recording';
import { saveSession } from '~/utils/storage';
const RECORD_BUTTON_SIZE = 3;

const channel = new Channel();

export function App() {
  const [status, setStatus] = useState<RecorderStatus>(RecorderStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [newSession, setNewSession] = useState<Session | null>(null);

  useEffect(() => {
    void Browser.storage.local.get(LocalDataKey.recorderStatus).then((data) => {
      const localData = data as LocalData;
      if (!localData || !localData[LocalDataKey.recorderStatus]) return;
      const { status, startTimestamp, pausedTimestamp } = localData[
        LocalDataKey.recorderStatus
      ];
      setStatus(status);
      if (startTimestamp && pausedTimestamp)
        setStartTime(Date.now() - pausedTimestamp + startTimestamp || 0);
      else if (startTimestamp) setStartTime(startTimestamp);
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
        {[RecorderStatus.IDLE, RecorderStatus.RECORDING].includes(status) && (
          <CircleButton
            diameter={RECORD_BUTTON_SIZE}
            title={
              status === RecorderStatus.IDLE
                ? 'Start Recording'
                : 'Stop Recording'
            }
            onClick={() => {
              if (status === RecorderStatus.RECORDING) {
                // stop recording
                setErrorMessage('');
                void channel.getCurrentTabId().then((tabId) => {
                  if (tabId === -1) return;
                  void channel
                    .requestToTab(tabId, ServiceName.StopRecord, {})
                    .then(async (res: RecordStoppedMessage) => {
                      if (!res) return;

                      setStatus(RecorderStatus.IDLE);
                      const status: LocalData[LocalDataKey.recorderStatus] = {
                        status: RecorderStatus.IDLE,
                        activeTabId: tabId,
                      };
                      await Browser.storage.local.set({
                        [LocalDataKey.recorderStatus]: status,
                      });
                      if (res.session) {
                        setNewSession(res.session);
                        await saveSession(res.session, res.events).catch(
                          (e) => {
                            setErrorMessage((e as { message: string }).message);
                          },
                        );
                        channel.emit(EventName.SessionUpdated, {});
                      }
                    })
                    .catch((error: Error) => {
                      setErrorMessage(error.message);
                    });
                });
              } else {
                // start recording
                void channel.getCurrentTabId().then((tabId) => {
                  if (tabId === -1) return;
                  void channel
                    .requestToTab(tabId, ServiceName.StartRecord, {})
                    .then(async (res: RecordStartedMessage | undefined) => {
                      if (res) {
                        setStatus(RecorderStatus.RECORDING);
                        setStartTime(res.startTimestamp);
                        const status: LocalData[LocalDataKey.recorderStatus] = {
                          status: RecorderStatus.RECORDING,
                          activeTabId: tabId,
                          startTimestamp: res.startTimestamp,
                        };
                        await Browser.storage.local.set({
                          [LocalDataKey.recorderStatus]: status,
                        });
                      }
                    })
                    .catch((error: Error) => {
                      setErrorMessage(error.message);
                    });
                });
              }
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
        )}
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
                void pauseRecording(channel, RecorderStatus.PAUSED).then(
                  (result) => {
                    if (!result) return;
                    setStatus(result?.status.status);
                  },
                );
              } else {
                void channel.getCurrentTabId().then((tabId) => {
                  if (tabId === -1) return;
                  resumeRecording(channel, tabId)
                    .then((statusData) => {
                      if (!statusData) return;
                      setStatus(statusData.status);
                      if (statusData.startTimestamp)
                        setStartTime(statusData.startTimestamp);
                    })
                    .catch((error: Error) => {
                      setErrorMessage(error.message);
                    });
                });
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
