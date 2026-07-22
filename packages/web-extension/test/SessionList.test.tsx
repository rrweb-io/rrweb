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
  const checkboxes = screen.getAllByRole('checkbox');
  await userEvent.click(checkboxes[1]);
  expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
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
    expect(
      await screen.findByText('Uploaded 1 selected session.'),
    ).toBeTruthy();
    expect(screen.getByText('Checkout flow')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
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
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await screen.findByRole('button', { name: 'Upload' });

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(
      await screen.findByText('Uploaded 1 of 2 selected sessions.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Sign in flow: Upload failed: 500 Server Error'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
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

    expect(
      await screen.findByText('Could not upload the selected sessions.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Checkout flow: Missing authentication token'),
    ).toBeTruthy();
  });
});
