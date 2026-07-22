import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Browser from 'webextension-polyfill';
import type { CloudSettings } from '~/types';
import {
  DEFAULT_CLOUD_SETTINGS,
  loadCloudSettings,
  normalizeCloudSettings,
  saveCloudSettings,
} from '~/utils/cloud-settings';

const INVALID_URL_MESSAGE = 'Please enter a valid HTTP or HTTPS URL.';
const LOAD_ERROR_MESSAGE =
  'Could not load cloud upload settings. Please try again.';
const SAVE_ERROR_MESSAGE =
  'Could not save cloud upload settings. Please try again.';

type LoadState = 'loading' | 'error' | 'ready';

export function SettingsView() {
  const toast = useToast();
  const [settings, setSettings] = useState<CloudSettings>(
    DEFAULT_CLOUD_SETTINGS,
  );
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const isMounted = useRef(true);
  const loadRequestId = useRef(0);

  const loadSettings = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    if (isMounted.current) {
      setLoadState('loading');
      setLoadError(undefined);
    }

    try {
      const loadedSettings = await loadCloudSettings(Browser.storage.local);
      if (!isMounted.current || requestId !== loadRequestId.current) {
        return;
      }

      setSettings(loadedSettings);
      setLoadError(undefined);
      setLoadState('ready');
    } catch {
      if (!isMounted.current || requestId !== loadRequestId.current) {
        return;
      }

      setLoadError(LOAD_ERROR_MESSAGE);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void loadSettings();

    return () => {
      isMounted.current = false;
    };
  }, [loadSettings]);

  function useDefaultSettings() {
    // Ignore an in-flight retry so it cannot replace the user's recovery form.
    ++loadRequestId.current;
    setSettings({ ...DEFAULT_CLOUD_SETTINGS });
    setLoadError(undefined);
    setSaveError(undefined);
    setLoadState('ready');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadState !== 'ready') {
      return;
    }

    setSaveError(undefined);

    let normalizedSettings: CloudSettings;
    try {
      normalizedSettings = normalizeCloudSettings(settings);
    } catch {
      setSaveError(INVALID_URL_MESSAGE);
      return;
    }

    setIsSaving(true);
    try {
      await saveCloudSettings(Browser.storage.local, normalizedSettings);
      if (!isMounted.current) {
        return;
      }

      setSettings(normalizedSettings);
      toast({
        title: 'Cloud upload settings saved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch {
      if (isMounted.current) {
        setSaveError(SAVE_ERROR_MESSAGE);
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  }

  return (
    <Box maxW="2xl">
      <Stack spacing="6">
        <Box>
          <Heading as="h1" size="lg">
            Cloud uploads
          </Heading>
          <Text color="gray.600" mt="2">
            Configure where this extension uploads completed recordings.
          </Text>
        </Box>

        {loadError && (
          <Alert status="error">
            <AlertIcon />
            <Stack
              align="center"
              direction="row"
              justify="space-between"
              w="full"
            >
              <Text>{loadError}</Text>
              <Text fontSize="sm">
                Use the defaults to discard the invalid values in this form.
                Nothing is saved until you choose Save settings.
              </Text>
              <Button
                onClick={() => void loadSettings()}
                size="sm"
                variant="outline"
              >
                Retry loading settings
              </Button>
              <Button onClick={useDefaultSettings} size="sm">
                Use default settings
              </Button>
            </Stack>
          </Alert>
        )}

        <Box as="form" noValidate onSubmit={handleSubmit}>
          <Stack spacing="5">
            <FormControl isInvalid={saveError === INVALID_URL_MESSAGE}>
              <FormLabel htmlFor="apiBaseUrl">Cloud API base URL</FormLabel>
              <Input
                id="apiBaseUrl"
                name="apiBaseUrl"
                type="url"
                value={settings.apiBaseUrl}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    apiBaseUrl: event.target.value,
                  }))
                }
                isDisabled={loadState !== 'ready' || isSaving}
              />
              <FormErrorMessage>{saveError}</FormErrorMessage>
            </FormControl>

            <Alert fontSize="sm" status="warning">
              <AlertIcon />
              Use HTTPS for remote endpoints. HTTP is only appropriate for
              trusted local development because uploads include your bearer
              token and recording data.
            </Alert>

            <FormControl>
              <FormLabel htmlFor="authToken">Authentication token</FormLabel>
              <Input
                id="authToken"
                name="authToken"
                type="password"
                value={settings.authToken}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    authToken: event.target.value,
                  }))
                }
                isDisabled={loadState !== 'ready' || isSaving}
              />
              <FormHelperText>
                This token stays on this device and is never synced.
              </FormHelperText>
            </FormControl>

            <Text color="gray.600" fontSize="sm">
              The upload endpoint is &lt;base URL&gt;/recordings/&lt;session
              ID&gt;/ingest. Your configured endpoint must allow
              extension-origin CORS POST requests and the Authorization,
              Content-Type, and Content-Encoding headers.
            </Text>

            {saveError && saveError !== INVALID_URL_MESSAGE && (
              <Alert status="error">
                <AlertIcon />
                {saveError}
              </Alert>
            )}

            <Button
              alignSelf="flex-start"
              colorScheme="blue"
              isDisabled={loadState !== 'ready'}
              isLoading={isSaving}
              type="submit"
            >
              Save settings
            </Button>
          </Stack>
        </Box>

        {loadState === 'loading' && (
          <Stack align="center" direction="row" color="gray.600">
            <Spinner size="sm" />
            <Text>Loading cloud upload settings…</Text>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
