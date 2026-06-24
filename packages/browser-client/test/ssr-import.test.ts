import { describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock(
  '@rrweb/record',
  () => {
    mockState.record.addCustomEvent = vi.fn();
    mockState.record.freezePage = vi.fn();
    return { record: mockState.record };
  },
);

vi.mock(
  '@rrweb/types',
  () => ({
    EventType: {
      Custom: 5,
      Meta: 4,
    },
  }),
);

vi.mock(
  '@rrweb/utils',
  () => ({
    nowTimestamp: () => 1,
  }),
);

vi.mock('websocket-ts', () => {
  class ArrayQueue {
    private items: string[] = [];

    add(value: string) {
      this.items.push(value);
    }

    clear() {
      this.items = [];
    }

    length() {
      return this.items.length;
    }

    read() {
      return this.items.shift();
    }
  }

  class ExponentialBackoff {}

  class Websocket {
    send = vi.fn();
    close = vi.fn();
    addEventListener = vi.fn();
  }

  class WebsocketBuilder {
    withBuffer() {
      return this;
    }

    withBackoff() {
      return this;
    }

    build() {
      return new Websocket();
    }
  }

  return {
    ArrayQueue,
    ExponentialBackoff,
    Websocket,
    WebsocketBuilder,
    WebsocketEvent: {
      open: 'open',
      message: 'message',
      close: 'close',
    },
  };
});

describe('@rrweb/browser-client SSR import', () => {
  it('does not require document at import time or when start is called', async () => {
    vi.resetModules();

    const client = await import('../src/index');

    expect(() => {
      client.start({
        publicApiKey: 'public_key_rr_test',
        includePii: false,
        autostart: false,
      });
    }).not.toThrow();
    expect(() => client.stop(true)).not.toThrow();
    expect(mockState.record).not.toHaveBeenCalled();
  });
});
