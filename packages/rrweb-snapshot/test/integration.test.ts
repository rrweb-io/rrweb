import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as url from 'url';
import {
  afterAll,
  assert,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getServerURL, waitForRAF } from './utils';

const htmlFolder = path.join(__dirname, 'html');
const htmls = fs.readdirSync(htmlFolder).map((filePath) => {
  const raw = fs.readFileSync(path.resolve(htmlFolder, filePath), 'utf-8');
  return {
    filePath,
    src: raw,
  };
});

interface IMimeType {
  [key: string]: string;
}

const startServer = (defaultPort: number = 3030) =>
  new Promise<http.Server>((resolve) => {
    const mimeType: IMimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
    };
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!);
      const sanitizePath = path
        .normalize(parsedUrl.pathname!)
        .replace(/^(\.\.[\/\\])+/, '');
      let pathname = path.join(__dirname, sanitizePath);
      try {
        const data = fs.readFileSync(pathname);
        const ext = path.parse(pathname).ext;
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-type');
        res.end(data);
      } catch (error) {
        res.end();
      }
    });
    s.listen(defaultPort)
      .on('listening', () => {
        resolve(s);
      })
      .on('error', (e) => {
        s.listen().on('listening', () => {
          resolve(s);
        });
      });
  });

function sanitizeSnapshot(snapshot: string): string {
  return snapshot.replace(/localhost:[0-9]+/g, 'localhost:3030');
}

async function snapshot(page: puppeteer.Page, code: string): Promise<string> {
  await waitForRAF(page);
  const result = (await page.evaluate(`${code}
    const snapshot = rrwebSnapshot.snapshot(document);
    JSON.stringify(snapshot, null, 2);
  `)) as string;
  return result;
}

function assertSnapshot(snapshot: string): void {
  expect(sanitizeSnapshot(snapshot)).toMatchSnapshot();
}

interface ISuite {
  server: http.Server;
  serverURL: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  code: string;
}

describe('integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 30_000 });
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await puppeteer.launch({
      // headless: false,
    });

    code = fs.readFileSync(
      path.resolve(__dirname, '../dist/rrweb-snapshot.umd.cjs'),
      'utf-8',
    );
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  for (const html of htmls) {
    if (html.filePath.substring(html.filePath.length - 1) === '~') {
      continue;
    }
    // monkey patching breaks rebuild code
    if (html.filePath.includes('monkey-patched-elements.html')) continue;

    const title = '[html file]: ' + html.filePath;
    it(title, async () => {
      const page: puppeteer.Page = await browser.newPage();
      // console for debug
      page.on('console', (msg) => console.log(msg.text()));
      if (html.filePath === 'iframe.html') {
        // loading directly is needed to ensure we don't trigger compatMode='BackCompat'
        // which happens before setContent can be called
        await page.goto(`${serverURL}/html/${html.filePath}`, {
          waitUntil: 'load',
        });
        const outerCompatMode = await page.evaluate('document.compatMode');
        const innerCompatMode = await page.evaluate(
          'document.querySelector("iframe").contentDocument.compatMode',
        );
        assert(
          outerCompatMode === 'CSS1Compat',
          outerCompatMode +
            ' for outer iframe.html should be CSS1Compat as it has "<!DOCTYPE html>"',
        );
        // inner omits a doctype so gets rendered in backwards compat mode
        // although this was originally accidental, we'll add a synthetic doctype to the rebuild to recreate this
        assert(
          innerCompatMode === 'BackCompat',
          innerCompatMode +
            ' for iframe-inner.html should be BackCompat as it lacks "<!DOCTYPE html>"',
        );
      } else {
        // loading indirectly is improtant for relative path testing
        await page.goto(`${serverURL}/html`);
        await page.setContent(html.src, {
          waitUntil: 'load',
        });
      }
      await waitForRAF(page);
      const rebuildHtml = (
        (await page.evaluate(`${code}
        const x = new XMLSerializer();
        const snap = rrwebSnapshot.snapshot(document);
        let out = x.serializeToString(rrwebSnapshot.rebuild(snap, { doc: document }));
        if (document.querySelector('html').getAttribute('xmlns') !== 'http://www.w3.org/1999/xhtml') {
          // this is just an artefact of serializeToString
          out = out.replace(' xmlns=\"http://www.w3.org/1999/xhtml\"', '');
        }
        out;  // return
      `)) as string
      )
        .replace(/\n\n/g, '')
        .replace(
          /blob:http:\/\/localhost:\d+\/[0-9a-z\-]+/,
          'blob:http://localhost:xxxx/...',
        );

      await assertSnapshot(rebuildHtml);
    });
  }

  it('correctly triggers backCompat mode and rendering', async () => {
    const page: puppeteer.Page = await browser.newPage();
    // console for debug
    page.on('console', (msg) => console.log(msg.text()));

    await page.goto(`${serverURL}/html/compat-mode.html`, {
      waitUntil: 'load',
    });
    const compatMode = await page.evaluate('document.compatMode');
    assert(
      compatMode === 'BackCompat',
      compatMode +
        ' for compat-mode.html should be BackCompat as DOCTYPE is deliberately omitted',
    );
    const renderedHeight = (await page.evaluate(
      'document.querySelector("center").clientHeight',
    )) as number;
    // can remove following assertion if dimensions of page change
    assert(
      renderedHeight < 400,
      `pre-check: images will be rendered ~326px high in BackCompat mode, and ~588px in CSS1Compat mode; getting: ${renderedHeight}px`,
    );
    const rebuildRenderedHeight = await page.evaluate(`${code}
const snap = rrwebSnapshot.snapshot(document);
const iframe = document.createElement('iframe');
iframe.setAttribute('width', document.body.clientWidth)
iframe.setAttribute('height', document.body.clientHeight)
iframe.style.transform = 'scale(0.3)'; // mini-me
document.body.appendChild(iframe);
// magic here! rebuild in a new iframe
const rebuildNode = rrwebSnapshot.rebuild(snap, { doc: iframe.contentDocument })[0];
iframe.contentDocument.querySelector('center').clientHeight
`);
    const rebuildCompatMode = await page.evaluate(
      'document.querySelector("iframe").contentDocument.compatMode',
    );
    assert(
      rebuildCompatMode === 'BackCompat',
      "rebuilt compatMode should match source compatMode, but doesn't: " +
        rebuildCompatMode,
    );
    assert(
      rebuildRenderedHeight === renderedHeight,
      'rebuilt height (${rebuildRenderedHeight}) should equal original height (${renderedHeight})',
    );
  });

  it('correctly saves images offline', async () => {
    const page: puppeteer.Page = await browser.newPage();

    await page.goto(`${serverURL}/html/picture.html`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('img', { timeout: 1000 });
    await page.evaluate(`${code}
    var snapshot = rrwebSnapshot.snapshot(document, {
        dataURLOptions: { type: "image/webp", quality: 0.8 },
        inlineImages: true,
        inlineStylesheet: false
    })`);
    // don't wait, as we want to ensure that the same-origin image can be inlined immediately
    const bodyChildren = (await page.evaluate(`
      snapshot.childNodes[0].childNodes[1].childNodes.filter((cn) => cn.type === 2);
`)) as any[];
    expect(bodyChildren[1]).toEqual(
      expect.objectContaining({
        tagName: 'img',
        attributes: {
          src: expect.stringMatching(/images\/robot.png$/),
          alt: 'This is a robot',
          rr_dataURL: expect.stringMatching(/^data:image\/webp;base64,/),
        },
      }),
    );
  });

  it('correctly saves cross-origin images offline', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank', {
      waitUntil: 'load',
    });
    await page.setContent(
      `
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <img src="${getServerURL(
      server,
    )}/images/rrweb-favicon-20x20.png" alt="CORS restricted but has access-control-allow-origin: *" />
  </body>
</html>
`,
      {
        waitUntil: 'load',
      },
    );

    await page.waitForSelector('img', { timeout: 1000 });
    const snapshot =
      await page.evaluate(`${code}var snapshot = rrwebSnapshot.snapshot(document, {
        dataURLOptions: { type: "image/webp", quality: 0.8 },
        inlineImages: true,
        inlineStylesheet: false
    })`);
    await waitForRAF(page); // need a small wait, as after the crossOrigin="anonymous" change, the snapshot triggers a reload of the image (after which, the snapshot is mutated)
    const bodyChildren = (await page.evaluate(`
      snapshot.childNodes[0].childNodes[1].childNodes.filter((cn) => cn.type === 2);
`)) as any[];
    expect(bodyChildren[0]).toEqual(
      expect.objectContaining({
        tagName: 'img',
        attributes: {
          src: getServerURL(server) + '/images/rrweb-favicon-20x20.png',
          alt: 'CORS restricted but has access-control-allow-origin: *',
          rr_dataURL: expect.stringContaining('data:image/png;base64,'),
        },
      }),
    );
  });

  it('correctly saves blob:images offline', async () => {
    const page: puppeteer.Page = await browser.newPage();

    await page.goto(`${serverURL}/html/picture-blob.html`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('img', { timeout: 1000 });
    await page.evaluate(`${code}var snapshot = rrwebSnapshot.snapshot(document, {
        dataURLOptions: { type: "image/webp", quality: 0.8 },
        inlineImages: true,
        inlineStylesheet: false
    })`);
    await waitForRAF(page);
    const snapshot = (await page.evaluate(
      'JSON.stringify(snapshot, null, 2);',
    )) as string;
    assert(snapshot.includes('"rr_dataURL"'));
    assert(snapshot.includes('data:image/webp;base64,'));
  });

  it('correctly saves images in iframes offline', async () => {
    const page: puppeteer.Page = await browser.newPage();

    await page.goto(`${serverURL}/html/picture-in-frame.html`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('iframe', { timeout: 1000 });
    await waitForRAF(page); // wait for page to render
    await page.evaluate(`${code}
        rrwebSnapshot.snapshot(document, {
        dataURLOptions: { type: "image/webp", quality: 0.8 },
        inlineImages: true,
        inlineStylesheet: false,
        onIframeLoad: function(iframe, sn) {
          window.snapshot = sn;
        }
    })`);
    await waitForRAF(page);
    const snapshot = (await page.evaluate(
      'JSON.stringify(window.snapshot, null, 2);',
    )) as string;
    assert(snapshot.includes('"rr_dataURL"'));
    assert(snapshot.includes('data:image/webp;base64,'));
  });

  it('correctly saves blob:images in iframes offline', async () => {
    const page: puppeteer.Page = await browser.newPage();

    await page.goto(`${serverURL}/html/picture-blob-in-frame.html`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('iframe', { timeout: 1000 });
    await waitForRAF(page); // wait for page to render
    await page.evaluate(`${code}
        rrwebSnapshot.snapshot(document, {
        dataURLOptions: { type: "image/webp", quality: 0.8 },
        inlineImages: true,
        inlineStylesheet: false,
        onIframeLoad: function(iframe, sn) {
          window.snapshot = sn;
        }
    })`);
    await waitForRAF(page);
    const snapshot = (await page.evaluate(
      'JSON.stringify(window.snapshot, null, 2);',
    )) as string;
    assert(snapshot.includes('"rr_dataURL"'));
    assert(snapshot.includes('data:image/webp;base64,'));
  });

  it('should save background-clip: text; as the more compatible -webkit-background-clip: test;', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(`${serverURL}/html/background-clip-text.html`, {
      waitUntil: 'load',
    });
    await waitForRAF(page); // wait for page to render
    await page.evaluate(`${code}
        window.snapshot = rrwebSnapshot.snapshot(document, {
        inlineStylesheet: true,
    })`);
    await waitForRAF(page);
    const snapshot = (await page.evaluate(
      'JSON.stringify(window.snapshot, null, 2);',
    )) as string;
    assert(snapshot.includes('-webkit-background-clip: text;'));
  });

  it('images with inline onload should work', async () => {
    const page: puppeteer.Page = await browser.newPage();

    await page.goto(`${serverURL}/html/picture-with-inline-onload.html`, {
      waitUntil: 'load',
    });
    await page.waitForSelector('img', { timeout: 2000 });
    await page.evaluate(`${code}`);
    await page.evaluate(`
    var snapshot = rrwebSnapshot.snapshot(document, {
      dataURLOptions: { type: "image/webp", quality: 0.8 },
      inlineImages: true,
      inlineStylesheet: false
    })`);
    await waitForRAF(page);
    const fnName = (await page.evaluate(
      'document.querySelector("img").onload.name',
    )) as string;
    assert(fnName === 'onload');
  });

  it('should be able to record elements even when .childNodes has been monkey patched', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(`${serverURL}/html/monkey-patched-elements.html`, {
      waitUntil: 'load',
    });
    await waitForRAF(page); // wait for page to render
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${code};
          rrwebSnapshot.snapshot(document);
        `),
      null,
      2,
    );
    expect(snapshotResult).toMatchSnapshot();
  });
});

describe('iframe integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 30_000 });
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await puppeteer.launch({
      // headless: false,
    });

    code = fs.readFileSync(
      path.resolve(__dirname, '../dist/rrweb-snapshot.umd.cjs'),
      'utf-8',
    );
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('snapshot async iframes', async () => {
    const page: puppeteer.Page = await browser.newPage();
    // console for debug
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`${serverURL}/iframe-html/main.html`, {
      waitUntil: 'load',
    });
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${code};
      rrwebSnapshot.snapshot(document);
    `),
      null,
      2,
    );
    await assertSnapshot(snapshotResult);
  });
});

describe('dialog integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 30_000 });
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];
  let page: ISuite['page'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await puppeteer.launch({
      // headless: false,
    });

    code = fs.readFileSync(
      path.resolve(__dirname, '../dist/rrweb-snapshot.umd.cjs'),
      'utf-8',
    );
  });

  beforeEach(async () => {
    page = await browser.newPage();
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`${serverURL}/html/dialog.html`, {
      waitUntil: 'load',
    });
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('should capture open attribute for non modal dialogs', async () => {
    page.evaluate('document.querySelector("dialog").show()');
    const snapshotResult = await snapshot(page, code);
    assertSnapshot(snapshotResult);
  });

  it('should capture open attribute for modal dialogs', async () => {
    await page.evaluate('document.querySelector("dialog").showModal()');
    const snapshotResult = await snapshot(page, code);
    assertSnapshot(snapshotResult);
  });
});

describe('shadow DOM integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 30_000 });
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await puppeteer.launch({
      // headless: false,
    });

    code = fs.readFileSync(
      path.resolve(__dirname, '../dist/rrweb-snapshot.umd.cjs'),
      'utf-8',
    );
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('snapshot shadow DOM', async () => {
    const page: puppeteer.Page = await browser.newPage();
    // console for debug
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`${serverURL}/html/shadow-dom.html`, {
      waitUntil: 'load',
    });
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${code};
      rrwebSnapshot.snapshot(document);
    `),
      null,
      2,
    );
    await assertSnapshot(snapshotResult);
  });
});
