import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import type { recordOptions } from '../../src/types';
import {
  listenerHandler,
  eventWithTime,
  EventType,
} from '@saola.ai/rrweb-types';
import { launchPuppeteer } from '../utils';
import {
  callbackWrapper,
  registerErrorHandler,
  unregisterErrorHandler,
} from '../../src/record/error-handler';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  events: eventWithTime[];
}

interface IWindow extends Window {
  rrweb: {
    record: (
      options: recordOptions<eventWithTime>,
    ) => listenerHandler | undefined;
    addCustomEvent<T>(tag: string, payload: T): void;
  };
  emit: (e: eventWithTime) => undefined;
}

const setup = function (
  this: ISuite,
  content: string,
  canvasSample: 'all' | number = 'all',
): ISuite {
  const ctx = {} as ISuite;

  beforeAll(async () => {
    ctx.browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    ctx.code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    ctx.page = await ctx.browser.newPage();
    await ctx.page.goto('about:blank');
    await ctx.page.setContent(content);
    await ctx.page.evaluate(ctx.code);
    ctx.events = [];
    await ctx.page.exposeFunction('emit', (e: eventWithTime) => {
      if (e.type === EventType.DomContentLoaded || e.type === EventType.Load) {
        return;
      }
      ctx.events.push(e);
    });

    ctx.page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await ctx.page.close();
  });

  afterAll(async () => {
    await ctx.browser.close();
  });

  return ctx;
};

describe('error-handler', function (this: ISuite) {
  vi.setConfig({ testTimeout: 100_000 });

  const ctx: ISuite = setup.call(
    this,
    `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { background: red; }
          </style>
        </head> 
        <body>
          <div id='in'></div>
          <div id='out'></div>
        </body>
      </html>
    `,
  );

  describe('CSSStyleSheet.prototype', () => {
    it('triggers for errors from insertRule', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSStyleSheet.prototype.insertRule = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet insert
        setTimeout(() => {
          // @ts-ignore
          document.styleSheets[0].insertRule('body { background: blue; }');
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from deleteRule', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSStyleSheet.prototype.deleteRule = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet delete
        setTimeout(() => {
          document.styleSheets[0].deleteRule(0);
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from replace', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSStyleSheet.prototype.replace = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet insert
        setTimeout(() => {
          // @ts-ignore
          document.styleSheets[0].replace('body { background: blue; }');
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from replaceSync', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSStyleSheet.prototype.replaceSync = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet insert
        setTimeout(() => {
          // @ts-ignore
          document.styleSheets[0].replaceSync('body { background: blue; }');
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from CSSGroupingRule.insertRule', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSGroupingRule.prototype.insertRule = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet insert
        setTimeout(() => {
          document.styleSheets[0].insertRule('@media {}');
          const atMediaRule = document.styleSheets[0]
            .cssRules[0] as CSSMediaRule;

          const ruleIdx0 = atMediaRule.insertRule(
            'body { background: #000; }',
            0,
          );
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from CSSGroupingRule.deleteRule', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSGroupingRule.prototype.deleteRule = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet delete
        setTimeout(() => {
          document.styleSheets[0].insertRule('@media {}');
          const atMediaRule = document.styleSheets[0]
            .cssRules[0] as CSSMediaRule;

          const ruleIdx0 = atMediaRule.deleteRule(0);
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from CSSStyleDeclaration.setProperty', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSStyleDeclaration.prototype.setProperty = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet insert
        setTimeout(() => {
          (
            document.styleSheets[0].cssRules[0] as unknown as {
              style: CSSStyleDeclaration;
            }
          ).style.setProperty('background', 'blue');
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });

    it('triggers for errors from CSSStyleDeclaration.removeProperty', async () => {
      await ctx.page.evaluate(() => {
        // @ts-ignore rewrite this to something buggy
        window.CSSStyleDeclaration.prototype.removeProperty = function () {
          // @ts-ignore
          window.doSomethingWrong();
        };
      });

      await ctx.page.evaluate(() => {
        const { record } = (window as unknown as IWindow).rrweb;
        record({
          errorHandler: (error) => {
            document.getElementById('out')!.innerText = `${error}`;
          },
          emit: (window as unknown as IWindow).emit,
        });

        // Trigger buggy style sheet insert
        setTimeout(() => {
          (
            document.styleSheets[0].cssRules[0] as unknown as {
              style: CSSStyleDeclaration;
            }
          ).style.removeProperty('background');
        }, 50);
      });

      await ctx.page.waitForTimeout(100);

      const element = await ctx.page.$('#out');
      const text = await element!.evaluate((el) => el.textContent);

      expect(text).toEqual(
        'TypeError: window.doSomethingWrong is not a function',
      );
    });
  });

  it('triggers for errors from mutation observer', async () => {
    await ctx.page.evaluate(() => {
      const { record } = (window as unknown as IWindow).rrweb;
      record({
        errorHandler: (error) => {
          document.getElementById('out')!.innerText = `${error}`;
        },
        emit: (window as unknown as IWindow).emit,
      });

      // Trigger buggy mutation observer
      setTimeout(() => {
        const el = document.getElementById('in')!;

        // @ts-ignore we want to trigger an error in the mutation observer, which uses this
        el.getAttribute = undefined;

        el.setAttribute('data-attr', 'new');
      }, 50);
    });

    await ctx.page.waitForTimeout(100);

    const element = await ctx.page.$('#out');
    const text = await element!.evaluate((el) => el.textContent);

    expect(text).toEqual('TypeError: m.target.getAttribute is not a function');
  });
});

describe('errorHandler unit', function () {
  afterEach(function () {
    unregisterErrorHandler();
  });

  it('does not swallow if no errorHandler set', () => {
    unregisterErrorHandler();

    const wrapped = callbackWrapper(() => {
      throw new Error('test');
    });

    expect(() => wrapped()).toThrowError('test');
  });

  it('does not swallow if errorHandler returns void', () => {
    registerErrorHandler(() => {
      // do nothing
    });

    const wrapped = callbackWrapper(() => {
      throw new Error('test');
    });

    expect(() => wrapped()).toThrowError('test');
  });

  it('does not swallow if errorHandler returns false', () => {
    registerErrorHandler(() => {
      return false;
    });

    const wrapped = callbackWrapper(() => {
      throw new Error('test');
    });

    expect(() => wrapped()).toThrowError('test');
  });

  it('swallows if errorHandler returns true', () => {
    registerErrorHandler(() => {
      return true;
    });

    const wrapped = callbackWrapper(() => {
      throw new Error('test');
    });

    expect(() => wrapped()).not.toThrowError('test');
  });
});
