import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import 'mocha';
import * as puppeteer from 'puppeteer';
import * as rollup from 'rollup';
import typescript = require('rollup-plugin-typescript');
import { expect } from 'chai';

const htmlFolder = path.join(__dirname, 'html');
const htmls = fs.readdirSync(htmlFolder).map(filePath => {
  const raw = fs.readFileSync(path.resolve(htmlFolder, filePath), 'utf-8');
  if (/<!-- TEST_DIVIDER -->/.test(raw)) {
    const [src, dest] = raw.split('<!-- TEST_DIVIDER -->');
    return {
      filePath,
      src,
      dest,
    };
  }
  return {
    filePath,
    src: raw,
    dest: raw,
  };
});

interface IMimeType {
  [key: string]: string;
}

const server = () =>
  new Promise(resolve => {
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

describe('integration tests', () => {
  before(async () => {
    this.server = await server();
    this.browser = await puppeteer.launch({
      // headless: false,
      executablePath: '/home/yanzhen/Desktop/chrome-linux/chrome',
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

  for (const html of htmls.slice(0, 10)) {
    it('[html file]: ' + html.filePath, async () => {
      const page: puppeteer.Page = await this.browser.newPage();
      // console for debug
      // tslint:disable-next-line: no-console
      page.on('console', msg => console.log(msg.text()));
      await page.goto(`http://localhost:3030/html`);
      await page.setContent(html.src);
      await page.evaluate(() => {
        const x = new XMLSerializer();
        return x.serializeToString(document);
      });
      const rebuildHtml = (await page.evaluate(`${this.code}
        const x = new XMLSerializer();
        const [snap] = rrweb.snapshot(document);
        x.serializeToString(rrweb.rebuild(snap));
      `)).replace(/\n\n/g, '');
      await page.goto(`http://localhost:3030/html`);
      await page.setContent(html.dest);
      const destHtml = (await page.evaluate(() => {
        const x = new XMLSerializer();
        return x.serializeToString(document);
      })).replace(/\n\n/g, '');
      expect(rebuildHtml).to.equal(destHtml);
    }).timeout(5000);
  }
});
