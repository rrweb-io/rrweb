import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import 'mocha';
import * as puppeteer from 'puppeteer';
import * as rollup from 'rollup';
import typescript = require('rollup-plugin-typescript');
import { assert } from 'chai';
import { SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import { Suite } from 'mocha';

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

const server = () =>
  new Promise<http.Server>((resolve) => {
    const mimeType: IMimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
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

function matchSnapshot(actual: string, testFile: string, testTitle: string) {
  const snapshotState = new SnapshotState(testFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
  });

  const matcher = toMatchSnapshot.bind({
    snapshotState,
    currentTestName: testTitle,
  });
  const result = matcher(actual);
  snapshotState.save();
  return result;
}

interface ISuite extends Suite {
  server: http.Server;
  browser: puppeteer.Browser;
  code: string;
}

describe('integration tests', function (this: ISuite) {
  before(async () => {
    this.server = await server();
    this.browser = await puppeteer.launch({
      // headless: false,
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/index.ts'),
      plugins: [typescript()],
    });
    const { code } = await bundle.generate({
      name: 'rrweb',
      format: 'iife',
    });
    this.code = code;
  });

  after(async () => {
    await this.browser.close();
    await this.server.close();
  });

  for (const html of htmls) {
    const title = '[html file]: ' + html.filePath;
    it(title, async () => {
      const page: puppeteer.Page = await this.browser.newPage();
      // console for debug
      // tslint:disable-next-line: no-console
      page.on('console', (msg) => console.log(msg.text()));
      await page.goto(`http://localhost:3030/html`);
      await page.setContent(html.src, {
        waitUntil: 'load',
      });
      const rebuildHtml = (
        await page.evaluate(`${this.code}
        const x = new XMLSerializer();
        const [snap] = rrweb.snapshot(document);
        x.serializeToString(rrweb.rebuild(snap, { doc: document })[0]);
      `)
      ).replace(/\n\n/g, '');
      const result = matchSnapshot(rebuildHtml, __filename, title);
      assert(result.pass, result.pass ? '' : result.report());
    }).timeout(5000);
  }
});

describe('iframe integration tests', function (this: ISuite) {
  const iframeHtml = path.join(__dirname, 'iframe-html/main.html');
  const raw = fs.readFileSync(iframeHtml, 'utf-8');

  before(async () => {
    this.server = await server();
    this.browser = await puppeteer.launch({
      // headless: false,
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/index.ts'),
      plugins: [typescript()],
    });
    const { code } = await bundle.generate({
      name: 'rrweb',
      format: 'iife',
    });
    this.code = code;
  });

  after(async () => {
    await this.browser.close();
    await this.server.close();
  });

  it('snapshot async iframes', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    // console for debug
    // tslint:disable-next-line: no-console
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`http://localhost:3030/html`);
    await page.setContent(raw, {
      waitUntil: 'load',
    });
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${this.code};
      rrweb.snapshot(document)[0];
    `),
      null,
      2,
    );
    const result = matchSnapshot(snapshotResult, __filename, this.title);
    assert(result.pass, result.pass ? '' : result.report());
  }).timeout(5000);
});

describe('shadown DOM integration tests', function (this: ISuite) {
  const shadowDomHtml = path.join(__dirname, 'html/shadow-dom.html');
  const raw = fs.readFileSync(shadowDomHtml, 'utf-8');

  before(async () => {
    this.server = await server();
    this.browser = await puppeteer.launch({
      // headless: false,
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/index.ts'),
      plugins: [typescript()],
    });
    const { code } = await bundle.generate({
      name: 'rrweb',
      format: 'iife',
    });
    this.code = code;
  });

  after(async () => {
    await this.browser.close();
    await this.server.close();
  });

  it('snapshot shadow DOM', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    // console for debug
    // tslint:disable-next-line: no-console
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`http://localhost:3030/html`);
    await page.setContent(raw, {
      waitUntil: 'load',
    });
    const snapshotResult = JSON.stringify(
      await page.evaluate(`${this.code};
      rrweb.snapshot(document)[0];
    `),
      null,
      2,
    );
    const result = matchSnapshot(snapshotResult, __filename, this.title);
    assert(result.pass, result.pass ? '' : result.report());
  }).timeout(5000);
});
