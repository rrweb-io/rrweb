import type * as puppeteer from 'puppeteer';
import { EventType } from '@rrweb/types';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getServerURL, launchPuppeteer, startServer } from './utils';

vi.setConfig({ testTimeout: 15_000 });

describe('@rrweb/browser-client annotation startup', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  let serverUrl: string;
  let browser: puppeteer.Browser;

  beforeAll(async () => {
    server = await startServer();
    serverUrl = getServerURL(server);
    browser = await launchPuppeteer();
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });

  it('queues an annotation until the real recorder starts after DOMContentLoaded', async () => {
    const page = await browser.newPage();
    await page.goto(serverUrl);

    await page.setContent(`
      <!doctype html>
      <html>
        <head>
          <script>
            window.__sentEvents = [];
            window.__recordedEvents = [];
            window.__socketOpened = false;
            class TestWebSocket extends EventTarget {
              static CONNECTING = 0;
              static OPEN = 1;
              static CLOSING = 2;
              static CLOSED = 3;
              CONNECTING = 0;
              OPEN = 1;
              CLOSING = 2;
              CLOSED = 3;
              readyState = this.CONNECTING;
              constructor(url) {
                super();
                this.url = url;
                setTimeout(() => {
                  this.readyState = this.OPEN;
                  window.__socketOpened = true;
                  this.dispatchEvent(new Event('open'));
                }, 0);
              }
              send(data) {
                window.__sentEvents.push(data);
              }
              close() {
                this.readyState = this.CLOSED;
              }
            }
            window.WebSocket = TestWebSocket;
          </script>
          <script src="${serverUrl}/browser-client.umd.cjs"></script>
          <script>
            window.__readyStateAtStart = document.readyState;
            window.rrwebBrowserClient.start({
              serverUrl: 'ws://localhost/recordings/{recordingId}/events/ws',
              publicApiKey: 'test-key',
              includePii: false,
              emit(event) {
                window.__recordedEvents.push(event);
              },
            });
            try {
              window.rrwebBrowserClient.addAnnotation({
                type: 'caption',
                text: 'Startup caption',
              });
              window.__annotationError = null;
            } catch (error) {
              window.__annotationError = String(error);
            }
          </script>
        </head>
        <body><main>Recorder starts after this document is parsed.</main></body>
      </html>
    `);

    await page.waitForFunction(
      (fullSnapshotType: EventType) =>
        (window as any).__recordedEvents.some(
          (event: { type: number }) => event.type === fullSnapshotType,
        ),
      {},
      EventType.FullSnapshot,
    );
    await page.waitForFunction(() => (window as any).__socketOpened);

    const result = await page.evaluate(() => ({
      readyStateAtStart: (window as any).__readyStateAtStart as string,
      annotationError: (window as any).__annotationError as string | null,
      sentEvents: (window as any).__sentEvents as string[],
    }));
    const sentAnnotation = result.sentEvents
      .map((event) => JSON.parse(event) as { type: number; data: unknown })
      .find((event) => event.type === EventType.Annotation);

    expect(result.readyStateAtStart).toBe('loading');
    expect(result.annotationError).toBeNull();
    expect(sentAnnotation).toMatchObject({
      type: EventType.Annotation,
      data: { type: 'caption', text: 'Startup caption' },
      timestamp: expect.any(Number),
    });

    await page.close();
  });
});
