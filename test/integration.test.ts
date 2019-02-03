import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { assertSnapshot } from './utils';

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
    assertSnapshot(snapshots, __filename, 'form');
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
    assertSnapshot(snapshots, __filename, 'child-list');
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
    assertSnapshot(snapshots, __filename, 'character-data');
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
    assertSnapshot(snapshots, __filename, 'attributes');
  });

  it('can record node mutations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'select2.html'), {
      waitUntil: 'networkidle0',
    });

    // toggle the select box
    await page.click('.select2-container');
    await page.click('.select2-container');

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'select2');
  }).timeout(10000);

  it('should not record input events on ignored elements', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'ignore.html'));

    await page.type('input[type="password"]', 'password');
    await page.type('.rr-ignore', 'secret');

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'ignore');
  });

  it('should not record blocked elements and its child nodes', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'block.html'));

    await page.type('input', 'should not be record');
    await page.evaluate(`document.getElementById('text').innerText = '1'`);
    await page.click('#text');

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'block');
  });

  it('should record DOM node movement', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'move-node.html'));

    await page.evaluate(() => {
      const div = document.querySelector('div')!;
      const p = document.querySelector('p')!;
      const span = document.querySelector('span')!;
      document.body.removeChild(span);
      p.appendChild(span);
      p.removeChild(span);
      div.appendChild(span);
    });
    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'move-node');
  });
});
