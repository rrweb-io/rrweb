import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
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

export function SettingsView() {
  const toast = useToast();
  const [settings, setSettings] = useState<CloudSettings>(
    DEFAULT_CLOUD_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();

  useEffect(() => {
    let active = true;

    void loadCloudSettings(Browser.storage.local)
      .then((loadedSettings) => {
        if (active) {
          setSettings(loadedSettings);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError(LOAD_ERROR_MESSAGE);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setSettings(normalizedSettings);
      toast({
        title: 'Cloud upload settings saved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Box maxW="2xl">
      <Stack spacing="6">
        <Box>
          <Text fontSize="2xl" fontWeight="semibold">
            Cloud uploads
          </Text>
          <Text color="gray.600" mt="2">
            Configure where this extension uploads completed recordings.
          </Text>
        </Box>

        {loadError && (
          <Alert status="error">
            <AlertIcon />
            {loadError}
          </Alert>
        )}

        <Box as="form" onSubmit={handleSubmit}>
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
                isDisabled={isLoading || isSaving}
              />
              <FormErrorMessage>{saveError}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="authToken">Authentication token</FormLabel>
              <Input
                id="authToken"
                name="authToken"
                type="password"
                value={settings.authToken}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    authToken: event.target.value,
                  }))
                }
                isDisabled={isLoading || isSaving}
              />
              <Text color="gray.600" fontSize="sm" mt="2">
                This token stays on this device and is never synced.
              </Text>
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
              isDisabled={isLoading}
              isLoading={isSaving}
              type="submit"
            >
              Save settings
            </Button>
          </Stack>
        </Box>

        {isLoading && (
          <Stack align="center" direction="row" color="gray.600">
            <Spinner size="sm" />
            <Text>Loading cloud upload settings…</Text>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
