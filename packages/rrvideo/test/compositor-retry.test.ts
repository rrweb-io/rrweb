import { spawnSync } from 'child_process';
import * as path from 'path';

function runChromeScript(script: string) {
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || String(result.error));
  }
  return result.stdout.trim();
}

const linuxTest = process.platform === 'linux' ? it : it.skip;

linuxTest(
  'recovers from a real screenshot-less compositor frame using a later tick',
  () => {
    const output = runChromeScript(`
      const assert = require('assert');
      const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
      const { resolveConfig } = require('./build/config');
      const events = require('./benchmark/fixtures.cjs')['css-animation'];
      function bounded(promise, timeoutMs) {
        let timer;
        return Promise.race([
          promise,
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('frame capture probe timed out')), timeoutMs); }),
        ]).finally(() => clearTimeout(timer));
      }
      (async () => {
        const config = resolveConfig({input:'unused',capture:'compositor',fps:30,captureTimeoutMs:1500});
        Object.assign(config.rrwebPlayer, { width:640, height:360 });
        const browser = await launchCaptureBrowser(config);
        try {
          const originalNewContext = browser.newContext.bind(browser);
          browser.newContext = async (...args) => {
            const context = await originalNewContext(...args);
            const originalNewSession = context.newCDPSession.bind(context);
            context.newCDPSession = async (page) => {
              const session = await originalNewSession(page);
              let omittedScreenshot = false;
              return new Proxy(session, {
                get(target, property) {
                  if (property === 'send') return async (method, params = {}) => {
                    if (method !== 'HeadlessExperimental.beginFrame') return target.send(method, params);
                    ticks.push(params.frameTimeTicks);
                    if (!omittedScreenshot) {
                      omittedScreenshot = true;
                      const { screenshot, ...withoutScreenshot } = params;
                      const result = await target.send(method, withoutScreenshot);
                      assert.strictEqual(result.screenshotData, undefined);
                      return result;
                    }
                    return target.send(method, params);
                  };
                  const value = Reflect.get(target, property, target);
                  return typeof value === 'function' ? value.bind(target) : value;
                },
              });
            };
            return context;
          };
          const ticks = [];
          const source = await FrameSource.create(browser, events, {width:640,height:360}, config);
          await bounded(source.frame(0), 5000);
          const start = await source.page.frameLocator('iframe').locator('#box').evaluate(el => el.getBoundingClientRect().left);
          await bounded(source.frame(3), 5000);
          const end = await source.page.frameLocator('iframe').locator('#box').evaluate(el => el.getBoundingClientRect().left);
          const text = await source.page.frameLocator('iframe').locator('p').textContent();
          assert.ok(ticks.length >= 3, 'expected the empty first response and subsequent frame calls');
          assert.ok(ticks[1] > ticks[0], 'retry must use a later tick');
          for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i] > ticks[i - 1], 'frame timestamps must increase');
          assert.ok(ticks[1] - ticks[0] <= 0.0011, 'retry should advance by at most 1 microsecond');
          assert.ok(Math.abs(start) < 2, 'CSS animation must start at zero');
          assert.ok(Math.abs(end - 40) < 2, 'CSS animation must reach 40px at 100ms, got ' + end);
          assert.strictEqual(text, '100');
          console.log(JSON.stringify({ticks, start, end, text}));
        } finally { await browser.close(); }
      })().catch(e => { console.error(e); process.exitCode = 1; });
    `);
    const result = JSON.parse(output);
    expect(result.start).toBeCloseTo(0, 0);
    expect(result.end).toBeCloseTo(40, 0);
    expect(result.text).toBe('100');
  },
);

linuxTest(
  'rejects repeated real screenshot-less compositor responses within the capture timeout',
  () => {
    const output = runChromeScript(`
    const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
    const { resolveConfig } = require('./build/config');
    const events = require('./benchmark/fixtures.cjs')['dom-mutations'];
    const captureTimeoutMs = 1000;
    function bounded(promise, timeoutMs) {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('outer probe safety timeout')), timeoutMs); }),
      ]).finally(() => clearTimeout(timer));
    }
    (async () => {
      const result = { ticks: [], responses: [] };
      let browser;
      try {
        const config = resolveConfig({input:'unused',capture:'compositor',fps:30,captureTimeoutMs});
        Object.assign(config.rrwebPlayer, { width:640, height:360 });
        browser = await launchCaptureBrowser(config);
        const originalNewContext = browser.newContext.bind(browser);
        browser.newContext = async (...args) => {
          const context = await originalNewContext(...args);
          const originalNewSession = context.newCDPSession.bind(context);
          context.newCDPSession = async (page) => {
            const session = await originalNewSession(page);
            return new Proxy(session, {
              get(target, property) {
                if (property === 'send') return async (method, params = {}) => {
                  if (method !== 'HeadlessExperimental.beginFrame') return target.send(method, params);
                  result.ticks.push(params.frameTimeTicks);
                  const { screenshot, ...withoutScreenshot } = params;
                  const response = await target.send(method, withoutScreenshot);
                  result.responses.push({hasDamage: response.hasDamage, hasScreenshot: Boolean(response.screenshotData)});
                  return response;
                };
                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
              },
            });
          };
          return context;
        };
        const source = await FrameSource.create(browser, events, {width:640,height:360}, config);
        const startedAt = Date.now();
        try {
          await bounded(source.frame(0), captureTimeoutMs + 1000);
          result.unexpectedSuccess = true;
        } catch (error) {
          result.error = error.message;
        }
        result.elapsedMs = Date.now() - startedAt;
      } catch (error) {
        result.setupError = error.message;
      } finally {
        if (browser) await browser.close();
      }
      console.log(JSON.stringify(result));
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `);
    const result = JSON.parse(output);
    expect(result.setupError).toBeUndefined();
    expect(result.unexpectedSuccess).toBeUndefined();
    expect(result.error).toMatch(
      /Compositor returned no screenshot.*retry limit/,
    );
    expect(result.error).not.toMatch(/outer probe safety timeout/);
    expect(result.elapsedMs).toBeLessThanOrEqual(1300);
    expect(result.ticks).toHaveLength(10);
    expect(result.responses).toHaveLength(10);
    expect(
      result.responses.every(
        (response: { hasScreenshot: boolean }) => !response.hasScreenshot,
      ),
    ).toBe(true);
  },
);
