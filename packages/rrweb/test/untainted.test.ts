import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { launchPuppeteer } from './utils';

interface UtilsWindow extends Window {
  rrwebUtils: typeof import('../../utils/src');
}

describe('untainted constructors', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await launchPuppeteer();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../utils/dist/utils.umd.cjs'),
    });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('uses the native Proxy without creating an iframe', async () => {
    expect(
      await page.evaluate(() => {
        const { getUntaintedProxy } = (window as unknown as UtilsWindow)
          .rrwebUtils;
        let attemptedIframe = false;
        document.createElement = () => {
          attemptedIframe = true;
          throw new Error('Unexpected iframe');
        };
        const native = getUntaintedProxy() === window.Proxy;
        return { native, attemptedIframe };
      }),
    ).toEqual({ native: true, attemptedIframe: false });
  });

  it.each([false, true])(
    'recovers and caches an overwritten Proxy with body removed: %s',
    async (removeBody) => {
      expect(
        await page.evaluate((removeBody) => {
          const { getUntaintedProxy } = (window as unknown as UtilsWindow)
            .rrwebUtils;
          window.Proxy = function () {
            throw new Error('Overwritten Proxy');
          } as unknown as ProxyConstructor;
          if (removeBody) document.body.remove();
          const ProxyCtor = getUntaintedProxy();
          const proxy = new ProxyCtor({ value: 42 }, {});
          return {
            value: proxy.value,
            recovered: ProxyCtor !== window.Proxy,
            cached: getUntaintedProxy() === ProxyCtor,
            iframes: document.querySelectorAll('iframe').length,
          };
        }, removeBody),
      ).toEqual({ value: 42, recovered: true, cached: true, iframes: 0 });
    },
  );

  it('retries after iframe creation fails', async () => {
    expect(
      await page.evaluate(() => {
        const { getUntaintedProxy } = (window as unknown as UtilsWindow)
          .rrwebUtils;
        window.Proxy = function () {} as unknown as ProxyConstructor;
        const createElement = document.createElement;
        document.createElement = () => {
          throw new Error('Cannot create iframe');
        };
        const fallback = getUntaintedProxy() === window.Proxy;
        document.createElement = createElement;
        return { fallback, recovered: getUntaintedProxy() !== window.Proxy };
      }),
    ).toEqual({ fallback: true, recovered: true });
  });

  it('still recovers an overwritten MutationObserver constructor', async () => {
    expect(
      await page.evaluate(async () => {
        const { mutationObserverCtor } = (window as unknown as UtilsWindow)
          .rrwebUtils;
        window.MutationObserver = function () {
          throw new Error('Overwritten MutationObserver');
        } as unknown as typeof MutationObserver;
        const Observer = mutationObserverCtor() as typeof MutationObserver;
        const observed = new Promise<boolean>((resolve) => {
          const observer = new Observer(() => {
            observer.disconnect();
            resolve(true);
          });
          observer.observe(document.body, { childList: true });
          document.body.appendChild(document.createElement('div'));
        });
        return {
          observed: await observed,
          iframes: document.querySelectorAll('iframe').length,
        };
      }),
    ).toEqual({ observed: true, iframes: 0 });
  });
});
