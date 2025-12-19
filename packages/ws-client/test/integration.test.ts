import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import {
  assertSnapshot,
  startServer,
  getServerURL,
  launchPuppeteer,
  waitForRAF,
  replaceLast,
  ISuite,
} from './utils';
import type { recordOptions } from '../src/types';
import { eventWithTime, NodeType, EventType } from '@rrweb/types';
import { visitSnapshot } from 'rrweb-snapshot';

// defined in packages/ws-client/.env, a Private API Key from https://app.rrwebcloud.com/api-keys
const TEST_API_KEY = import.meta.env.VITE_TEST_API_KEY;

describe('ws-client integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 20_000 });

  const getHtml = (
    fileName: string,
    options: recordOptions<eventWithTime> = {},
  ): string => {
    if (!options.captureAssets) {
      // for consistency in the tests, don't create small stylesheet assets
      options.captureAssets = {
        stylesheetsRuleThreshold: 10,
      };
    }
    options.emit = 'emitFnName';
    if (!options.serverUrl) {
      options.serverUrl =
        'http://localhost:8787/recordings/{recordingId}/ingest/ws';
    }
    options.serverUrl += '?tblocal';
    options.publicApiKey = TEST_API_KEY;

    options.meta = {
      custom: 'yes',
      sessionId: 'session-123',
    };

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
<script src="${testServerURL}/record.js" autostart async>
${JSON.stringify(options)}
</script>
</head>
    `,
    );
  };

  let server: ISuite['server'];
  let testServerURL: string;
  let code: ISuite['code'];
  let browser: ISuite['browser'];

  beforeAll(async () => {
    server = await startServer();
    testServerURL = getServerURL(server);
    browser = await launchPuppeteer();

    // this is linked on file system with `ln -s dist/js-client.umd.cjs test/record.js`
    const bundlePath = path.resolve(__dirname, '../dist/js-client.umd.cjs');
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });

  it.concurrent.for([
    {},
    {
      disableWebsockets: true, // dummy
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/ingest', // actually disable websockets
    },
  ])('can roundtrip events: %j', async (options, { expect }) => {
    let optionsIn = JSON.stringify(options);

    const context = await browser.createIncognitoBrowserContext(); // no interference during concurrency
    let page = await context.newPage();

    const fetchSpy = vi.spyOn(global, 'fetch');

    let logs = '';

    let recordingId = '<recordingId not yet set>';

    let waitForIngest;
    if (options.disableWebsockets) {
      waitForIngest = page.waitForRequest((request) => {
        console.log('got: ' + request.url());
        return request.url().includes('ingest');
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
      'rrwebCloud.getRecordingId()',
    )) as string;

    expect(recordingId).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );

    console.log(`got recordingId ${recordingId} test: ${optionsIn}`);

    await page.evaluate('rrwebCloud.addMeta({reality: "updated"})');

    if (options.disableWebsockets) {
      console.log(`${recordingId} waitForIngest...`);
      await waitForIngest;
      console.log(`${recordingId} waitForIngest done`);
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
      // dunno why we need this if, something not working as we've already done waitForIngest
      expectFetch.toHaveBeenCalled();
    }

    let serverEvents = null;
    await expect
      .poll(
        async () => {
          const res = await fetch(
            `http://localhost:8787/recordings/${recordingId}/events?tblocal`,
            {
              headers: {
                Authorization: 'Bearer ' + TEST_API_KEY,
              },
            },
          );
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          serverEvents = await res.json();
          return serverEvents.length;
        },
        { timeout: 7000, interval: 200 },
      )
      .toBeGreaterThan(0);

    expect(serverEvents.length).toBeGreaterThan(1);

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

    let metaJson = null;
    await expect
      .poll(
        async () => {
          const res = await fetch(
            `http://localhost:8787/recordings/${recordingId}?tblocal`,
            {
              headers: {
                Authorization: 'Bearer ' + TEST_API_KEY,
              },
            },
          );
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          metaJson = await res.json();
          return metaJson && metaJson.metadata && Object.keys(metaJson.metadata).length;
        },
        { timeout: 8000, interval: 200 },
      )
      .toBeGreaterThan(0);

    expect(metaJson).toMatchObject({
      metadata: {
        custom: 'yes',
        sessionId: 'session-123',
        domain: 'localhost',
        includePii: 'false', // TODO: could this be a real boolean?
        reality: 'updated',
      },
    });

    // no need to write to disk (we can e.g. allow rrweb output to change between versions)
    // WARNING: this would mutate scrub timestamps and change Meta urls!
    //await assertSnapshot(snapshots, true);
  });
});
