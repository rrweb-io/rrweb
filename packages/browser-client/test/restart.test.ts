import { afterEach, describe, expect, it, vi } from 'vitest';

const transports = vi.hoisted(
  () =>
    [] as {
      send: ReturnType<typeof vi.fn>;
      flush: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }[],
);

vi.mock('../src/transport', () => ({
  createTransport: vi.fn(() => {
    const transport = {
      send: vi.fn(),
      flush: vi.fn(),
      disconnect: vi.fn(),
      stop: vi.fn(() => Promise.resolve()),
    };
    transports.push(transport);
    return transport;
  }),
}));

vi.mock('@rrweb/record', () => {
  const record = Object.assign(
    vi.fn(() => () => undefined),
    { addCustomEvent: vi.fn(), freezePage: vi.fn() },
  );
  return { record };
});

describe('start() called twice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('closes the first transport and records through the second', async () => {
    vi.stubGlobal('document', {
      hidden: false,
      readyState: 'complete',
      location: { hostname: 'example.com', href: 'https://example.com/' },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', {
      getItem: () => 'rec-1',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const client = await import('../src/index');
    const options = { publicApiKey: 'pk_test' };
    client.start(options);
    client.start(options);
    expect(transports).toHaveLength(2);
    expect(transports[0].disconnect).toHaveBeenCalledOnce();
    expect(transports[1].disconnect).not.toHaveBeenCalled();
    // recording still works: events reach the second transport only
    const { record } = await import('@rrweb/record');
    const { emit } = (record as unknown as ReturnType<typeof vi.fn>).mock
      .calls[1][0] as { emit: (event: unknown) => void };
    emit({ type: 3, data: {}, timestamp: 1 });
    expect(transports[1].send).toHaveBeenCalledOnce();
    expect(transports[0].send).not.toHaveBeenCalled();
  });
});
