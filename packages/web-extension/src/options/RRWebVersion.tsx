import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import {
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  useToast,
} from '@chakra-ui/react';
import {
  fetchPackageVersions,
  getRecorderURL,
  verifyPlayerURL,
  verifyRecorderURL,
} from '../utils';
import { SyncData, SyncDataKey } from '../types';
import { getPlayerURL } from '../utils/index';

export default function RRWebVersion() {
  const toast = useToast();
  const [recorderVersion, setRecorderVersion] = useState('');
  const [recorderVersions, setRecorderVersions] = useState<string[]>([]);
  const [recorderURL, setRecorderURL] = useState('');
  const [recorderValidURL, setRecorderValidURL] = useState('');
  const [playerVersion, setPlayerVersion] = useState('');
  const [playerVersions, setPlayerVersions] = useState<string[]>([]);
  const [playerURL, setPlayerURL] = useState('');
  const [playerValidURL, setPlayerValidURL] = useState('');

  useEffect(() => {
    void fetchPackageVersions('rrweb').then((versions) => {
      setRecorderVersions(versions);
    });
    void fetchPackageVersions('rrweb-player').then((versions) => {
      setPlayerVersions(versions);
    });
    void Browser.storage.sync.get(SyncDataKey.settings).then((data) => {
      const syncData = data as SyncData;
      if (!syncData.settings) return;
      const { recorderVersion, recorderURL, playerURL, playerVersion } =
        syncData.settings;
      setRecorderVersion(recorderVersion);
      setRecorderURL(recorderURL);
      setRecorderValidURL(recorderURL);
      setPlayerVersion(playerVersion);
      setPlayerURL(playerURL);
      setPlayerValidURL(playerURL);
    });
  }, []);

  return (
    <Flex direction="column" gap="12">
      <Flex direction="column" gap="3">
        <FormControl as="fieldset">
          <FormLabel as="legend">RRWeb Recorder Version</FormLabel>
          <Select
            value={recorderVersion}
            onChange={(event) => {
              const newVersion = event.target.value;
              void Browser.storage.sync
                .get(SyncDataKey.settings)
                .then((data) => {
                  const syncData = data as SyncData;
                  if (!syncData.settings) return;
                  if (syncData.settings.recorderVersion === newVersion)
                    return Promise.reject();
                  syncData.settings.recorderVersion = newVersion;
                  syncData.settings.recorderURL = getRecorderURL(newVersion);
                  return Browser.storage.sync.set({
                    [SyncDataKey.settings]: {
                      ...syncData.settings,
                    },
                  });
                })
                .then(() => {
                  setRecorderVersion(newVersion);
                  setRecorderURL(getRecorderURL(newVersion));
                  setRecorderValidURL(getRecorderURL(newVersion));
                  toast({
                    title: 'Recorder Version Updated',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                  });
                })
                .catch();
            }}
          >
            {recorderVersions.map((version) => (
              <option value={version}>{version}</option>
            ))}
          </Select>
          <FormHelperText>
            {recorderVersion !== '' && recorderVersion !== 'custom' && (
              <>
                The extension will load Recorder script with v{recorderVersion}
                from jsDelivr.
              </>
            )}
          </FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel as="legend">Recorder URL</FormLabel>
          <InputGroup size="md">
            <Input
              size="md"
              pr="10rem"
              value={recorderURL}
              onChange={(event) => setRecorderURL(event.target.value)}
            />
            <InputRightElement width="10rem">
              <Button
                h="1.75rem"
                size="sm"
                right="0.5rem"
                onClick={() => {
                  setRecorderURL(recorderValidURL);
                }}
              >
                Clear
              </Button>
              <Button
                h="1.75rem"
                size="sm"
                colorScheme="green"
                disabled={recorderURL === recorderValidURL}
                onClick={() => {
                  void verifyRecorderURL(recorderURL).then((valid) => {
                    if (!valid) {
                      toast({
                        title: 'Invalid Recorder URL',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                      });
                      return;
                    }
                    void Browser.storage.sync
                      .get(SyncDataKey.settings)
                      .then((data) => {
                        const syncData = data as SyncData;
                        if (!syncData.settings) return;
                        if (syncData.settings.recorderURL === recorderURL)
                          return Promise.reject();
                        syncData.settings.recorderVersion = 'custom';
                        syncData.settings.recorderURL = recorderURL;
                        return Browser.storage.sync.set({
                          [SyncDataKey.settings]: {
                            ...syncData.settings,
                          },
                        });
                      })
                      .then(() => {
                        setRecorderVersion('custom');
                        setRecorderValidURL(recorderURL);
                        toast({
                          title: 'Recorder URL Updated',
                          status: 'success',
                          duration: 3000,
                          isClosable: true,
                        });
                      })
                      .catch();
                  });
                }}
              >
                Confirm
              </Button>
            </InputRightElement>
          </InputGroup>
          <FormHelperText>
            {(recorderVersion === '' || recorderVersion === 'custom') && (
              <>
                The extension will load Recorder script from {recorderValidURL}
              </>
            )}
          </FormHelperText>
        </FormControl>
      </Flex>
      <Flex direction="column" gap="5">
        <FormControl as="fieldset">
          <FormLabel as="legend">RRWeb Player Version</FormLabel>
          <Select
            value={playerVersion}
            onChange={(event) => {
              const newVersion = event.target.value;
              void Browser.storage.sync
                .get(SyncDataKey.settings)
                .then((data) => {
                  const syncData = data as SyncData;
                  if (!syncData.settings) return;
                  if (syncData.settings.playerVersion === newVersion)
                    return Promise.reject();
                  syncData.settings.playerVersion = newVersion;
                  syncData.settings.playerURL = getPlayerURL(newVersion);
                  setPlayerURL(getPlayerURL(newVersion));
                  return Browser.storage.sync.set({
                    [SyncDataKey.settings]: {
                      ...syncData.settings,
                    },
                  });
                })
                .then(() => {
                  setPlayerVersion(newVersion);
                  setPlayerURL(getPlayerURL(newVersion));
                  setPlayerValidURL(getPlayerURL(newVersion));
                  toast({
                    title: 'Player Version Updated',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                  });
                })
                .catch();
            }}
          >
            {playerVersions.map((version) => (
              <option value={version}>{version}</option>
            ))}
          </Select>
          <FormHelperText>
            {playerVersion !== '' && playerVersion !== 'custom' && (
              <>
                The extension will load Player script with v{playerVersion} from
                jsDelivr.
              </>
            )}
          </FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel as="legend">Player URL</FormLabel>
          <InputGroup size="md">
            <Input
              pr="10rem"
              value={playerURL}
              onChange={(event) => setPlayerURL(event.target.value)}
            />
            <InputRightElement width="10rem">
              <Button
                h="1.75rem"
                size="sm"
                right="0.5rem"
                onClick={() => {
                  setPlayerURL(playerValidURL);
                }}
              >
                Clear
              </Button>
              <Button
                h="1.75rem"
                size="sm"
                colorScheme="green"
                disabled={playerURL === playerValidURL}
                onClick={() => {
                  void verifyPlayerURL(playerURL).then((valid) => {
                    if (!valid) {
                      toast({
                        title: 'Invalid Player URL',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                      });
                      return;
                    }
                    void Browser.storage.sync
                      .get(SyncDataKey.settings)
                      .then((data) => {
                        const syncData = data as SyncData;
                        if (!syncData.settings) return;
                        if (syncData.settings.playerURL === playerURL)
                          return Promise.reject();
                        syncData.settings.playerVersion = 'custom';
                        syncData.settings.playerURL = playerURL;
                        return Browser.storage.sync.set({
                          [SyncDataKey.settings]: {
                            ...syncData.settings,
                          },
                        });
                      })
                      .then(() => {
                        setPlayerVersion('custom');
                        setPlayerValidURL(playerURL);
                        toast({
                          title: 'Player URL Updated',
                          status: 'success',
                          duration: 3000,
                          isClosable: true,
                        });
                      })
                      .catch();
                  });
                }}
              >
                Confirm
              </Button>
            </InputRightElement>
          </InputGroup>
          <FormHelperText>
            {(playerVersion === '' || playerVersion === 'custom') && (
              <>The extension will load Player script from {playerValidURL}</>
            )}
          </FormHelperText>
        </FormControl>
      </Flex>
    </Flex>
  );
}
