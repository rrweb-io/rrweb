import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('warns that remote upload endpoints should use HTTPS', async () => {
    renderSettings();

    const warning = await screen.findByText(
      /Use HTTPS for remote endpoints\. HTTP is only appropriate for trusted local development because uploads include your bearer token and recording data\./,
    );

    expect(warning.closest('[role="alert"]')).not.toBeNull();
  });

  it('populates the form with the stored cloud settings', async () => {
    browser.storage.local.get.mockResolvedValue({
      'rrweb-cloud-settings': {
        apiBaseUrl: 'https://stored.example.test',
        authToken: 'stored-token',
      },
    });

    renderSettings();

    expect(
      ((await screen.findByLabelText('Cloud API base URL')) as HTMLInputElement)
        .value,
    ).toBe('https://stored.example.test');
    expect(
      (screen.getByLabelText('Authentication token') as HTMLInputElement).value,
    ).toBe('stored-token');
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
    expect(
      await screen.findByText('Cloud upload settings saved.'),
    ).toBeTruthy();
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

  it('shows a validation error for a malformed URL without writing storage', async () => {
    const user = userEvent.setup();
    renderSettings();

    const apiBaseUrl = await screen.findByLabelText('Cloud API base URL');
    await user.clear(apiBaseUrl);
    await user.type(apiBaseUrl, 'not a URL');
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

  it('keeps save disabled after a load failure until a retry succeeds', async () => {
    browser.storage.local.get.mockRejectedValueOnce(
      new Error('storage unavailable'),
    );
    browser.storage.local.get.mockResolvedValueOnce({
      'rrweb-cloud-settings': {
        apiBaseUrl: 'https://recovered.example.test',
        authToken: 'recovered-token',
      },
    });

    renderSettings();

    expect(
      await screen.findByText(
        'Could not load cloud upload settings. Please try again.',
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Save settings',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(browser.storage.local.set).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: 'Retry loading settings' }),
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText('Cloud API base URL') as HTMLInputElement).value,
      ).toBe('https://recovered.example.test');
    });
    expect(
      screen.queryByText(
        'Could not load cloud upload settings. Please try again.',
      ),
    ).toBeNull();
    expect(
      (
        screen.getByRole('button', {
          name: 'Save settings',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it('shows save failures without logging configured credentials', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    browser.storage.local.get.mockResolvedValue({
      'rrweb-cloud-settings': {
        apiBaseUrl: 'https://configured.example.test',
        authToken: 'configured-token',
      },
    });
    browser.storage.local.set.mockRejectedValue(
      new Error('storage unavailable'),
    );

    renderSettings();

    await screen.findByDisplayValue('https://configured.example.test');
    await userEvent.click(
      screen.getByRole('button', { name: 'Save settings' }),
    );

    expect(
      await screen.findByText(
        'Could not save cloud upload settings. Please try again.',
      ),
    ).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
