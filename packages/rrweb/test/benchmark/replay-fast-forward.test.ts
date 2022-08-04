import * as fs from 'fs';
import * as path from 'path';
import type { eventWithTime, recordOptions } from '../../src/types';
import { launchPuppeteer, ISuite } from '../utils';

const suites: Array<{
  title: string;
  eval: string;
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
];

function avg(v: number[]): number {
  return v.reduce((prev, cur) => prev + cur, 0) / v.length;
}

describe('benchmark: replayer fast-forward performance', () => {
  jest.setTimeout(240000);
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];

  beforeAll(async () => {
    browser = await launchPuppeteer({
      headless: true,
      args: ['--disable-dev-shm-usage'],
    });

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.min.js');
    code = fs.readFileSync(bundlePath, 'utf8');

    for (const suite of suites)
      suite.eventsString = await generateEvents(suite.eval);
  }, 600_000);

  afterAll(async () => {
    await browser.close();
  });

  for (const suite of suites) {
    it(
      suite.title,
      async () => {
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
          const duration = (await page.evaluate(() => {
            const replayer = new (window as any).rrweb.Replayer(
              (window as any).events,
            );
            const start = Date.now();
            replayer.play(replayer.getMetaData().totalTime + 100);
            return Date.now() - start;
          })) as number;
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
});
