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
  waitForIFrameLoad,
  replaceLast,
  generateRecordSnippet,
  ISuite,
} from './utils';
import type { recordOptions } from '../src/types';
import { eventWithTime, NodeType, EventType } from '@rrweb/types';
import { visitSnapshot } from 'rrweb-snapshot';

describe('ws-client integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 10_000 });

  const getHtml = (
    fileName: string,
    options: recordOptions<eventWithTime> = {},
  ): string => {
    if (!options.captureAssets) {
      // for consistency in the tests, don't create small stylesheet assets
      options.captureAssets = {
        stylesheetsRuleThreshold: 10
      };
    }
    options.emit = "emitFnName";
    options.serverUrl = 'https://localhost:8787/recordings/{recordingId}/ingest/ws';
    
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
    //code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });

  it('can record events', async () => {
    const page: puppeteer.Page = await browser.newPage();
    
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(testServerURL);  // need a real domain for sessionStorage
    await page.setContent(getHtml.call(this, 'link.html'));

    await page.waitForTimeout(50);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots, true);
  });

});
