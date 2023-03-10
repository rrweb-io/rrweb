import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as puppeteer from 'puppeteer';
import * as rollup from 'rollup';
import * as typescript from 'rollup-plugin-typescript2';
import * as assert from 'assert';
import { waitForRAF } from './utils';

const _typescript = typescript as unknown as () => rollup.Plugin;

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

const startServer = () =>
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
    s.listen(3030).on('listening', () => {
      resolve(s);
    });
  });

interface ISuite {
  server: http.Server;
  browser: puppeteer.Browser;
  code: string;
}

describe('integration tests', function (this: ISuite) {
  jest.setTimeout(30_000);
  let server: ISuite['server'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];

  beforeAll(async () => {
    server = await startServer();
    browser = await puppeteer.launch({
      // headless: false,
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/index.ts'),
      plugins: [_typescript()],
    });
    const {
      output: [{ code: _code }],
    } = await bundle.generate({
      name: 'rrweb',
      format: 'iife',
    });
    code = _code;
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  for (const html of htmls) {
    if (html.filePath.substring(html.filePath.length - 1) === '~') {
      continue;
    }
    const title = '[html file]: ' + html.filePath;
    it(title, async () => {
      const page: puppeteer.Page = await browser.newPage();
      // console for debug
      page.on('console', (msg) => console.log(msg.text()));
      if (html.filePath === 'iframe.html') {
        // loading directly is needed to ensure we don't trigger compatMode='BackCompat'
        // which happens before setContent can be called
        await page.goto(`http://localhost:3030/html/${html.filePath}`, {
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
        await page.goto(`http://localhost:3030/html`);
        await page.setContent(html.src, {
          waitUntil: 'load',
        });
      }
      await waitForRAF(page);
      const rebuildHtml = (
        (await page.evaluate(`${code}
        const x = new XMLSerializer();
        const snap = rrweb.snapshot(document);
        let out = x.serializeToString(rrweb.rebuild(snap, { doc: document }));
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
      expect(rebuildHtml).toMatchSnapshot();
    });
  }

  it('correctly triggers backCompat mode and rendering', async () => {
    const page: puppeteer.Page = await browser.newPage();
    // console for debug
    page.on('console', (msg) => console.log(msg.text()));

    await page.goto('http://localhost:3030/html/compat-mode.html', {
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
const snap = rrweb.snapshot(document);
const iframe = document.createElement('iframe');
iframe.setAttribute('width', document.body.clientWidth)
iframe.setAttribute('height', document.body.clientHeight)
iframe.style.transform = 'scale(0.3)'; // mini-me
document.body.appendChild(iframe);
// magic here! rebuild in a new iframe
const rebuildNode = rrweb.rebuild(snap, { doc: iframe.contentDocument })[0];
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

    await page.goto('http://localhost:3030/html/picture.html', {
      waitUntil: 'load',
    });
    await page.waitForSelector('img', { timeout: 1000 });
    await page.evaluate(`${code}var snapshot = rrweb.snapshot(document, {
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

  it('correctly saves blob:images offline', async () => {
    const page: puppeteer.Page = await browser.newPage();

    await page.goto('http://localhost:3030/html/picture-blob.html', {
      waitUntil: 'load',
    });
    await page.waitForSelector('img', { timeout: 1000 });
    await page.evaluate(`${code}var snapshot = rrweb.snapshot(document, {
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

    await page.goto('http://localhost:3030/html/picture-in-frame.html', {
      waitUntil: 'load',
    });
    await page.waitForSelector('iframe', { timeout: 1000 });
    await waitForRAF(page); // wait for page to render
    await page.evaluate(`${code}
        rrweb.snapshot(document, {
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

    await page.goto('http://localhost:3030/html/picture-blob-in-frame.html', {
      waitUntil: 'load',
    });
    await page.waitForSelector('iframe', { timeout: 1000 });
    await waitForRAF(page); // wait for page to render
    await page.evaluate(`${code}
        rrweb.snapshot(document, {
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
    await page.goto(`http://localhost:3030/html/background-clip-text.html`, {
      waitUntil: 'load',
    });
    await waitForRAF(page); // wait for page to render
    await page.evaluate(`${code}
        window.snapshot = rrweb.snapshot(document, {
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

    await page.goto(
      'http://localhost:3030/html/picture-with-inline-onload.html',
      {
        waitUntil: 'load',
      },
    );
    await page.waitForSelector('img', { timeout: 1000 });
    await page.evaluate(`${code}var snapshot = rrweb.snapshot(document, {
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
});

describe('iframe integration tests', function (this: ISuite) {
  jest.setTimeout(30_000);
  let server: ISuite['server'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];

  beforeAll(async () => {
    server = await startServer();
    browser = await puppeteer.launch({
      // headless: false,
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/index.ts'),
      plugins: [_typescript()],
    });
    const {
      output: [{ code: _code }],
    } = await bundle.generate({
      name: 'rrweb',
      format: 'iife',
    });
    code = _code;
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('snapshot async iframes', async () => {
    const page: puppeteer.Page = await browser.newPage();
    // console for debug
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`http://localhost:3030/iframe-html/main.html`, {
      waitUntil: 'load',
    });
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${code};
      rrweb.snapshot(document);
    `),
      null,
      2,
    );
    expect(snapshotResult).toMatchSnapshot();
  });
});

describe('shadow DOM integration tests', function (this: ISuite) {
  jest.setTimeout(30_000);
  let server: ISuite['server'];
  let browser: ISuite['browser'];
  let code: ISuite['code'];

  beforeAll(async () => {
    server = await startServer();
    browser = await puppeteer.launch({
      // headless: false,
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/index.ts'),
      plugins: [_typescript()],
    });
    const {
      output: [{ code: _code }],
    } = await bundle.generate({
      name: 'rrweb',
      format: 'iife',
    });
    code = _code;
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('snapshot shadow DOM', async () => {
    const page: puppeteer.Page = await browser.newPage();
    // console for debug
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`http://localhost:3030/html/shadow-dom.html`, {
      waitUntil: 'load',
    });
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${code};
      rrweb.snapshot(document);
    `),
      null,
      2,
    );
    expect(snapshotResult).toMatchSnapshot();
  });
});
