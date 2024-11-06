import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import {
  assertSnapshot,
  startServer,
  getServerURL,
  launchPuppeteer,
  waitForRAF,
  waitForIFrameLoad,
  replaceLast,
  generateRecordSnippet,
  ISuite,
} from './utils';
import type { recordOptions } from '../src/types';
import { eventWithTime, EventType, RecordPlugin } from '@saola.ai/rrweb-types';
import { visitSnapshot, NodeType } from '@saola.ai/rrweb-snapshot';

describe('record integration tests', function (this: ISuite) {
  vi.setConfig({ testTimeout: 10_000 });

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

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterAll(async () => {
    await browser.close();
    server.close();
  });

  it('can record clicks', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'link.html'));
    await page.click('span');

    // also tap on the span
    const span = await page.waitForSelector('span');
    const center = await page.evaluate((el) => {
      const { x, y, width, height } = el!.getBoundingClientRect();
      return {
        x: Math.round(x + width / 2),
        y: Math.round(y + height / 2),
      };
    }, span);
    await page.touchscreen.tap(center.x, center.y);

    await page.click('a');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('can record and replay textarea mutations correctly', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'empty.html'));

    await waitForRAF(page); // ensure mutations aren't included in fullsnapshot

    await page.evaluate(() => {
      const ta = document.createElement('textarea');
      ta.innerText = 'pre value';
      document.body.append(ta);

      const ta2 = document.createElement('textarea');
      ta2.id = 'ta2';
      document.body.append(ta2);
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      const t = document.querySelector('textarea') as HTMLTextAreaElement;
      t.innerText = 'ok'; // this mutation should be recorded

      const ta2t = document.createTextNode('added');
      document.getElementById('ta2').append(ta2t);
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      const t = document.querySelector('textarea') as HTMLTextAreaElement;
      (t.childNodes[0] as Text).appendData('3'); // this mutation is also valid

      document.getElementById('ta2').remove(); // done with this
    });
    await waitForRAF(page);
    await page.type('textarea', '1'); // types (inserts) at index 0, in front of existing text
    await waitForRAF(page);
    await page.evaluate(() => {
      const t = document.querySelector('textarea') as HTMLTextAreaElement;
      // user has typed so childNode content should now be ignored
      (t.childNodes[0] as Text).data = 'igno';
      (t.childNodes[0] as Text).appendData('re');
      // this mutation is currently emitted, and shows up in snapshot
      // but we will check that it doesn't have any effect on the value
      // there is nothing explicit in rrweb which enforces this, but this test may protect against
      // a future change where a mutation on a textarea incorrectly updates the .value
    });
    await waitForRAF(page);
    await page.type('textarea', '2'); // cursor is at index 1

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);

    // check after each mutation and text input
    const replayTextareaValues = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(window.snapshots);
      const vals = [];
      window.snapshots.filter((e)=>e.data.attributes || e.data.source === 5).forEach((e)=>{
        replayer.pause((e.timestamp - window.snapshots[0].timestamp)+1);
        let ts = replayer.iframe.contentDocument.querySelector('textarea');
        vals.push((e.data.source === 0 ? 'Mutation' : 'User') + ':' + ts.value);
        let ts2 = replayer.iframe.contentDocument.getElementById('ta2');
        if (ts2) {
          vals.push('ta2:' + ts2.value);
        }
      });
      vals;
    `);
    expect(replayTextareaValues).toEqual([
      'Mutation:pre value',
      'ta2:',
      'Mutation:ok',
      'ta2:added',
      'Mutation:ok3',
      'User:1ok3',
      'Mutation:1ok3', // if this gets set to 'ignore', it's an error, as the 'user' has modified the textarea
      'User:12ok3',
    ]);
  });

  it('can record and replay style mutations', async () => {
    // This test shows that the `isStyle` attribute on textContent is not needed in a mutation
    // TODO: we could get a lot more elaborate here with mixed textContent and insertRule mutations
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(`${serverURL}/html`);
    await page.setContent(getHtml.call(this, 'style.html'));

    await waitForRAF(page); // ensure mutations aren't included in fullsnapshot

    await page.evaluate(() => {
      let styleEl = document.querySelector('style#dual-textContent');
      if (styleEl) {
        styleEl.append(
          document.createTextNode('body { background-color: darkgreen; }'),
        );
        styleEl.append(
          document.createTextNode(
            '.absolutify { background-image: url("./rel"); }',
          ),
        );
      }
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      let styleEl = document.querySelector('style#dual-textContent');
      if (styleEl) {
        styleEl.childNodes.forEach((cn) => {
          if (cn.textContent) {
            cn.textContent = cn.textContent.replace('darkgreen', 'purple');
            cn.textContent = cn.textContent.replace(
              'orange !important',
              'yellow',
            );
          }
        });
      }
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      let styleEl = document.querySelector('style#dual-textContent');
      if (styleEl) {
        styleEl.childNodes.forEach((cn) => {
          if (cn.textContent) {
            cn.textContent = cn.textContent.replace(
              'black',
              'black !important',
            );
          }
        });
      }
      let hoverMutationStyleEl = document.querySelector('style#hover-mutation');
      if (hoverMutationStyleEl) {
        hoverMutationStyleEl.childNodes.forEach((cn) => {
          if (cn.textContent) {
            cn.textContent = 'a:hover { outline: cyan solid 1px; }';
          }
        });
      }
      let st = document.createElement('style');
      st.id = 'goldilocks';
      st.innerText = 'body { color: brown }';
      document.body.append(st);
    });

    await waitForRAF(page);
    await page.evaluate(() => {
      let styleEl = document.querySelector('style#goldilocks');
      if (styleEl) {
        styleEl.childNodes.forEach((cn) => {
          if (cn.textContent) {
            cn.textContent = cn.textContent.replace('brown', 'gold');
          }
        });
      }
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];

    // following ensures that the ./rel url has been absolutized (in a mutation)
    await assertSnapshot(snapshots);

    // check after each mutation and text input
    const replayStyleValues = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(window.snapshots);
      const vals = [];
      window.snapshots.filter((e)=>e.data.attributes || e.data.source === 5).forEach((e)=>{
        replayer.pause((e.timestamp - window.snapshots[0].timestamp)+1);
        let bodyStyle = getComputedStyle(replayer.iframe.contentDocument.querySelector('body'))
        vals.push({
          'background-color': bodyStyle['background-color'],
          'color': bodyStyle['color'],
        });
      });
      vals.push(replayer.iframe.contentDocument.getElementById('single-textContent').innerText);
      vals.push(replayer.iframe.contentDocument.getElementById('empty').innerText);
      vals.push(replayer.iframe.contentDocument.getElementById('hover-mutation').innerText);
      vals;
`);

    expect(replayStyleValues).toEqual([
      {
        'background-color': 'rgb(0, 100, 0)', // darkgreen
        color: 'rgb(255, 165, 0)', // orange (from style.html)
      },
      {
        'background-color': 'rgb(128, 0, 128)', // purple
        color: 'rgb(255, 255, 0)', // yellow
      },
      {
        'background-color': 'rgb(0, 0, 0)', // black !important
        color: 'rgb(165, 42, 42)', // brown
      },
      {
        'background-color': 'rgb(0, 0, 0)',
        color: 'rgb(255, 215, 0)', // gold
      },
      'a:hover,\na.\\:hover { outline: red solid 1px; }', // has run adaptCssForReplay
      'a:hover,\na.\\:hover { outline: blue solid 1px; }', // has run adaptCssForReplay
      'a:hover,\na.\\:hover { outline: cyan solid 1px; }', // has run adaptCssForReplay after text mutation
    ]);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('handles null attribute values', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'mutation-observer.html', {}));

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      ul.appendChild(li);

      li.setAttribute('aria-label', 'label');
      li.setAttribute('id', 'test-li');
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    await page.evaluate(() => {
      const li = document.querySelector('#test-li') as HTMLLIElement;
      // This triggers the mutation observer with a `null` attribute value
      li.removeAttribute('aria-label');
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('can record style changes compactly and preserve css var() functions', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'blank.html'), {
      waitUntil: 'networkidle0',
    });

    // goal here is to ensure var(--mystery) ends up in the mutations (CSSOM fails in this case)
    await page.evaluate(
      'document.body.setAttribute("style", "background: var(--mystery)")',
    );
    await waitForRAF(page);
    // and in this change we can't use the shorter styleObj format either
    await page.evaluate(
      'document.body.setAttribute("style", "background: var(--mystery); background-color: black")',
    );

    // reset is always shorter to be recorded as a sting rather than a styleObj
    await page.evaluate('document.body.setAttribute("style", "")');
    await waitForRAF(page);

    await page.evaluate('document.body.setAttribute("style", "display:block")');
    await waitForRAF(page);
    // following should be recorded as an update of `{ color: 'var(--mystery-color)' }` without needing to include the display
    await page.evaluate(
      'document.body.setAttribute("style", "color:var(--mystery-color);display:block")',
    );
    await waitForRAF(page);
    // whereas this case, it's shorter to record the entire string than the longhands for margin
    await page.evaluate(
      'document.body.setAttribute("style", "color:var(--mystery-color);display:block;margin:10px")',
    );
    await waitForRAF(page);
    // and in this case, it's shorter to record just the change to the longhand margin-left;
    await page.evaluate(
      'document.body.setAttribute("style", "color:var(--mystery-color);display:block;margin:10px 10px 10px 0px;")',
    );
    await waitForRAF(page);
    // see what happens when we manipulate the style object directly (expecting a compact mutation with just these two changes)
    await page.evaluate(
      'document.body.style.marginTop = 0; document.body.style.color = null',
    );
    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('should not record input events on ignored elements', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'ignore.html', {
        ignoreSelector: '[data-rr-ignore]',
      }),
    );

    await page.type('.rr-ignore', 'secret');
    await page.type('[data-rr-ignore]', 'secret');
    await page.type('.dont-ignore', 'not secret');

    await assertSnapshot(page);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('should mask password value attribute with maskInputOptions', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'password.html', {
        maskInputOptions: {
          password: true,
        },
      }),
    );

    await page.type('#password', 'secr3t');

    // Change type to text (simulate "show password")
    await page.click('#show-password');
    await page.type('#password', 'XY');
    await page.click('#show-password');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should mask inputs via function call', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'form.html', {
        maskAllInputs: true,
        maskInputFn: (text: string, element: HTMLElement) => {
          // If the element has the attribute "data-unmask-example", we don't mask it
          if (element.hasAttribute('data-unmask-example')) {
            return text;
          }

          return '*'.repeat(text.length);
        },
      }),
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('mutations should work when blocked class is unblocked', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about: blank');
    await page.setContent(getHtml.call(this, 'blocked-unblocked.html'));

    const elements1 = (await page.$x(
      '/html/body/div[1]/button',
    )) as puppeteer.ElementHandle<HTMLButtonElement>[];
    await elements1[0].click();

    const elements2 = (await page.$x(
      '/html/body/div[2]/button',
    )) as puppeteer.ElementHandle<HTMLButtonElement>[];
    await elements2[0].click();

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('should record dynamic CSS changes', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'react-styled-components.html'));
    await page.click('.toggle');
    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should record canvas mutations', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'canvas.html', {
        recordCanvas: true,
      }),
    );
    await page.waitForFunction('window.canvasMutationApplied');
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
    await assertSnapshot(snapshots);
  });

  it('should not record input values if dynamically added and maskAllInputs is true', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'empty.html', { maskAllInputs: true }),
    );

    await page.evaluate(() => {
      const el = document.createElement('input');
      el.size = 50;
      el.id = 'input';
      el.value = 'input should be masked';

      const nextElement = document.querySelector('#one')!;
      nextElement.parentNode!.insertBefore(el, nextElement);
    });

    await page.type('#input', 'moo');

    await assertSnapshot(page);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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

  it('should nest record iframe', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(`${serverURL}/html`);
    await page.setContent(getHtml.call(this, 'main.html'));

    const frameIdTwo = await waitForIFrameLoad(page, '#two');
    const frameIdFour = await waitForIFrameLoad(frameIdTwo, '#four');
    await waitForIFrameLoad(frameIdFour, '#five');

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('should record shadow DOM 2', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'blank.html'));
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('div') as HTMLDivElement;
        el.attachShadow({ mode: 'open' });
        (el.shadowRoot as ShadowRoot).appendChild(
          document.createElement('input'),
        );
        setTimeout(() => {
          document.body.append(el);
          resolve(null);
        }, 10);
      });
    });
    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should record shadow DOM 3', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'blank.html'));

    await page.evaluate(() => {
      const el = document.createElement('div') as HTMLDivElement;
      el.attachShadow({ mode: 'open' });
      (el.shadowRoot as ShadowRoot).appendChild(
        document.createElement('input'),
      );
      document.body.append(el);
    });
    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should record moved shadow DOM', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'blank.html'));

    await page.evaluate(() => {
      return new Promise((resolve) => {
        const el = document.createElement('div') as HTMLDivElement;
        el.attachShadow({ mode: 'open' });
        (el.shadowRoot as ShadowRoot).appendChild(
          document.createElement('input'),
        );
        document.body.append(el);
        setTimeout(() => {
          const newEl = document.createElement('div') as HTMLDivElement;
          document.body.append(newEl);
          newEl.append(el);
          resolve(null);
        }, 50);
      });
    });
    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should record moved shadow DOM 2', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'blank.html'));

    await page.evaluate(() => {
      const el = document.createElement('div') as HTMLDivElement;
      el.id = 'el';
      el.attachShadow({ mode: 'open' });
      (el.shadowRoot as ShadowRoot).appendChild(
        document.createElement('input'),
      );
      document.body.append(el);
      (el.shadowRoot as ShadowRoot).appendChild(document.createElement('span'));
      (el.shadowRoot as ShadowRoot).appendChild(document.createElement('p'));
      const newEl = document.createElement('div') as HTMLDivElement;
      newEl.id = 'newEl';
      document.body.append(newEl);
      newEl.append(el);
      const input = el.shadowRoot?.children[0] as HTMLInputElement;
      const span = el.shadowRoot?.children[1] as HTMLSpanElement;
      const p = el.shadowRoot?.children[2] as HTMLParagraphElement;
      input.remove();
      span.append(input);
      p.append(input);
      span.append(input);
      setTimeout(() => {
        p.append(input);
      }, 0);
    });
    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should record nested iframes and shadow doms', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(getHtml.call(this, 'frame2.html'));

    await page.waitForSelector('iframe'); // wait for iframe to get added
    await waitForRAF(page); // wait till browser loaded contents of frame

    await page.evaluate(() => {
      // get contentDocument of iframe five
      const contentDocument1 =
        document.querySelector('iframe')!.contentDocument!;
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
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
    await assertSnapshot(snapshots);
  });

  it('should unmask texts using maskTextFn', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mask-text.html', {
        maskTextSelector: '*',
        maskTextFn: (t: string, el: HTMLElement) => {
          return el.matches('[data-unmask-example="true"]')
            ? t
            : t.replace(/[a-z]/g, '*');
        },
      }),
    );

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
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

    await page.evaluate(() => {
      // generate a characterData mutation; innerText doesn't do that
      const p = document.querySelector('p') as HTMLParagraphElement;
      (p.childNodes[0] as Text).insertData(0, 'doubly ');
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('can mask character data mutations with regexp', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'mutation-observer.html', {
        maskTextClass: /custom/,
      }),
    );

    await page.evaluate(() => {
      const li = document.createElement('li');
      const ul = document.querySelector('ul') as HTMLUListElement;
      const p = document.querySelector('p') as HTMLParagraphElement;
      [ul, p].forEach((element) => {
        element.className = 'custom-mask';
      });
      ul.appendChild(li);
      li.innerText = 'new list item';
      p.innerText = 'mutated';
    });

    await page.evaluate(() => {
      // generate a characterData mutation; innerText doesn't do that
      const li = document.querySelector('li:not(:empty)') as HTMLLIElement;
      (li.childNodes[0] as Text).insertData(0, 'descendent should be masked ');
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  it('should record after DOMContentLoaded event', async () => {
    const page: puppeteer.Page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(
      getHtml.call(this, 'blank.html', {
        recordAfter: 'DOMContentLoaded',
      }),
    );

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);
  });

  /**
   * the regression part of the following is now handled by replayer.test.ts::'can deal with duplicate/conflicting values on style elements'
   * so this test could be dropped if we add more robust mixing of `insertRule` into 'can record and replay style mutations'
   */
  it('should record style mutations and replay them correctly', async () => {
    const page: puppeteer.Page = await browser.newPage();
    const OldColor = 'rgb(255, 0, 0)'; // red color
    const NewColor = 'rgb(255, 255, 0)'; // yellow color

    await page.setContent(
      `
      <!DOCTYPE html><html lang="en">
        <head>
	        <style> 
          </style>
        </head>
        <body>
	        <div id="one"></div>
          <div id="two"></div>
	        <script>
		        document.querySelector("style").sheet.insertRule('#one { color: ${OldColor}; }', 0);
	        </script>
        </body></html>
      `,
    );
    // Start rrweb recording
    await page.evaluate(
      (code, recordSnippet) => {
        const script = document.createElement('script');
        script.textContent = `${code}window.Date.now = () => new Date(Date.UTC(2018, 10, 15, 8)).valueOf();${recordSnippet}`;
        document.head.appendChild(script);
      },
      code,
      generateRecordSnippet({}),
    );

    await page.evaluate(
      async (OldColor, NewColor) => {
        // Create a new style element with the same content as the existing style element and apply it to the #two div element
        const incrementalStyle = document.createElement(
          'style',
        ) as HTMLStyleElement;
        incrementalStyle.textContent = ` \n`;
        document.head.appendChild(incrementalStyle);
        incrementalStyle.sheet!.insertRule(`#two { color: ${OldColor}; }`, 0);

        await new Promise((resolve) =>
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          }),
        );

        // Change the color of the #one div element to yellow as an incremental style mutation
        const styleElement = document.querySelector('style')!;
        (styleElement.sheet!.cssRules[0] as any).style.setProperty(
          'color',
          NewColor,
        );
        // Change the color of the #two div element to yellow as an incremental style mutation
        (incrementalStyle.sheet!.cssRules[0] as any).style.setProperty(
          'color',
          NewColor,
        );
      },
      OldColor,
      NewColor,
    );
    await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);

    /**
     * Replay the recorded events and check if the style mutation is applied correctly
     */
    const changedColors = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(window.snapshots);
      replayer.pause(1000);

      // Get the color of the element after applying the style mutation event
      [
        window.getComputedStyle(
          replayer.iframe.contentDocument.querySelector('#one'),
        ).color,
        window.getComputedStyle(
          replayer.iframe.contentDocument.querySelector('#two'),
        ).color,
      ];
    `);
    expect(changedColors).toEqual([NewColor, NewColor]);
    await page.close();
  });

  it('should record style mutations with multiple child nodes and replay them correctly', async () => {
    // ensure that presence of multiple text nodes doesn't interfere with programmatic insertRule operations

    const page: puppeteer.Page = await browser.newPage();
    const Color = 'rgb(255, 0, 0)'; // red color

    await page.setContent(
      `
      <!DOCTYPE html><html lang="en">
        <head>
	        <style>
          /* hello */
          </style>
        </head>
        <body>
	        <div id="one"></div>
          <div id="two"></div>
	        <script>
		        document.querySelector("style").append(document.createTextNode("/* world */"));
		        document.querySelector("style").sheet.insertRule('#one { color: ${Color}; }', 0);
	        </script>
        </body></html>
      `,
    );
    // Start rrweb recording
    await page.evaluate(
      (code, recordSnippet) => {
        const script = document.createElement('script');
        script.textContent = `${code};${recordSnippet}`;
        document.head.appendChild(script);
      },
      code,
      generateRecordSnippet({}),
    );

    await page.evaluate(async (Color) => {
      // Create a new style element with the same content as the existing style element and apply it to the #two div element
      const incrementalStyle = document.createElement(
        'style',
      ) as HTMLStyleElement;
      incrementalStyle.append(document.createTextNode('/* hello */'));
      incrementalStyle.append(document.createTextNode('/* world */'));
      document.head.appendChild(incrementalStyle);
      incrementalStyle.sheet!.insertRule(`#two { color: ${Color}; }`, 0);
    }, Color);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    await assertSnapshot(snapshots);

    /**
     * Replay the recorded events and check if the style mutation is applied correctly
     */
    const changedColors = await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(window.snapshots);
      replayer.pause(1000);

      // Get the color of the element after applying the style mutation event
      [
        window.getComputedStyle(
          replayer.iframe.contentDocument.querySelector('#one'),
        ).color,
        window.getComputedStyle(
          replayer.iframe.contentDocument.querySelector('#two'),
        ).color,
      ];
    `);
    expect(changedColors).toEqual([Color, Color]);
    await page.close();
  });
});
