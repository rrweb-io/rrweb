import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import { chromium, firefox, webkit } from 'playwright';
import type { Browser, Page } from 'playwright';
import type { eventWithTime } from '@rrweb/types';
import type { recordOptions } from '../../src/types';
import { startServer, getServerURL } from '../utils';

const browserName = process.env.BROWSER ?? 'chromium';
const browserType =
  browserName === 'firefox'
    ? firefox
    : browserName === 'webkit'
    ? webkit
    : chromium;
const isChromium = browserType === chromium;

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

describe(`benchmark: mutation observer [${browserName}]`, () => {
  vi.setConfig({ testTimeout: 240000 });
  let page: Page;
  let browser: Browser;
  let server: Awaited<ReturnType<typeof startServer>>;

  beforeAll(async () => {
    server = await startServer();
    browser = await browserType.launch({
      headless: true,
      ...(isChromium
        ? {
            executablePath: process.env.BENCH_EXECUTABLE || undefined,
            args: [
              '--disable-web-security',
              '--disable-features=BlockInsecurePrivateNetworkRequests',
            ],
          }
        : {}),
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

      // A CPU-throttled, traced warm-up run whose duration is discarded; it
      // produces a devtools timeline profile. Chromium-only (needs CDP).
      const profileFilename = `profile-${browserName}-${new Date().toISOString()}.json`;
      const tempDirectory = path.resolve(path.join(__dirname, '../../temp'));
      fs.mkdirSync(tempDirectory, { recursive: true });
      const profilePath = path.resolve(tempDirectory, profileFilename);

      if (isChromium) {
        const client = await page.context().newCDPSession(page);
        await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        const traceEvents: unknown[] = [];
        client.on('Tracing.dataCollected', (data: { value: unknown[] }) => {
          traceEvents.push(...data.value);
        });
        await client.send('Tracing.start', {
          transferMode: 'ReportEvents',
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
          ].join(','),
        });
        await loadPage();
        await getDuration();
        await new Promise((r) => setTimeout(r, 1000));
        const tracingComplete = new Promise<void>((resolve) =>
          client.once('Tracing.tracingComplete', () => resolve()),
        );
        await client.send('Tracing.end');
        await tracingComplete;
        fs.writeFileSync(profilePath, JSON.stringify({ traceEvents }));
        await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      } else {
        // no CDP on firefox/webkit: plain warm-up so the JIT is hot before timing
        await loadPage();
        await getDuration();
      }

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
          browser: browserName,
          ...suite,
          duration: avg(durations),
          durations: durations.join(', '),
        },
      ]);
      if (isChromium) console.log('profile: ', profilePath);
    });
  }
});
