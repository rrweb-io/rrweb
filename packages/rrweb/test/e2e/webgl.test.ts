import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { startServer, launchPuppeteer, getServerURL } from '../utils';
import {
  recordOptions,
  eventWithTime,
  EventType,
  IncrementalSource,
} from '../../src/types';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
expect.extend({ toMatchImageSnapshot });

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  server: http.Server;
  page: puppeteer.Page;
  events: eventWithTime[];
  serverURL: string;
}


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

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.min.js');
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
    return html.replace(
      '</body>',
      `
    <script>
      ${code}
      window.snapshots = [];
      rrweb.record({
        emit: event => {          
          window.snapshots.push(event);
        },
        maskTextSelector: ${JSON.stringify(options.maskTextSelector)},
        maskAllInputs: ${options.maskAllInputs},
        maskInputOptions: ${JSON.stringify(options.maskAllInputs)},
        userTriggeredOnInput: ${options.userTriggeredOnInput},
        maskTextFn: ${options.maskTextFn},
        recordCanvas: ${options.recordCanvas},
        plugins: ${options.plugins}        
      });
    </script>
    </body>
    `,
    );
  };

  const fakeGoto = async (page: puppeteer.Page, url: string) => {
    const intercept = async (request: puppeteer.HTTPRequest) => {
      await request.respond({
        status: 200,
        contentType: 'text/html',
        body: ' ', // non-empty string or page will load indefinitely
      });
    };
    await page.setRequestInterception(true);
    page.on('request', intercept);
    await page.goto(url);
    page.off('request', intercept);
    await page.setRequestInterception(false);
  };

  const hideMouseAnimation = async (page: puppeteer.Page) => {
    await page.addStyleTag({
      content: '.replayer-mouse-tail{display: none !important;}',
    });
  };

  it('will record and replay a webgl square', async () => {
    page = await browser.newPage();
    await fakeGoto(page, `${serverURL}/html/canvas-webgl-square.html`);

    await page.setContent(
      getHtml.call(this, 'canvas-webgl-square.html', { recordCanvas: true }),
    );

    await page.waitForTimeout(100);
    const snapshots: eventWithTime[] = await page.evaluate('window.snapshots');

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
    await page.waitForTimeout(50);

    const element = await page.$('iframe');
    const frameImage = await element!.screenshot();

    expect(frameImage).toMatchImageSnapshot();
  });

  it('will record and replay a webgl image', async () => {
    page = await browser.newPage();
    await fakeGoto(page, `${serverURL}/html/canvas-webgl-image.html`);

    await page.setContent(
      getHtml.call(this, 'canvas-webgl-image.html', { recordCanvas: true }),
    );

    await page.waitForTimeout(100);
    const snapshots: eventWithTime[] = await page.evaluate('window.snapshots');

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
    await page.waitForTimeout(50);

    const element = await page.$('iframe');
    const frameImage = await element!.screenshot();

    expect(frameImage).toMatchImageSnapshot();
  });
});
