import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { vi } from 'vitest';
import type { eventWithTime } from '@saola.ai/rrweb-types';
import type { recordOptions } from '../../src/types';
import { launchPuppeteer, ISuite } from '../utils';

const suites: Array<{
  title: string;
  eval?: string;
  eventURL?: string;
  eventsString?: string;
  times?: number; // defaults to 5
}> = [
  {
    title: 'append 70 x 70 x 70 elements',
    eval: `
    () => {
      return new Promise((resolve) => {
        const branches = 70;
        const depth = 3;        
        // append children for the current node
        function expand(node, depth) {
          if (depth == 0) return;
          for (let b = 0; b < branches; b++) {
            const child = document.createElement('div');
            node.appendChild(child);
            expand(child, depth - 1);
          }
        }        
        const frag = document.createDocumentFragment();
        const node = document.createElement('div');
        expand(node, depth);
        frag.appendChild(node);
        document.body.appendChild(frag);
        resolve();
      });
    };
    `,
    times: 3,
  },
  {
    title: 'append 1000 elements and reverse their order',
    eval: `
    () => {
      return new Promise(async (resolve) => {
        const branches = 1000;
        function waitForTimeout(timeout) {
          return new Promise((resolve) => setTimeout(() => resolve(), timeout));
        }
        const frag = document.createDocumentFragment();
        const node = document.createElement('div');
        for (let b = 0; b < branches; b++) {
          const child = document.createElement('div');
          node.appendChild(child);
          child.textContent = b + 1;
        }
        frag.appendChild(node);
        document.body.appendChild(frag);
        const children = node.children;
        await waitForTimeout(0);
        // reverse the order of children
        for (let i = children.length - 1; i >= 0; i--)
          node.appendChild(node.children[i]);
        resolve();
      });
    };
    `,
    times: 3,
  },
  {
    title: 'real events recorded on bugs.chromium.org',
    eventURL:
      'https://raw.githubusercontent.com/rrweb-io/benchmark-events/main/rrdom-benchmark-1.json',
    times: 3,
  },
];

function avg(v: number[]): number {
  return v.reduce((prev, cur) => prev + cur, 0) / v.length;
}

describe('benchmark: replayer fast-forward performance', () => {
  vi.setConfig({ testTimeout: 240000 });
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];

  beforeAll(async () => {
    browser = await launchPuppeteer({
      headless: 'new',
      args: ['--disable-dev-shm-usage'],
    });

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  }, 600_000);

  afterAll(async () => {
    await browser.close();
  });

  for (const suite of suites) {
    it(
      suite.title,
      async () => {
        if (suite.eval) suite.eventsString = await generateEvents(suite.eval);
        else if (suite.eventURL) {
          suite.eventsString = await fetchEventsWithCache(
            suite.eventURL,
            './temp',
          );
        } else throw new Error('Invalid suite');
        suite.times = suite.times ?? 5;
        const durations: number[] = [];
        for (let i = 0; i < suite.times; i++) {
          page = await browser.newPage();
          await page.goto('about:blank');
          await page.setContent(`<html>
            <script>
              ${code.toString()}
            </script>
            <script>
              window.events = ${suite.eventsString};
            </script>
          </html>`);
          const duration = await page.evaluate(() => {
            const replayer = new (window as any).rrweb.Replayer(
              (window as any).events,
            );
            const start = Date.now();
            replayer.play(replayer.getMetaData().totalTime + 100);
            return Date.now() - start;
          });
          durations.push(duration);
          await page.close();
        }

        console.table([
          {
            title: suite.title,
            times: suite.times,
            duration: avg(durations),
            durations: durations.join(', '),
          },
        ]);
      },
      60_000,
    );
  }

  /**
   * Get the recorded events after the mutation function is executed.
   */
  async function generateEvents(mutateNodesFn: string): Promise<string> {
    const page = await browser.newPage();

    await page.goto('about:blank');
    await page.setContent(`<html>
    <script>
    ${code.toString()}
    </script>
    </html>`);
    const eventsString = (await page.evaluate((mutateNodesFn) => {
      return new Promise((resolve) => {
        const events: eventWithTime[] = [];
        const options: recordOptions<eventWithTime> = {
          emit: (event) => {
            events.push(event);
          },
        };
        const record = (window as any).rrweb.record;
        record(options);
        eval(mutateNodesFn)().then(() => {
          resolve(JSON.stringify(events));
        });
      });
    }, mutateNodesFn)) as string;

    await page.close();
    return eventsString;
  }

  /**
   * Fetch the recorded events from URL. If the events are already cached, read from the cache.
   */
  async function fetchEventsWithCache(
    eventURL: string,
    cacheFolder: string,
  ): Promise<string> {
    const fileName = eventURL.split('/').pop() || '';
    const cachePath = path.resolve(__dirname, cacheFolder, fileName);
    if (fs.existsSync(cachePath)) return fs.readFileSync(cachePath, 'utf8');
    return new Promise((resolve, reject) => {
      https
        .get(eventURL, (resp) => {
          let data = '';
          resp.on('data', (chunk) => {
            data += chunk;
          });
          resp.on('end', () => {
            resolve(data);
            const folderAbsolutePath = path.resolve(__dirname, cacheFolder);
            if (!fs.existsSync(folderAbsolutePath))
              fs.mkdirSync(path.resolve(__dirname, cacheFolder), {
                recursive: true,
              });
            fs.writeFileSync(cachePath, data);
          });
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }
});
