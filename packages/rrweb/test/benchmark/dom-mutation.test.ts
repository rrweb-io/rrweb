import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import type { Page } from 'puppeteer';
import type { eventWithTime } from '@saola.ai/rrweb-types';
import type { recordOptions } from '../../src/types';
import { startServer, launchPuppeteer, ISuite, getServerURL } from '../utils';

const suites: Array<
  {
    title: string;
    eval: string;
    times?: number; // defaults to 5
  } & ({ html: string } | { url: string })
> = [
  // {
  //   title: 'benchmarking external website',
  //   url: 'http://localhost:5050',
  //   eval: 'document.querySelector("button").click()',
  //   times: 10,
  // },
  {
    title: 'create 1000x 1 DOM nodes with deeply nested children',
    html: 'benchmark-dom-mutation-deep-nested.html',
    eval: 'window.workload()',
    times: 10,
  },
  {
    title: 'create 1000x10 DOM nodes',
    html: 'benchmark-dom-mutation.html',
    eval: 'window.workload()',
    times: 10,
  },
  {
    title: 'create 1000x10x2 DOM nodes and remove a bunch of them',
    html: 'benchmark-dom-mutation-add-and-remove.html',
    eval: 'window.workload()',
    times: 10,
  },
  {
    title: 'create 1000 DOM nodes and append into its previous looped node',
    html: 'benchmark-dom-mutation-multiple-descendant-add.html',
    eval: 'window.workload()',
    times: 5,
  },
  {
    title: 'create 10000 DOM nodes and move it to new container',
    html: 'benchmark-dom-mutation-add-and-move.html',
    eval: 'window.workload()',
    times: 5,
  },
  {
    title: 'modify attributes on 10000 DOM nodes',
    html: 'benchmark-dom-mutation-attributes.html',
    eval: 'window.workload()',
    times: 10,
  },
];

function avg(v: number[]): number {
  return v.reduce((prev, cur) => prev + cur, 0) / v.length;
}

describe('benchmark: mutation observer', () => {
  vi.setConfig({ testTimeout: 240000 });
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];

  beforeAll(async () => {
    server = await startServer();
    browser = await launchPuppeteer({
      dumpio: true,
      headless: 'new',
    });
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
    return fs.readFileSync(filePath, 'utf8');
  };

  const addRecordingScript = async (page: Page) => {
    // const scriptUrl = `${getServerURL(server)}/rrweb-1.1.3.js`;
    const scriptUrl = `${getServerURL(server)}/rrweb.umd.cjs`;
    await page.evaluate((url) => {
      const scriptEl = document.createElement('script');
      scriptEl.src = url;
      document.head.append(scriptEl);
    }, scriptUrl);
    await page.waitForFunction('window.rrweb');
  };

  for (const suite of suites) {
    it(suite.title, async () => {
      page = await browser.newPage();
      page.on('console', (message) =>
        console.log(`${message.type().toUpperCase()} ${message.text()}`),
      );

      const loadPage = async () => {
        if ('html' in suite) {
          await page.goto('about:blank');
          await page.setContent(getHtml.call(this, suite.html));
        } else {
          await page.goto(suite.url);
        }

        await addRecordingScript(page);
      };

      const getDuration = async (): Promise<number> => {
        return (await page.evaluate((triggerWorkloadScript) => {
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

            start = Date.now();
            eval(triggerWorkloadScript);

            requestAnimationFrame(() => {
              record.addCustomEvent('FTAG', {});
            });
          });
        }, suite.eval)) as number;
      };

      // generate profile.json file
      const profileFilename = `profile-${new Date().toISOString()}.json`;
      const tempDirectory = path.resolve(path.join(__dirname, '../../temp'));
      fs.mkdirSync(tempDirectory, { recursive: true });
      const profilePath = path.resolve(tempDirectory, profileFilename);

      const client = await page.target().createCDPSession();
      await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });

      await page.tracing.start({
        path: profilePath,
        screenshots: true,
        categories: [
          '-*',
          'devtools.timeline',
          'v8.execute',
          'disabled-by-default-devtools.timeline',
          'disabled-by-default-devtools.timeline.frame',
          'toplevel',
          'blink.console',
          'blink.user_timing',
          'latencyInfo',
          'disabled-by-default-devtools.timeline.stack',
          'disabled-by-default-v8.cpu_profiler',
          'disabled-by-default-v8.cpu_profiler.hires',
        ],
      });
      await loadPage();
      await getDuration();
      await page.waitForTimeout(1000);
      await page.tracing.stop();
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

      // calculate durations
      const times = suite.times ?? 5;
      const durations: number[] = [];
      for (let i = 0; i < times; i++) {
        await loadPage();
        const duration = await getDuration();
        durations.push(duration);
      }

      console.table([
        {
          ...suite,
          duration: avg(durations),
          durations: durations.join(', '),
        },
      ]);
      console.log('profile: ', profilePath);
    });
  }
});
