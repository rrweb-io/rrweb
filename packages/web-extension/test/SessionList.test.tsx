import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../src/types';
import { SessionList } from '../src/pages/SessionList';

const browser = vi.hoisted(() => ({
  storage: {
    local: {},
  },
}));

const storage = vi.hoisted(() => ({
  getAllSessions: vi.fn(),
  deleteSessions: vi.fn(),
  downloadSessions: vi.fn(),
  addSession: vi.fn(),
  updateSession: vi.fn(),
}));

const cloudSettings = vi.hoisted(() => ({
  loadCloudSettings: vi.fn(),
}));

const cloudUpload = vi.hoisted(() => ({
  uploadSessions: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({ default: browser }));
vi.mock('../src/utils/storage', () => storage);
vi.mock('../src/utils/cloud-settings', () => cloudSettings);
vi.mock('../src/utils/cloud-upload', () => cloudUpload);
vi.mock('../src/utils/channel', () => ({
  default: class {
    on = vi.fn();
    emit = vi.fn();
  },
}));

const sessions: Session[] = [
  {
    id: 'session-1',
    name: 'Checkout flow',
    tags: [],
    createTimestamp: 2,
    modifyTimestamp: 2,
    recorderVersion: '1.0.0',
  },
  {
    id: 'session-2',
    name: 'Sign in flow',
    tags: [],
    createTimestamp: 1,
    modifyTimestamp: 1,
    recorderVersion: '1.0.0',
  },
];

const paginatedSessions: Session[] = Array.from({ length: 11 }, (_, index) => ({
  id: `session-${index + 1}`,
  name: `Session ${index + 1}`,
  tags: [],
  createTimestamp: 11 - index,
  modifyTimestamp: 11 - index,
  recorderVersion: '1.0.0',
}));

function renderSessionList() {
  return render(
    <ChakraProvider>
      <MemoryRouter>
        <SessionList />
      </MemoryRouter>
    </ChakraProvider>,
  );
}

async function selectFirstSession() {
  await screen.findByText('Checkout flow');
  const checkbox = screen.getByRole('checkbox', {
    name: 'Select Checkout flow',
  }) as HTMLInputElement;
  await userEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);
  await screen.findByRole('button', { name: 'Upload' });
}

describe('SessionList cloud uploads', () => {
  beforeEach(() => {
    storage.getAllSessions.mockResolvedValue(sessions);
    storage.deleteSessions.mockReset();
    storage.downloadSessions.mockReset();
    storage.addSession.mockReset();
    storage.updateSession.mockReset();
    cloudSettings.loadCloudSettings.mockResolvedValue({
      apiBaseUrl: 'https://api.rrweb.com',
      authToken: 'token',
    });
    cloudUpload.uploadSessions.mockResolvedValue([
      { id: 'session-1', name: 'Checkout flow', ok: true },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads only the selected saved session with locally loaded settings', async () => {
    renderSessionList();
    await selectFirstSession();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(cloudSettings.loadCloudSettings).toHaveBeenCalledWith(
        browser.storage.local,
      );
      expect(cloudUpload.uploadSessions).toHaveBeenCalledWith(['session-1'], {
        apiBaseUrl: 'https://api.rrweb.com',
        authToken: 'token',
      });
    });
    expect(await screen.findByText('Upload complete')).toBeTruthy();
    expect(screen.getByText('Uploaded 1 selected session.')).toBeTruthy();
    expect(screen.getByText('Checkout flow')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select Checkout flow',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it('reports partial failures by session name without clearing the selection', async () => {
    cloudUpload.uploadSessions.mockResolvedValue([
      { id: 'session-1', name: 'Checkout flow', ok: true },
      {
        id: 'session-2',
        name: 'Sign in flow',
        ok: false,
        error: 'Upload failed: 500 Server Error',
      },
    ]);
    renderSessionList();
    await screen.findByText('Checkout flow');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Checkout flow' }),
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Sign in flow' }),
    );
    await screen.findByRole('button', { name: 'Upload' });

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      await screen.findByText('Upload completed with errors'),
    ).toBeTruthy();
    expect(screen.getByText(/Uploaded 1 of 2 selected sessions/)).toBeTruthy();
    expect(
      screen.getByText(/Sign in flow: Upload failed: 500 Server Error/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select Sign in flow',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it('shows a useful error when settings cannot be loaded', async () => {
    cloudSettings.loadCloudSettings.mockRejectedValue(
      new Error('storage unavailable'),
    );
    renderSessionList();
    await selectFirstSession();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      await screen.findByText('Could not load cloud upload settings.'),
    ).toBeTruthy();
    expect(screen.getByText('storage unavailable')).toBeTruthy();
    expect(cloudUpload.uploadSessions).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
  });

  it('shows every failed session when no selected upload succeeds', async () => {
    cloudUpload.uploadSessions.mockResolvedValue([
      {
        id: 'session-1',
        name: 'Checkout flow',
        ok: false,
        error: 'Missing authentication token',
      },
    ]);
    renderSessionList();
    await selectFirstSession();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Upload failed')).toBeTruthy();
    expect(
      screen.getByText(/Checkout flow: Missing authentication token/),
    ).toBeTruthy();
  });

  it('shows an upload error and preserves selection when the transport rejects', async () => {
    cloudUpload.uploadSessions.mockRejectedValue(new Error('network failed'));
    renderSessionList();
    await selectFirstSession();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      await screen.findByText('Could not complete the upload.'),
    ).toBeTruthy();
    expect(screen.getByText('network failed')).toBeTruthy();
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select Checkout flow',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it('does not substitute a first-page selection after page navigation', async () => {
    storage.getAllSessions.mockResolvedValue(paginatedSessions);
    renderSessionList();
    await screen.findByText('Session 1');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Session 1' }),
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Goto Next Page' }),
    );
    await screen.findByText('Session 11');
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(cloudUpload.uploadSessions).toHaveBeenCalledWith(
        ['session-1'],
        expect.anything(),
      );
    });
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select Session 11',
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it('uploads selected sessions across pages by their stable session IDs', async () => {
    storage.getAllSessions.mockResolvedValue(paginatedSessions);
    cloudUpload.uploadSessions.mockResolvedValue([
      { id: 'session-1', name: 'Session 1', ok: true },
      { id: 'session-11', name: 'Session 11', ok: true },
    ]);
    renderSessionList();
    await screen.findByText('Session 1');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Session 1' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Goto Next Page' }),
    );
    await screen.findByText('Session 11');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Session 11' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Goto Previous Page' }),
    );
    await screen.findByText('Session 1');
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select Session 1',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Goto Next Page' }),
    );
    await screen.findByText('Session 11');

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(cloudUpload.uploadSessions).toHaveBeenCalledWith(
        ['session-1', 'session-11'],
        expect.anything(),
      );
    });
  });
});
