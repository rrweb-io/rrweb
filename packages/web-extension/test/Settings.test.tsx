import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CLOUD_SETTINGS } from '../src/utils/cloud-settings';
import { SettingsView } from '../src/options/Settings';

const browser = vi.hoisted(() => ({
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
}));

vi.mock('webextension-polyfill', () => ({ default: browser }));

function renderSettings() {
  return render(
    <ChakraProvider>
      <SettingsView />
    </ChakraProvider>,
  );
}

describe('SettingsView', () => {
  beforeEach(() => {
    browser.storage.local.get.mockReset();
    browser.storage.local.set.mockReset();
    browser.storage.local.get.mockResolvedValue({});
    browser.storage.local.set.mockResolvedValue(undefined);
    browser.storage.sync.get.mockReset();
    browser.storage.sync.set.mockReset();
  });

  it('loads the default URL from local storage without reading sync storage', async () => {
    renderSettings();

    expect(
      ((await screen.findByLabelText('Cloud API base URL')) as HTMLInputElement)
        .value,
    ).toBe(DEFAULT_CLOUD_SETTINGS.apiBaseUrl);
    expect(browser.storage.local.get).toHaveBeenCalledWith(
      'rrweb-cloud-settings',
    );
    expect(browser.storage.sync.get).not.toHaveBeenCalled();
  });

  it('saves normalized cloud settings in local storage', async () => {
    const user = userEvent.setup();
    renderSettings();

    const apiBaseUrl = await screen.findByLabelText('Cloud API base URL');
    await user.clear(apiBaseUrl);
    await user.type(apiBaseUrl, 'https://uploads.example.test/');
    await user.type(
      screen.getByLabelText('Authentication token'),
      'entered-token',
    );
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        'rrweb-cloud-settings': {
          apiBaseUrl: 'https://uploads.example.test',
          authToken: 'entered-token',
        },
      });
    });
    expect(browser.storage.sync.set).not.toHaveBeenCalled();
  });

  it('shows a validation error for an FTP URL without writing storage', async () => {
    const user = userEvent.setup();
    renderSettings();

    const apiBaseUrl = await screen.findByLabelText('Cloud API base URL');
    await user.clear(apiBaseUrl);
    await user.type(apiBaseUrl, 'ftp://uploads.example.test');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(
      await screen.findByText('Please enter a valid HTTP or HTTPS URL.'),
    ).toBeTruthy();
    expect(browser.storage.local.set).not.toHaveBeenCalled();
    expect(browser.storage.sync.set).not.toHaveBeenCalled();
  });

  it('uses a password input for the authentication token', async () => {
    renderSettings();

    expect(
      (await screen.findByLabelText('Authentication token')).getAttribute(
        'type',
      ),
    ).toBe('password');
  });

  it('shows a load failure without logging configured credentials', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    browser.storage.local.get.mockRejectedValueOnce(
      new Error('storage unavailable'),
    );

    renderSettings();

    expect(
      await screen.findByText(
        'Could not load cloud upload settings. Please try again.',
      ),
    ).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
