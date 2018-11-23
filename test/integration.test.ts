import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { assert } from 'chai';
import { SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import { EventType, IncrementalSource, eventWithTime } from '../src/types';
import { NodeType } from 'rrweb-snapshot';

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
function stringifySnapshots(snapshots: eventWithTime[]): string {
  return JSON.stringify(
    snapshots
      .filter(s => {
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseMove
        ) {
          return false;
        }
        return true;
      })
      .map(s => {
        if (s.type === EventType.Meta) {
          s.data.href = 'about:blank';
        }
        // FIXME: travis coordinates seems different with my laptop
        const coordinatesReg = /(bottom|top|left|right)/;
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseInteraction
        ) {
          delete s.data.x;
          delete s.data.y;
        }
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.Mutation
        ) {
          s.data.attributes.forEach(a => {
            if (
              'style' in a.attributes &&
              coordinatesReg.test(a.attributes.style!)
            ) {
              delete a.attributes.style;
            }
          });
          s.data.adds.forEach(add => {
            if (
              add.node.type === NodeType.Element &&
              'style' in add.node.attributes &&
              typeof add.node.attributes.style === 'string' &&
              coordinatesReg.test(add.node.attributes.style)
            ) {
              delete add.node.attributes.style;
            }
          });
        }
        return s;
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
      rrweb.record({
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

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    this.code = fs.readFileSync(bundlePath, 'utf8');
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
