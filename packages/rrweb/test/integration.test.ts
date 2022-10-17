import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import {
  assertSnapshot,
  startServer,
  getServerURL,
  launchPuppeteer,
  waitForRAF,
  replaceLast,
  generateRecordSnippet,
  ISuite,
} from './utils';
import {
  recordOptions,
  eventWithTime,
  EventType,
  RecordPlugin,
} from '../src/types';
import { visitSnapshot, NodeType } from 'rrweb-snapshot';

describe('record integration tests', function (this: ISuite) {
  jest.setTimeout(10_000);

  const getHtml = (
    fileName: string,
    options: recordOptions<eventWithTime> = {},
  ): string => {
    const filePath = path.resolve(__dirname, `./html/${fileName}`);
    const html = fs.readFileSync(filePath, 'utf8');
    return replaceLast(
      html,
      '</body>',
      `
    <script>
      ${code}
      window.Date.now = () => new Date(Date.UTC(2018, 10, 15, 8)).valueOf();
      ${generateRecordSnippet(options)}
    </script>
    </body>
    `,
    );
  };

  let server: ISuite['server'];
  let serverURL: string;
  let code: ISuite['code'];
  let browser: ISuite['browser'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.js');
    const pluginsCode = [
      path.resolve(__dirname, '../dist/plugins/console-record.js'),
    ]
      .map((p) => fs.readFileSync(p, 'utf8'))
      .join();
    code = fs.readFileSync(bundlePath, 'utf8') + pluginsCode;
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });

  it('can record form interactions', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'form.html'));

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('textarea', 'textarea test');
    await page.select('select', '1');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can record childList mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
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

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can record character data muatations', async () => {
    const page: puppeteer.Page = await browser.newPage();
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

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can record attribute mutation', async () => {
    const page: puppeteer.Page = await browser.newPage();
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

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can record node mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'select2.html'), {
      waitUntil: 'networkidle0',
    });

    // toggle the select box
    await page.click('.select2-container', { clickCount: 2, delay: 100 });
    // test storage of !important style
    await page.evaluate(
      'document.getElementById("select2-drop").setAttribute("style", document.getElementById("select2-drop").style.cssText + "color:black !important")',
    );
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can freeze mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mutation-observer.html', { recordCanvas: true }),
    );

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
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl') as WebGLRenderingContext;
      gl.getExtension('bad');
      const ul = document.querySelector('ul') as HTMLUListElement;
      const li = document.createElement('li');
      li.setAttribute('bad-attr', 'bad');
      li.innerText = 'bad text';
      ul.appendChild(li);
      document.body.removeChild(ul);
    });

    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should not record input events on ignored elements', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'ignore.html'));

    await page.type('.rr-ignore', 'secret');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should not record input values if maskAllInputs is enabled', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'form.html', { maskAllInputs: true }),
    );

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('input[type="password"]', 'password');
    await page.type('textarea', 'textarea test');
    await page.select('select', '1');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can use maskInputOptions to configure which type of inputs should be masked', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'form.html', {
        maskInputOptions: {
          text: false,
          textarea: false,
          password: true,
        },
      }),
    );

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('textarea', 'textarea test');
    await page.type('input[type="password"]', 'password');
    await page.select('select', '1');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should mask value attribute with maskInputOptions', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'password.html', {
        maskInputOptions: {
          password: true,
        },
      }),
    );

    await page.type('input[type="password"]', 'secr3t');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record input userTriggered values if userTriggeredOnInput is enabled', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'form.html', { userTriggeredOnInput: true }),
    );

    await page.type('input[type="text"]', 'test');
    await page.click('input[type="radio"]');
    await page.click('input[type="checkbox"]');
    await page.type('input[type="password"]', 'password');
    await page.type('textarea', 'textarea test');
    await page.select('select', '1');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should not record blocked elements and its child nodes', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'block.html'));

    await page.type('input', 'should not be record');
    await page.evaluate(`document.getElementById('text').innerText = '1'`);
    await page.click('#text');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should not record blocked elements dynamically added', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'block.html'));

    await page.evaluate(() => {
      const el = document.createElement('button');
      el.className = 'rr-block';
      el.style.width = '100px';
      el.style.height = '100px';
      el.innerText = 'Should not be recorded';

      const nextElement = document.querySelector('.rr-block')!;
      nextElement.parentNode!.insertBefore(el, nextElement);
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('mutations should work when blocked class is unblocked', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about: blank');
    await page.setContent(getHtml.call(this, 'blocked-unblocked.html'));

    const elements1 = await page.$x('/html/body/div[1]/button');
    await (elements1[0] as puppeteer.ElementHandle<Element>).click();

    const elements2 = await page.$x('/html/body/div[2]/button');
    await (elements2[0] as puppeteer.ElementHandle<Element>).click();

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record DOM node movement 1', async () => {
    const page: puppeteer.Page = await browser.newPage();
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
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record DOM node movement 2', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'move-node.html'));

    await page.evaluate(() => {
      const div = document.createElement('div');
      const span = document.querySelector('span')!;
      document.body.appendChild(div);
      div.appendChild(span);
    });
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record dynamic CSS changes', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'react-styled-components.html'));
    await page.click('.toggle');
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record canvas mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'canvas.html', {
        recordCanvas: true,
      }),
    );
    await waitForRAF(page);
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    for (const event of snapshots) {
      if (event.type === EventType.FullSnapshot) {
        visitSnapshot(event.data.node, (n) => {
          if (n.type === NodeType.Element && n.attributes.rr_dataURL) {
            n.attributes.rr_dataURL = `LOOKS LIKE WE COULD NOT GET STABLE BASE64 FROM SAME IMAGE.`;
          }
        });
      }
    }
    assertSnapshot(snapshots);
  });

  it('should record webgl canvas mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'canvas-webgl.html', {
        recordCanvas: true,
      }),
    );
    await page.waitForTimeout(50);
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can correctly serialize a shader and multiple webgl contexts', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'canvas-webgl-shader.html', {
        recordCanvas: true,
      }),
    );
    await waitForRAF(page);
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('will serialize node before record', async () => {
    const page: puppeteer.Page = await browser.newPage();
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

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('will defer missing next node mutation', async () => {
    const page: puppeteer.Page = await browser.newPage();
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

    expect(text).toEqual('4\n3\n2\n1\n5');
  });

  it('should record console messages', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml('log.html', {
        plugins: ('[rrwebConsoleRecord.getRecordConsolePlugin()]' as unknown) as RecordPlugin<unknown>[],
      }),
    );

    await page.evaluate(() => {
      console.assert(0 === 0, 'assert');
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
      console.log(new TypeError('a message'));
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
    });

    await page.frames()[1].evaluate(() => {
      console.log('from iframe');
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should nest record iframe', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(`${serverURL}/html`);
    await page.setContent(getHtml.call(this, 'main.html'));

    await page.waitForSelector('#two');
    const frameIdTwo = await page.frames()[2];
    await frameIdTwo.waitForSelector('#four');
    const frameIdFour = frameIdTwo.childFrames()[1];
    await frameIdFour.waitForSelector('#five');

    await page.waitForTimeout(50);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record images with blob url', async () => {
    const page: puppeteer.Page = await browser.newPage();
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`${serverURL}/html`);
    page.setContent(
      getHtml.call(this, 'image-blob-url.html', { inlineImages: true }),
    );
    await page.waitForResponse(`${serverURL}/html/assets/robot.png`);
    await page.waitForSelector('img'); // wait for image to get added
    await waitForRAF(page); // wait for image to be captured

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record images inside iframe with blob url', async () => {
    const page: puppeteer.Page = await browser.newPage();
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`${serverURL}/html`);
    await page.setContent(
      getHtml.call(this, 'frame-image-blob-url.html', { inlineImages: true }),
    );
    await page.waitForResponse(`${serverURL}/html/assets/robot.png`);
    await page.waitForTimeout(50); // wait for image to get added
    await waitForRAF(page); // wait for image to be captured

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record images inside iframe with blob url after iframe was reloaded', async () => {
    const page: puppeteer.Page = await browser.newPage();
    page.on('console', (msg) => console.log(msg.text()));
    await page.goto(`${serverURL}/html`);
    await page.setContent(
      getHtml.call(this, 'frame2.html', { inlineImages: true }),
    );
    await page.waitForSelector('iframe'); // wait for iframe to get added
    await waitForRAF(page); // wait for iframe to load
    page.evaluate(() => {
      const iframe = document.querySelector('iframe')!;
      iframe.setAttribute('src', '/html/image-blob-url.html');
    });
    await page.waitForResponse(`${serverURL}/html/assets/robot.png`); // wait for image to get loaded
    await page.waitForTimeout(50); // wait for image to get added
    await waitForRAF(page); // wait for image to be captured

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record shadow DOM', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'shadow-dom.html'));

    await page.evaluate(() => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const el = document.querySelector('.my-element') as HTMLDivElement;
      const shadowRoot = el.shadowRoot as ShadowRoot;
      shadowRoot.appendChild(document.createElement('span'));
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
          const nestedShadowElement = shadowRoot.lastChild!
            .childNodes[0] as HTMLElement;
          nestedShadowElement.attachShadow({
            mode: 'open',
          });
          nestedShadowElement.shadowRoot!.appendChild(
            document.createElement('span'),
          );
          (nestedShadowElement.shadowRoot!.lastChild as HTMLElement).innerText =
            'nested shadow dom';
        });
    });
    await page.waitForTimeout(50);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record nested iframes and shadow doms', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'frame2.html'));

    await page.waitForTimeout(10); // wait till frame was added to dom
    await waitForRAF(page); // wait till browser loaded contents of frame

    await page.evaluate(() => {
      // get contentDocument of iframe five
      const contentDocument1 = document.querySelector('iframe')!
        .contentDocument!;
      // create shadow dom #1
      contentDocument1.body.attachShadow({ mode: 'open' });
      contentDocument1.body.shadowRoot!.appendChild(
        document.createElement('div'),
      );
      const div = contentDocument1.body.shadowRoot!.childNodes[0];
      const iframe = contentDocument1.createElement('iframe');
      // append an iframe to shadow dom #1
      div.appendChild(iframe);
    });

    await waitForRAF(page); // wait till browser loaded contents of frame

    page.evaluate(() => {
      const iframe: HTMLIFrameElement = document
        .querySelector('iframe')!
        .contentDocument!.body.shadowRoot!.querySelector('iframe')!;

      const contentDocument2 = iframe.contentDocument!;
      // create shadow dom #2 in the iframe
      contentDocument2.body.attachShadow({ mode: 'open' });
      contentDocument2.body.shadowRoot!.appendChild(
        document.createElement('span'),
      );
    });
    await waitForRAF(page); // wait till browser sent snapshots

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should record mutations in iframes accross pages', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(`${serverURL}/html`);
    page.on('console', (msg) => console.log(msg.text()));
    await page.setContent(getHtml.call(this, 'frame2.html'));

    await page.waitForSelector('iframe'); // wait for iframe to get added
    await waitForRAF(page); // wait for iframe to load

    page.evaluate((serverURL) => {
      const iframe = document.querySelector('iframe')!;
      iframe.setAttribute('src', `${serverURL}/html`); // load new page
    }, serverURL);

    await page.waitForResponse(`${serverURL}/html`); // wait for iframe to load pt1
    await waitForRAF(page); // wait for iframe to load pt2

    await page.evaluate(() => {
      const iframeDocument = document.querySelector('iframe')!.contentDocument!;
      const div = iframeDocument.createElement('div');
      iframeDocument.body.appendChild(div);
    });

    await waitForRAF(page); // wait for snapshot to be updated
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  // https://github.com/webcomponents/polyfills/tree/master/packages/shadydom
  it('should record shadow doms polyfilled by shadydom', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      // insert shadydom script
      replaceLast(
        getHtml.call(this, 'polyfilled-shadowdom-mutation.html'),
        '<head>',
        `
        <head>
        <script>
          // To force ShadyDOM to be used even when native ShadowDOM is available, set the ShadyDOM = {force: true} in a script prior to loading the polyfill.
          window.ShadyDOM = { force: true };
        </script>
        <script src="https://cdn.jsdelivr.net/npm/@webcomponents/shadydom@1.9.0/shadydom.min.js"></script>
    `,
      ),
    );
    await page.evaluate(() => {
      const target3 = document.querySelector('#target3');
      target3?.attachShadow({
        mode: 'open',
      });
      target3?.shadowRoot?.appendChild(document.createElement('span'));
    });
    await waitForRAF(page); // wait till browser sent snapshots

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  // https://github.com/salesforce/lwc/tree/master/packages/%40lwc/synthetic-shadow
  it('should record shadow doms polyfilled by synthetic-shadow', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      // insert lwc's synthetic-shadow script
      replaceLast(
        getHtml.call(this, 'polyfilled-shadowdom-mutation.html'),
        '<head>',
        `
        <head>
        <script>var process = {env: {NODE_ENV: "production"}};</script>
        <script src="https://cdn.jsdelivr.net/npm/@lwc/synthetic-shadow@2.20.3/dist/synthetic-shadow.js"></script>
      `,
      ),
    );
    await page.evaluate(() => {
      const target3 = document.querySelector('#target3');
      // create a shadow dom with synthetic shadow
      // https://github.com/salesforce/lwc/blob/v2.20.3/packages/@lwc/synthetic-shadow/src/faux-shadow/element.ts#L81-L87
      target3?.attachShadow({
        mode: 'open',
        '$$lwc-synthetic-mode': true,
      } as ShadowRootInit);
      target3?.shadowRoot?.appendChild(document.createElement('span'));
      const target4 = document.createElement('div');
      target4.id = 'target4';
      // create a native shadow dom
      document.body.appendChild(target4);
      target4.attachShadow({
        mode: 'open',
      });
      target4.shadowRoot?.appendChild(document.createElement('ul'));
    });
    await waitForRAF(page); // wait till browser sent snapshots

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should mask texts', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mask-text.html', {
        maskTextSelector: '[data-masking="true"]',
      }),
    );

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('should mask texts using maskTextFn', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mask-text.html', {
        maskTextSelector: '[data-masking="true"]',
        maskTextFn: (t: string) => t.replace(/[a-z]/g, '*'),
      }),
    );

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });

  it('can mask character data mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
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

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });
});
