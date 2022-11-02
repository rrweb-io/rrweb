import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import {
  startServer,
  launchPuppeteer,
  getServerURL,
  replaceLast,
  waitForRAF,
  generateRecordSnippet,
  ISuite,
} from '../utils';
import type { recordOptions, eventWithTime } from '../../src/types';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
expect.extend({ toMatchImageSnapshot });

describe('e2e webgl', () => {
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.js');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await server.close();
    await browser.close();
  });

  const getHtml = (
    fileName: string,
    options: recordOptions<eventWithTime> = {},
  ): string => {
    const filePath = path.resolve(__dirname, `../html/${fileName}`);
    const html = fs.readFileSync(filePath, 'utf8');
    return replaceLast(
      html,
      '</body>',
      `
    <script>
      ${code}
      ${generateRecordSnippet(options)}
    </script>
    </body>
    `,
    );
  };

  const fakeGoto = async (p: puppeteer.Page, url: string) => {
    const intercept = async (request: puppeteer.HTTPRequest) => {
      await request.respond({
        status: 200,
        contentType: 'text/html',
        body: ' ', // non-empty string or page will load indefinitely
      });
    };
    await p.setRequestInterception(true);
    p.on('request', intercept);
    await p.goto(url);
    p.off('request', intercept);
    await p.setRequestInterception(false);
  };

  const hideMouseAnimation = async (p: puppeteer.Page) => {
    await p.addStyleTag({
      content: `.replayer-mouse-tail{display: none !important;}
                html, body { margin: 0; padding: 0; }
                iframe { border: none; }`,
    });
  };

  it('will record and replay a webgl square', async () => {
    page = await browser.newPage();
    await fakeGoto(page, `${serverURL}/html/canvas-webgl-square.html`);

    await page.setContent(
      getHtml.call(this, 'canvas-webgl-square.html', { recordCanvas: true }),
    );

    await waitForRAF(page);

    const snapshots: eventWithTime[] = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];

    page = await browser.newPage();

    await page.goto('about:blank');
    await page.evaluate(code);

    await hideMouseAnimation(page);
    await page.evaluate(`let events = ${JSON.stringify(snapshots)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
        UNSAFE_replayCanvas: true,
      });
      replayer.play(500);
    `);
    await waitForRAF(page);

    const frameImage = await page!.screenshot();
    await waitForRAF(page);
    expect(frameImage).toMatchImageSnapshot();
  });

  it('will record and replay a webgl image', async () => {
    page = await browser.newPage();
    await fakeGoto(page, `${serverURL}/html/canvas-webgl-image.html`);

    await page.setContent(
      getHtml.call(this, 'canvas-webgl-image.html', { recordCanvas: true }),
    );

    await waitForRAF(page);
    await page.waitForTimeout(100);
    const snapshots: eventWithTime[] = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];

    page = await browser.newPage();

    await page.goto('about:blank');
    await page.evaluate(code);

    await hideMouseAnimation(page);
    await page.evaluate(`let events = ${JSON.stringify(snapshots)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
        UNSAFE_replayCanvas: true,
      });
    `);
    // wait for iframe to get added and `preloadAllImages` to ge called
    await page.waitForSelector('iframe');
    await page.evaluate(`replayer.play(500);`);
    await waitForRAF(page);

    const frameImage = await page!.screenshot();
    expect(frameImage).toMatchImageSnapshot();
  });
});
