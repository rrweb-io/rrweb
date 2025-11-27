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

// defined in packages/ws-client/.env
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
    options.publicApiKey = TEST_API_KEY;

    options.meta = {
      custom: 'yes',
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

    const page: puppeteer.Page = await browser.newPage();

    const fetchSpy = vi.spyOn(global, 'fetch');

    let logs = '';

    let recordingId = '<recordingId not yet set>';

    const waitForIngest = page.waitForRequest((request) => {
      console.log('got: ' + request.url());
      return request.url().includes('ingest');
    });

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

    console.log(`${recordingId} waitForBackend...`);
    if (options.disableWebsockets) {
      await page.waitForTimeout(7000); // let the data make it to the backend
    } else {
      await page.waitForTimeout(5000); // let the data make it to the backend
    }
    console.log(`${recordingId} waitForBackend done`);

    const res = await fetch(
      `https://api.rrwebcloud.com/recordings/${recordingId}/events`,
      {
        headers: {
          Authorization: 'Bearer ' + TEST_API_KEY,
        },
      },
    );
    expect(res.ok).toEqual(true);

    const serverEvents = await res.json();
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

    const metaRes = await fetch(
      `https://api.rrwebcloud.com/recordings/${recordingId}`,
      {
        // thought this ended with /meta
        headers: {
          Authorization: 'Bearer ' + TEST_API_KEY,
        },
      },
    );
    expect(metaRes.ok).toEqual(true);
    expect(await metaRes.json()).toMatchObject([
      {
        key: 'custom',
        value: 'yes',
      },
      {
        key: 'domain',
        value: 'localhost',
      },
      {
        key: 'includePii',
        value: 'false', // TODO: could this be a real boolean?
      },
      {
        key: 'reality',
        value: 'updated',
      },
    ]);

    // no need to write to disk (we can e.g. allow rrweb output to change between versions)
    // WARNING: this would mutate scrub timestamps and change Meta urls!
    //await assertSnapshot(snapshots, true);
  });
});
