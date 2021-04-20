import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as puppeteer from 'puppeteer';
import { assertSnapshot, launchPuppeteer } from './utils';
import { Suite } from 'mocha';
import { expect } from 'chai';
import { recordOptions, eventWithTime, EventType } from '../src/types';
import { visitSnapshot, NodeType } from 'rrweb-snapshot';

interface ISuite extends Suite {
  server: http.Server;
  code: string;
  browser: puppeteer.Browser;
}

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
        setTimeout(() => {
          res.end(data);
          // mock delay
        }, 100);
      } catch (error) {
        res.end();
      }
    });
    s.listen(3030).on('listening', () => {
      resolve(s);
    });
  });

describe('record integration tests', function (this: ISuite) {
  this.timeout(10_000);

  const getHtml = (
    fileName: string,
    options: recordOptions<eventWithTime> = {},
  ): string => {
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
          window.snapshots.push(event);
        },
        maskTextSelector: ${JSON.stringify(options.maskTextSelector)},
        maskAllInputs: ${options.maskAllInputs},
        maskInputOptions: ${JSON.stringify(options.maskAllInputs)},
        maskTextFn: ${options.maskTextFn},
        recordCanvas: ${options.recordCanvas},
        recordLog: ${options.recordLog},
      });
    </script>
    </body>
    `,
    );
  };

  before(async () => {
    this.server = await server();
    this.browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.min.js');
    this.code = fs.readFileSync(bundlePath, 'utf8');
  });

  after(async () => {
    await this.browser.close();
    this.server.close();
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
  });

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
  });

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
  });

  it('can freeze mutations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html'));

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      ul.appendChild(li);
      li.setAttribute('foo', 'bar');
      document.body.setAttribute('test', 'true');
    });
    await page.evaluate('rrweb.freezePage()');
    await page.evaluate(() => {
      document.body.setAttribute('test', 'bad');
      const ul = document.querySelector('ul') as HTMLUListElement;
      const li = document.createElement('li');
      li.setAttribute('bad-attr', 'bad');
      li.innerText = 'bad text';
      ul.appendChild(li);
      document.body.removeChild(ul);
    });
    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'frozen');
  });

  it('should not record input events on ignored elements', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'ignore.html'));

    await page.type('input[type="password"]', 'password');
    await page.type('.rr-ignore', 'secret');

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'ignore');
  });

  it('should not record input values if maskAllInputs is enabled', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'form.html', { maskAllInputs: true }),
    );

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('textarea', 'textarea test');
    await page.select('select', '1');

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'mask');
  });

  it('can use maskInputOptions to configure which type of inputs should be masked', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'form.html', {
        maskInputOptions: {
          text: false,
          textarea: false,
        },
      }),
    );

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('textarea', 'textarea test');
    await page.select('select', '1');

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'maskInputOptions');
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

  it('should record DOM node movement 1', async () => {
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
    assertSnapshot(snapshots, __filename, 'move-node-1');
  });

  it('should record DOM node movement 2', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'move-node.html'));

    await page.evaluate(() => {
      const div = document.createElement('div');
      const span = document.querySelector('span')!;
      document.body.appendChild(div);
      div.appendChild(span);
    });
    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'move-node-2');
  });

  it('should record dynamic CSS changes', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'react-styled-components.html'));
    await page.click('.toggle');
    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'react-styled-components');
  });

  it('should record canvas mutations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'canvas.html', {
        recordCanvas: true,
      }),
    );
    await page.waitFor(50);
    const snapshots = await page.evaluate('window.snapshots');
    for (const event of snapshots) {
      if (event.type === EventType.FullSnapshot) {
        visitSnapshot(event.data.node, (n) => {
          if (n.type === NodeType.Element && n.attributes.rr_dataURL) {
            n.attributes.rr_dataURL = `LOOKS LIKE WE COULD NOT GET STABLE BASE64 FROM SAME IMAGE.`;
          }
        });
      }
    }
    assertSnapshot(snapshots, __filename, 'canvas');
  });

  it('will serialize node before record', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html'));

    await page.evaluate(() => {
      const ul = document.querySelector('ul') as HTMLUListElement;
      let count = 3;
      while (count > 0) {
        count--;
        const li = document.createElement('li');
        ul.appendChild(li);
      }
    });

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'serialize-before-record');
  });

  it('will defer missing next node mutation', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'shuffle.html'));

    const text = await page.evaluate(() => {
      const els = Array.prototype.slice.call(document.querySelectorAll('li'));
      const parent = document.querySelector('ul')!;
      parent.removeChild(els[3]);
      parent.removeChild(els[2]);
      parent.removeChild(els[1]);
      parent.removeChild(els[0]);
      parent.insertBefore(els[3], els[4]);
      parent.insertBefore(els[2], els[4]);
      parent.insertBefore(els[1], els[4]);
      parent.insertBefore(els[0], els[4]);
      return parent.innerText;
    });

    expect(text).to.equal('4\n3\n2\n1\n5');
  });

  it('can record log mutation', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'log.html', {
        recordLog: true,
      }),
    );

    await page.evaluate(() => {
      console.assert(0 == 0, 'assert');
      console.count('count');
      console.countReset('count');
      console.debug('debug');
      console.dir('dir');
      console.dirxml('dirxml');
      console.group();
      console.groupCollapsed();
      console.info('info');
      console.log('log');
      console.table('table');
      console.time();
      console.timeEnd();
      console.timeLog();
      console.trace('trace');
      console.warn('warn');
      console.clear();
    });

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'log');
  });

  it('should nest record iframe', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto(`http://localhost:3030/html`);
    await page.setContent(getHtml.call(this, 'main.html'));

    await page.waitFor(500);
    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'iframe');
  });

  it('should record shadow DOM', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'shadow-dom.html'));

    await page.evaluate(() => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const el = document.querySelector('.my-element') as HTMLDivElement;
      const shadowRoot = el.shadowRoot as ShadowRoot;
      shadowRoot.appendChild(document.createElement('p'));
      sleep(1)
        .then(() => {
          shadowRoot.lastChild!.appendChild(document.createElement('p'));
          return sleep(1);
        })
        .then(() => {
          const firstP = shadowRoot.querySelector('p') as HTMLParagraphElement;
          shadowRoot.removeChild(firstP);
          return sleep(1);
        })
        .then(() => {
          (shadowRoot.lastChild!.childNodes[0] as HTMLElement).innerText = 'hi';
          return sleep(1);
        })
        .then(() => {
          (shadowRoot.lastChild!.childNodes[0] as HTMLElement).innerText =
            '123';
        });
    });
    await page.waitFor(50);

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'shadow-dom');
  });

  it('should mask texts', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mask-text.html', {
        maskTextSelector: '[data-masking="true"]',
      }),
    );

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'mask-text');
  });

  it('should mask texts using maskTextFn', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mask-text.html', {
        maskTextSelector: '[data-masking="true"]',
        maskTextFn: (t: string) => t.replace(/[a-z]/g, '*'),
      }),
    );

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'mask-text-fn');
  });

  it('can mask character data mutations', async () => {
    const page: puppeteer.Page = await this.browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html'));

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      const p = document.querySelector('p') as HTMLParagraphElement;
      [li, p].forEach((element) => {
        element.className = 'rr-mask';
      });
      ul.appendChild(li);
      li.innerText = 'new list item';
      p.innerText = 'mutated';
    });

    const snapshots = await page.evaluate('window.snapshots');
    assertSnapshot(snapshots, __filename, 'mask-character-data');
  });
});
