import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import {
  startServer,
  getServerURL,
  launchPuppeteer,
  replaceLast,
  ISuite,
} from './utils';
import type { browserClientRecordOptions } from '../src';
import { eventWithTime, EventType } from '@rrweb/types';
import { randomUUID } from 'crypto';

const browserClientPackage = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
) as { version: string };

// These default to the local test server used by the integration suite.
const TEST_SERVER_URL =
  import.meta.env.VITE_RRWEB_BROWSER_CLIENT_SERVER_URL ||
  'http://localhost:8787/recordings/{recordingId}/events/ws';
const TEST_API_BASE_URL = (
  import.meta.env.VITE_RRWEB_BROWSER_CLIENT_API_BASE_URL ||
  'http://localhost:8787'
).replace(/\/$/, '');
const TEST_PUBLIC_API_KEY =
  import.meta.env.VITE_TEST_PUBLIC_API_KEY ||
  import.meta.env.VITE_TEST_API_KEY ||
  '';
const TEST_READ_API_KEY =
  import.meta.env.VITE_TEST_READ_API_KEY ||
  import.meta.env.VITE_TEST_API_KEY ||
  '';

function apiUrl(path: string): string {
  return `${TEST_API_BASE_URL}${path}`;
}

function postEventsUrl(serverUrl: string): string {
  return serverUrl.replace(/\/ws(?=([?#]|$))/, '');
}

function defaultOptions(
  options: Partial<browserClientRecordOptions> = {},
): Partial<browserClientRecordOptions> {
  options.emit = 'emitFnName';
  if (!options.serverUrl) {
    options.serverUrl = TEST_SERVER_URL;
  }
  options.publicApiKey = TEST_PUBLIC_API_KEY;

  if (!options.meta) {
    options.meta = {
      custom: 'yes',
      sessionId: 'session-123',
    };
  }
  return options;
}

type RoundtripOptions = Partial<browserClientRecordOptions> & {
  disableWebsockets?: boolean;
};

const roundtripOptions: RoundtripOptions[] = [
  {
    captureAssets: {
      stylesheets: 'without-fetch',
    },
  },
  {
    captureAssets: {
      stylesheets: 'without-fetch',
    },
    disableWebsockets: true, // dummy
    serverUrl: postEventsUrl(TEST_SERVER_URL), // actually disable websockets
  },
];

async function pollUntil<T>(
  callback: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeout, interval }: { timeout: number; interval: number },
): Promise<T> {
  const start = Date.now();
  let lastError: unknown;

  do {
    try {
      const value = await callback();
      if (predicate(value)) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  } while (Date.now() - start < timeout);

  if (lastError) {
    throw lastError;
  }
  throw new Error(`Timed out after ${timeout}ms`);
}

const describeWithApi =
  TEST_PUBLIC_API_KEY && TEST_READ_API_KEY ? describe : describe.skip;

describeWithApi(
  '@rrweb/browser-client integration tests',
  function (this: ISuite) {
    vi.setConfig({ testTimeout: 20_000 });

    const getHtml = (
      fileName: string,
      options: Partial<browserClientRecordOptions> = {},
    ): string => {
      const filePath = path.resolve(__dirname, `./html/${fileName}`);
      const html = fs.readFileSync(filePath, 'utf8');
      return replaceLast(
        html,
        '</head>',
        `
<script>
window.snapshots = [];
function emitFnName(event) {
  window.snapshots.push(event);
}
</script>
<style>body { color: rgb(1, 2, 3); }</style>
<script src="${testServerURL}/browser-client.umd.cjs" autostart async>
${JSON.stringify(defaultOptions(options))}
</script>
</head>
    `,
      );
    };

    let server: ISuite['server'];
    let testServerURL: string;
    let browser: ISuite['browser'];

    beforeAll(async () => {
      server = await startServer();
      testServerURL = getServerURL(server);
      browser = await launchPuppeteer();

      expect(
        fs.existsSync(
          path.resolve(__dirname, '../dist/browser-client.umd.cjs'),
        ),
      ).toBe(true);
    });

    afterAll(async () => {
      await browser.close();
      server.close();
    });

    it.concurrent.each(roundtripOptions)(
      'can roundtrip events: %j',
      async (options) => {
        let optionsIn = JSON.stringify(options);

        const context = await browser.createIncognitoBrowserContext(); // no interference during concurrency
        let page = await context.newPage();

        const fetchSpy = vi.spyOn(global, 'fetch');

        let logs = '';

        let recordingId = '<recordingId not yet set>';

        let waitForEvents;
        if (options.disableWebsockets) {
          waitForEvents = page.waitForRequest((request) => {
            console.log('got: ' + request.url());
            return request.url().includes('/events');
          });
        }

        page.on('console', (msg) => {
          if (
            options.disableWebsockets &&
            msg.text().includes('Error during WebSocket handshake')
          ) {
            // an expected log when we are simulating websocket failure
          } else {
            console.log(recordingId + ': ' + msg.text());
          }
          logs += msg.text();
        });

        await page.goto(testServerURL); // need a real domain for sessionStorage
        await page.setContent(getHtml.call(this, 'link.html', options));

        const snapshots = (await page.evaluate(
          'window.snapshots',
        )) as eventWithTime[];

        expect(snapshots.length).toBeGreaterThan(1); // meta and fullsnapshot

        recordingId = (await page.evaluate(
          'rrwebBrowserClient.getRecordingId()',
        )) as string;

        expect(recordingId).toMatch(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
        );

        console.log(`got recordingId ${recordingId} test: ${optionsIn}`);

        await page.evaluate('rrwebBrowserClient.addMeta({reality: "updated"})');

        if (options.disableWebsockets) {
          console.log(`${recordingId} waitForEvents...`);
          await waitForEvents;
          console.log(`${recordingId} waitForEvents done`);
        }

        let expectLogs = expect(logs);
        let expectFetch = expect(fetchSpy);
        if (!options.disableWebsockets) {
          expectLogs = expectLogs.not;
          expectFetch = expectFetch.not;
        }
        expectLogs.toMatch(/WebSocket connection to .* failed/);
        //expectLogs.toMatch(/Failed to load resource/);
        if (!options.disableWebsockets) {
          // dunno why we need this if, something not working as we've already done waitForEvents
          expectFetch.toHaveBeenCalled();
        }

        const serverEvents = await pollUntil(
          async () => {
            const res = await fetch(
              apiUrl(`/recordings/${recordingId}/events`),
              {
                headers: {
                  Authorization: 'Bearer ' + TEST_READ_API_KEY,
                },
              },
            );
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          },
          (events) => events.some((event) => event.type === EventType.Asset),
          { timeout: 7000, interval: 200 },
        );

        expect(serverEvents.length).toBeGreaterThan(1);
        expect(serverEvents).toContainEqual(
          expect.objectContaining({
            type: EventType.Asset,
          }),
        );

        serverEvents.forEach((e) => {
          // TODO: these should probably not be returned in the first place
          if ('recordingId' in e && e.recordingId === recordingId) {
            delete e.recordingId;
          }
          if ('sequenceId' in e) {
            delete e.sequenceId;
          }
        });

        expect(snapshots).toMatchObject(serverEvents);

        const metaJson = await pollUntil(
          async () => {
            const res = await fetch(apiUrl(`/recordings/${recordingId}`), {
              headers: {
                Authorization: 'Bearer ' + TEST_READ_API_KEY,
              },
            });
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          },
          (metadataResponse) =>
            Boolean(
              metadataResponse &&
                metadataResponse.metadata &&
                Object.keys(metadataResponse.metadata).length,
            ),
          { timeout: 8000, interval: 200 },
        );

        expect(metaJson).toMatchObject({
          metadata: {
            custom: 'yes',
            sessionId: 'session-123',
            domain: 'localhost',
            includePii: 'false', // TODO: could this be a real boolean?
            reality: 'updated',
            recordVersion: browserClientPackage.version,
            recordCommitHash: expect.any(String),
            jsSource: `${testServerURL}/browser-client.umd.cjs`,
            jsEntrypoint: 'script-tag',
          },
        });

        // no need to write to disk (we can e.g. allow rrweb output to change between versions)
        // WARNING: this would mutate scrub timestamps and change Meta urls!
        //await assertSnapshot(snapshots, true);
      },
    );

    it('can clear recordingId using stop()', async () => {
      const options = {
        meta: {
          sessionId: randomUUID(),
        },
      };
      let optionsIn = JSON.stringify(options);

      let page = await browser.newPage();

      const client = await page.target().createCDPSession();
      await client.send('Network.enable');

      const messages = [];
      const messagesPromise = new Promise((resolve) => {
        client.on('Network.webSocketFrameSent', ({ response }) => {
          messages.push(response.payloadData);
          if (messages.length >= 3) {
            resolve(messages);
          }
        });
      });

      let logs = '';

      let recordingId = '<recordingId not yet set>';

      page.on('console', (msg) => {
        console.log(recordingId + ': ' + msg.text());
        logs += msg.text();
      });

      await page.goto(testServerURL); // need a real domain for sessionStorage
      await page.setContent(getHtml.call(this, 'link.html', options));

      const snapshots = (await page.evaluate(
        'window.snapshots',
      )) as eventWithTime[];

      expect(snapshots.length).toBeGreaterThan(1); // meta and fullsnapshot

      recordingId = (await page.evaluate(
        'rrwebBrowserClient.getRecordingId()',
      )) as string;

      expect(recordingId).toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      );

      await messagesPromise;

      let eventsFromFirst = snapshots.length + 1; // .stop() also generates a custom event

      await page.evaluate('rrwebBrowserClient.stop(true)');
      await page.evaluate(`rrwebBrowserClient.start()`);

      const recordingId2 = (await page.evaluate(
        'rrwebBrowserClient.getRecordingId()',
      )) as string;

      expect(recordingId2).toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      );

      expect(recordingId).not.toMatch(recordingId2);

      console.log(apiUrl(`/replay?meta[sessionId]=${options.meta.sessionId}`));
      const serverEvents = await pollUntil(
        async () => {
          const res = await fetch(
            apiUrl(`/replay?meta[sessionId]=${options.meta.sessionId}`),
            {
              headers: {
                Authorization: 'Bearer ' + TEST_READ_API_KEY,
              },
            },
          );
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        },
        (events) => events.length > eventsFromFirst,
        { timeout: 7000, interval: 200 },
      );

      expect(serverEvents.length).toBeGreaterThan(eventsFromFirst);

      const customEvents = [];
      const recordingIds = new Set();
      serverEvents.forEach((e) => {
        if ('recordingId' in e) {
          recordingIds.add(e.recordingId);
        }
        if (e.type === EventType.Custom) {
          customEvents.push(e);
        }
      });
      expect(recordingIds.size).toEqual(2);
      expect(customEvents).toMatchObject([
        {
          type: EventType.Custom,
          data: {
            tag: 'close-permanent',
          },
        },
      ]);
    });
  },
);
