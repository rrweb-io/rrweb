import type { CloudSettings } from '~/types';

export const CLOUD_SETTINGS_STORAGE_KEY = 'rrweb-cloud-settings';

export const DEFAULT_CLOUD_SETTINGS: CloudSettings = {
  apiBaseUrl: 'https://api.rrweb.com',
  authToken: '',
};

type LocalStorage = {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, CloudSettings>): Promise<void>;
};

const INVALID_URL_MESSAGE = 'URL must be valid HTTP/HTTPS';

export function normalizeApiBaseUrl(value: string): string {
  let url: URL;
  const trimmedValue = value.trim();

  try {
    url = new URL(trimmedValue);
  } catch {
    throw new Error(INVALID_URL_MESSAGE);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    trimmedValue.includes('?') ||
    trimmedValue.includes('#')
  ) {
    throw new Error(INVALID_URL_MESSAGE);
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

export function normalizeCloudSettings(
  value: Partial<CloudSettings> = {},
): CloudSettings {
  return {
    apiBaseUrl:
      typeof value.apiBaseUrl === 'string'
        ? normalizeApiBaseUrl(value.apiBaseUrl)
        : DEFAULT_CLOUD_SETTINGS.apiBaseUrl,
    authToken:
      typeof value.authToken === 'string'
        ? value.authToken.trim()
        : DEFAULT_CLOUD_SETTINGS.authToken,
  };
}

export async function loadCloudSettings(
  storage: LocalStorage,
): Promise<CloudSettings> {
  const values = await storage.get(CLOUD_SETTINGS_STORAGE_KEY);
  const storedValue = values[CLOUD_SETTINGS_STORAGE_KEY];

  return normalizeCloudSettings(
    storedValue && typeof storedValue === 'object'
      ? (storedValue as Partial<CloudSettings>)
      : undefined,
  );
}

export async function saveCloudSettings(
  storage: LocalStorage,
  settings: CloudSettings,
): Promise<void> {
  await storage.set({
    [CLOUD_SETTINGS_STORAGE_KEY]: normalizeCloudSettings(settings),
  });
}
