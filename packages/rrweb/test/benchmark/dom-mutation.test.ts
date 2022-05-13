// tslint:disable:no-console no-any
import * as fs from 'fs';
import * as path from 'path';
import type { eventWithTime, recordOptions } from '../../src/types';
import { startServer, launchPuppeteer, replaceLast, ISuite } from '../utils';

function avg(v: number[]): number {
  return v.reduce((prev, cur) => prev + cur, 0) / v.length;
}

describe('benchmark: mutation observer', () => {
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];

  beforeAll(async () => {
    server = await startServer();
    browser = await launchPuppeteer({
      dumpio: true,
      headless: true,
    });

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.min.js');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    server.close();
    await browser.close();
  });

  const getHtml = (fileName: string): string => {
    const filePath = path.resolve(__dirname, `../html/${fileName}`);
    const html = fs.readFileSync(filePath, 'utf8');
    return replaceLast(
      html,
      '</body>',
      `
    <script>
      ${code}
    </script>
    </body>
    `,
    );
  };

  const suites: {
    title: string;
    html: string;
    times?: number; // default to 5
  }[] = [
    {
      title: 'create 1000x10 DOM nodes',
      html: 'benchmark-dom-mutation.html',
    },
  ];

  for (const suite of suites) {
    it(suite.title, async () => {
      page = await browser.newPage();
      page.on('console', (message) =>
        console.log(
          `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`,
        ),
      );

      const times = suite.times ?? 5;
      const durations: number[] = [];
      for (let i = 0; i < times; i++) {
        await page.goto('about:blank');
        await page.setContent(getHtml.call(this, suite.html));
        const duration = (await page.evaluate(() => {
          return new Promise((resolve, reject) => {
            let start = 0;
            let lastEvent: eventWithTime | null;
            const options: recordOptions<eventWithTime> = {
              emit: (event) => {
                // console.log(event.type, event.timestamp);
                if (event.type !== 5 || event.data.tag !== 'FTAG') {
                  lastEvent = event;
                  return;
                }
                if (!lastEvent) {
                  reject('no events recorded');
                  return;
                }
                resolve(lastEvent.timestamp - start);
              },
            };
            const record = (window as any).rrweb.record;
            record(options);

            (window as any).workload();

            start = Date.now();
            setTimeout(() => {
              record.addCustomEvent('FTAG', {});
            }, 0);
          });
        })) as number;
        durations.push(duration);
      }

      console.table([
        {
          ...suite,
          duration: avg(durations),
          durations: durations.join(', '),
        },
      ]);
    });
  }
});
