import { describe, expect, it, vi } from 'vitest';
import {
  CLOUD_SETTINGS_STORAGE_KEY,
  DEFAULT_CLOUD_SETTINGS,
  loadCloudSettings,
  normalizeApiBaseUrl,
  normalizeCloudSettings,
  saveCloudSettings,
} from '../src/utils/cloud-settings';

describe('cloud settings', () => {
  it('returns defaults when storage has no cloud settings', async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn(),
    };

    await expect(loadCloudSettings(storage)).resolves.toEqual(
      DEFAULT_CLOUD_SETTINGS,
    );
    expect(storage.get).toHaveBeenCalledWith(CLOUD_SETTINGS_STORAGE_KEY);
  });

  it('saves normalized settings using the local cloud settings key', async () => {
    const storage = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined),
    };

    await saveCloudSettings(storage, {
      apiBaseUrl: ' https://cloud.example.com/// ',
      authToken: ' token ',
    });

    expect(storage.set).toHaveBeenCalledWith({
      [CLOUD_SETTINGS_STORAGE_KEY]: {
        apiBaseUrl: 'https://cloud.example.com',
        authToken: 'token',
      },
    });
  });

  it('rejects FTP API base URLs', () => {
    expect(() => normalizeApiBaseUrl('ftp://cloud.example.com')).toThrow(
      'URL must be valid HTTP/HTTPS',
    );
  });

  it('rejects malformed API base URLs', () => {
    expect(() => normalizeApiBaseUrl('not a URL')).toThrow(
      'URL must be valid HTTP/HTTPS',
    );
  });

  it.each([
    'https://user:password@cloud.example.com',
    'https://cloud.example.com?token=secret',
    'https://cloud.example.com#fragment',
    'https://cloud.example.com?',
    'https://cloud.example.com#',
  ])('rejects disallowed API base URL components: %s', (value) => {
    expect(() => normalizeApiBaseUrl(value)).toThrow(
      'URL must be valid HTTP/HTTPS',
    );
  });

  it('applies defaults when loading a partial stored value', async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({
        [CLOUD_SETTINGS_STORAGE_KEY]: { authToken: ' token ' },
      }),
      set: vi.fn(),
    };

    await expect(loadCloudSettings(storage)).resolves.toEqual({
      apiBaseUrl: DEFAULT_CLOUD_SETTINGS.apiBaseUrl,
      authToken: 'token',
    });
  });

  it('normalizes partial settings without mutating defaults', () => {
    expect(normalizeCloudSettings()).toEqual(DEFAULT_CLOUD_SETTINGS);
  });
});
