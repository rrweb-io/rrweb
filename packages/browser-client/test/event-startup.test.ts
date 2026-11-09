import type * as puppeteer from 'puppeteer';
import { EventType } from '@rrweb/types';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getServerURL, launchPuppeteer, startServer } from './utils';

vi.setConfig({ testTimeout: 15_000 });

describe('@rrweb/browser-client event startup', () => {
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

  it.each(['DOMContentLoaded', 'load'])(
    'delivers custom events and annotations before, during, and after %s startup',
    async (recordAfter) => {
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
            window.__queuedFrom = Date.now();
            window.rrwebBrowserClient.addCustomEvent('before-start', { value: 1 });
            window.rrwebBrowserClient.addAnnotation({ type: 'caption', text: 'Before start' });
            window.rrwebBrowserClient.start({
              serverUrl: 'ws://localhost/recordings/{recordingId}/events/ws',
              publicApiKey: 'test-key',
              includePii: false,
              recordAfter: '${recordAfter}',
              emit(event) {
                window.__recordedEvents.push(event);
              },
            });
            try {
              window.rrwebBrowserClient.addCustomEvent('during-start', { value: 2 });
              window.rrwebBrowserClient.addAnnotation({
                type: 'caption',
                text: 'Startup caption',
              });
              window.__annotationError = null;
              window.__queuedUntil = Date.now();
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

      await page.evaluate(() => {
        (window as any).rrwebBrowserClient.addCustomEvent('after-start', {
          value: 3,
        });
        (window as any).rrwebBrowserClient.addAnnotation({
          type: 'caption',
          text: 'After start',
        });
      });
      const result = await page.evaluate(() => ({
        readyStateAtStart: (window as any).__readyStateAtStart as string,
        annotationError: (window as any).__annotationError as string | null,
        sentEvents: (window as any).__sentEvents as string[],
        recordedEvents: (window as any).__recordedEvents as {
          type: number;
          timestamp: number;
          data: { tag?: string; text?: string };
        }[],
        queuedFrom: (window as any).__queuedFrom as number,
        queuedUntil: (window as any).__queuedUntil as number,
      }));
      const isAddedEvent = (event: { type: number; data: { tag?: string } }) =>
        event.type === EventType.Annotation ||
        (event.type === EventType.Custom &&
          ['before-start', 'during-start', 'after-start'].includes(
            event.data.tag ?? '',
          ));
      const sentEvents = result.sentEvents
        .map((event) => JSON.parse(event))
        .filter(isAddedEvent);
      const recordedEvents = result.recordedEvents.filter(isAddedEvent);

      expect(result.readyStateAtStart).toBe('loading');
      expect(result.annotationError).toBeNull();
      expect(recordedEvents).toHaveLength(6);
      expect(sentEvents).toEqual(recordedEvents);
      expect(
        recordedEvents.map((event) => event.data.tag ?? event.data.text),
      ).toEqual([
        'before-start',
        'Before start',
        'during-start',
        'Startup caption',
        'after-start',
        'After start',
      ]);
      for (const event of recordedEvents.slice(0, 4)) {
        expect(event.timestamp).toBeGreaterThanOrEqual(result.queuedFrom);
        expect(event.timestamp).toBeLessThanOrEqual(result.queuedUntil);
      }

      await page.close();
    },
  );
});
