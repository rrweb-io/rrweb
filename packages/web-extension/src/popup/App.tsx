import { useState, useEffect } from 'react';
import { Box, Flex, IconButton, Spacer, Stack, Text } from '@chakra-ui/react';
import { FiSettings, FiList } from 'react-icons/fi';
import Channel from '../utils/channel';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  ServiceName,
  RecordStartedMessage,
} from '../types';
import Browser from 'webextension-polyfill';
import { CircleButton } from '../components/CircleButton';
import { Timer } from './Timer';
const RECORD_BUTTON_SIZE = 3;

const channel = new Channel();

export function App() {
  const [recording, setRecording] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    void Browser.storage.local.get(LocalDataKey.recorderStatus).then((data) => {
      const localData = data as LocalData;
      if (!localData || !localData.recorder_status) return;
      const { status, startTimestamp } = localData.recorder_status;
      if (status === RecorderStatus.RECORDING) {
        setRecording(true);
        setStartTime(startTimestamp || 0);
      }
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
              void Browser.tabs.create({ url: '/options/index.html' });
            }}
            size="xs"
            icon={<FiSettings />}
            aria-label={'Settings button'}
            title="Settings"
          ></IconButton>
        </Stack>
      </Flex>
      {recording && startTime && (
        <Timer startTime={startTime} ticking={recording} />
      )}
      <Flex justify="center" gap="10" mt="5" mb="5">
        <CircleButton
          diameter={RECORD_BUTTON_SIZE}
          title={recording ? 'Stop Recording' : 'Start Recording'}
          onClick={() => {
            if (recording) {
              // stop recording
              setErrorMessage('');
              void channel.getCurrentTabId().then((tabId) => {
                if (tabId === -1) return;
                void channel
                  .requestToTab(tabId, ServiceName.StopRecord, {})
                  .then(async (res) => {
                    if (res) {
                      setRecording(false);
                      const status: LocalData[LocalDataKey.recorderStatus] = {
                        status: RecorderStatus.IDLE,
                        activeTabId: tabId,
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
            } else {
              // start recording
              void channel.getCurrentTabId().then((tabId) => {
                if (tabId === -1) return;
                void channel
                  .requestToTab(tabId, ServiceName.StartRecord, {})
                  .then(async (res: RecordStartedMessage | undefined) => {
                    if (res) {
                      setRecording(true);
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
            borderRadius={recording ? 6 : 9999}
            margin="0"
            bgColor="red.500"
          />
        </CircleButton>
        {/* // TODO add pause function */}
        {/* {recording && (
          <CircleButton diameter={RECORD_BUTTON_SIZE}>
            <Box
              w={`${RECORD_BUTTON_SIZE}rem`}
              h={`${RECORD_BUTTON_SIZE}rem`}
              borderRadius={9999}
              margin="0"
              color="gray.600"
            >
              <FiPause
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </Box>
          </CircleButton>
        )} */}
      </Flex>
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
