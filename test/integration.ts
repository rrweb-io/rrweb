import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { assert } from 'chai';
import * as rollup from 'rollup';
import typescript = require('rollup-plugin-typescript');
import resolve = require('rollup-plugin-node-resolve');
import { SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import { incrementalSnapshotEvent } from '../src/types';

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

/**
 * Puppeteer may cast random mouse move which make our tests flaky.
 * So we only do snapshot test with filtered events.
 * @param snapshots incrementalSnapshotEvent[]
 */
function stringifySnapshots(snapshots: incrementalSnapshotEvent[]): string {
  return JSON.stringify(
    snapshots.filter(s => {
      if (s.type === 3 && s.data.source === 1) {
        return false;
      }
      return true;
    }),
    null,
    2,
  );
}

describe('record integration tests', () => {
  function getHtml(fileName: string): string {
    const filePath = path.resolve(__dirname, `./html/${fileName}`);
    const html = fs.readFileSync(filePath, 'utf8');
    return html.replace(
      '</body>',
      `
    <script>
      ${this.code}
      window.Date.now = () => new Date(Date.UTC(2018, 10, 15, 8)).valueOf();
      window.snapshots = [];
      record({
        emit: event => {
          console.log(event);
          window.snapshots.push(event);
        }
      });
    </script>
    </body>
    `,
    );
  }

  before(async () => {
    this.browser = await puppeteer.launch({
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
      headless: false,
      args: ['--no-sandbox'],
    });

    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/record/index.ts'),
      plugins: [typescript(), resolve()],
    });
    const { code } = await bundle.generate({
      name: 'record',
      format: 'iife',
    });
    this.code = code;
  });

  after(async () => {
    await this.browser.close();
  });

  it('can record form interactions', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'form.html'));

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('textarea', 'textarea test');
    await page.select('select', '1');

    const snapshots = await page.evaluate('window.snapshots');
    const result = matchSnapshot(
      stringifySnapshots(snapshots),
      __filename,
      'form',
    );
    assert(result.pass, result.pass ? '' : result.report());
  }).timeout(5000);

  it('can record childList mutations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html'));

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      ul.appendChild(li);
      document.body.removeChild(ul);
      const p = document.querySelector('p') as HTMLParagraphElement;
      p.appendChild(document.createElement('span'));
    });

    const snapshots = await page.evaluate('window.snapshots');
    const result = matchSnapshot(
      stringifySnapshots(snapshots),
      __filename,
      'child-list',
    );
    assert(result.pass, result.pass ? '' : result.report());
  }).timeout(5000);

  it('can record character data muatations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html'));

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      ul.appendChild(li);
      li.innerText = 'new list item';
      li.innerText = 'new list item edit';
      document.body.removeChild(ul);
      const p = document.querySelector('p') as HTMLParagraphElement;
      p.innerText = 'mutated';
    });

    const snapshots = await page.evaluate('window.snapshots');
    const result = matchSnapshot(
      stringifySnapshots(snapshots),
      __filename,
      'character-data',
    );
    assert(result.pass, result.pass ? '' : result.report());
  });

  it('can record attribute mutation', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html'));

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      ul.appendChild(li);
      li.setAttribute('foo', 'bar');
      document.body.removeChild(ul);
      document.body.setAttribute('test', 'true');
    });

    const snapshots = await page.evaluate('window.snapshots');
    const result = matchSnapshot(
      stringifySnapshots(snapshots),
      __filename,
      'attributes',
    );
    assert(result.pass, result.pass ? '' : result.report());
  });

  it('can record node mutations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto(`data:text/html,${getHtml.call(this, 'select2.html')}`, {
      waitUntil: 'networkidle0',
    });

    // toggle the select box
    await page.click('.select2-container');
    await page.click('.select2-container');

    const snapshots = await page.evaluate('window.snapshots');
    const result = matchSnapshot(
      stringifySnapshots(snapshots),
      __filename,
      'select2',
    );
    assert(result.pass, result.pass ? '' : result.report());
  }).timeout(10000);
});
