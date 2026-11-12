// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { ServiceName, type Session } from '~/types';
import { SessionList } from './SessionList';

const fake = vi.hoisted(() => ({
  sessions: [] as Session[],
  downloadSessions: undefined as unknown as (ids: string[]) => Promise<void>,
  request: undefined as unknown as (
    service: string,
    params: unknown,
  ) => Promise<unknown>,
}));

vi.mock('~/utils/storage', () => ({
  getAllSessions: () => Promise.resolve(fake.sessions),
  downloadSessions: (ids: string[]) => fake.downloadSessions(ids),
  addSession: () => Promise.resolve(),
  updateSession: () => Promise.resolve(),
}));
vi.mock('~/utils/channel', () => ({
  default: class {
    on() {
      return () => undefined;
    }
    emit() {
      return undefined;
    }
    request(service: string, params: unknown) {
      return fake.request(service, params);
    }
  },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => () => undefined }));
vi.mock('./ShareAction', () => ({ ShareAction: () => null }));

const downloadSessions = vi.fn((_ids: string[]) => Promise.resolve());
const request = vi.fn((_service: string, _params: unknown) =>
  Promise.resolve(undefined),
);

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  // Twelve sessions, newest first: ten on page one, two on page two.
  fake.sessions = Array.from({ length: 12 }, (_, i) => ({
    id: `s${i}`,
    name: `Session ${i}`,
    tags: [],
    createTimestamp: 1000 - i,
    modifyTimestamp: 1000 - i,
    recorderVersion: '2.2.2',
  }));
  fake.downloadSessions = downloadSessions;
  fake.request = request;
  downloadSessions.mockClear();
  request.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const byLabel = (label: string) => {
  const found = document.body.querySelector<HTMLElement>(
    `[aria-label="${label}"]`,
  );
  if (!found) throw new Error(`no control "${label}"`);
  return found;
};
const button = (text: string) => {
  const found = Array.from(
    document.body.querySelectorAll<HTMLElement>('button'),
  ).find((el) => el.textContent?.trim() === text);
  if (!found) throw new Error(`no button "${text}"`);
  return found;
};
async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

async function selectOneOnEachPage() {
  await act(async () => {
    root.render(
      createElement(ChakraProvider, null, createElement(SessionList)),
    );
  });
  await vi.waitFor(() => expect(container.textContent).toContain('Session 0'));
  await click(byLabel('Select Session 0'));
  await click(byLabel('Next page'));
  await click(byLabel('Select Session 10'));
}

describe('SessionList bulk actions', () => {
  it('counts, downloads and deletes the selected sessions of every page', async () => {
    await selectOneOnEachPage();
    expect(container.textContent).toContain('2 selected');

    await click(button('Download'));
    expect(downloadSessions).toHaveBeenCalledWith(['s0', 's10']);

    await click(button('Delete'));
    expect(request).toHaveBeenCalledWith(ServiceName.DeleteSessions, {
      sessionIds: ['s0', 's10'],
    });
  });

  it('keeps the selection when the delete fails, and says so', async () => {
    request.mockRejectedValueOnce(new Error('storage unavailable'));
    await selectOneOnEachPage();
    await click(button('Delete'));
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('storage unavailable'),
    );
    expect(container.textContent).toContain('2 selected');
  });
});
