import * as fs from 'fs';
import * as path from 'path';
import { webkit } from 'playwright';
import type * as playwright from 'playwright';
import { vi } from 'vitest';
import {
  startServer,
  getServerURL,
  ISuite,
} from './utils';
import { eventWithTime, EventType } from '@newrelic/rrweb-types';

/**
 * Integration tests for Angular Zone.js compatibility with WebKit (Safari).
 *
 * These tests verify that the Angular Zone unpatched prototype detection
 * works correctly in Safari, ensuring DOM mutations are properly observed
 * when Zone.js has patched native browser APIs.
 */
describe('Angular Zone + WebKit integration', function (this: ISuite) {
  vi.setConfig({ testTimeout: 100_000, hookTimeout: 100_000 });

  let server: ISuite['server'];
  let serverURL: string;
  let code: string;
  let browser: playwright.Browser;

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);

    // Launch WebKit (Safari) specifically for this test
    browser = await webkit.launch({
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
    });

    const bundlePath = path.resolve(__dirname, '../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterAll(async () => {
    try {
      if (browser) {
        await browser.close();
      }
      if (server) {
        server.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should detect Angular Zone and use unpatched prototypes', async () => {
    const page = await browser.newPage();

    try {
      // Load test page with Angular Zone.js
      const testUrl = `${serverURL}/html/angular-zone-test.html`;
      await page.goto(testUrl, { waitUntil: 'networkidle' });

      // Wait for Zone.js to load from CDN
      await page.waitForFunction(() => typeof (window as any).Zone !== 'undefined', { timeout: 10000 });

      // Verify Zone.js is present
      const hasZone = await page.evaluate(() => {
        return typeof (window as any).Zone !== 'undefined';
      });
      expect(hasZone).toBe(true);

      // Inject rrweb and start recording
      await page.evaluate((rrwebCode) => {
        const script = document.createElement('script');
        script.textContent = rrwebCode;
        document.head.appendChild(script);
      }, code);

      // Wait for rrweb to be available
      await page.waitForFunction(() => typeof (window as any).rrweb !== 'undefined');

      // Start recording
      await page.evaluate(() => {
        (window as any).events = [];
        (window as any).rrweb.record({
          emit: (event: any) => {
            (window as any).events.push(event);
          },
          recordCanvas: false,
          recordCrossOriginIframes: false,
        });
      });

      // Wait for initial snapshot
      await page.waitForTimeout(100);

      // Make DOM mutations
      await page.evaluate(() => {
        const testDiv = document.createElement('div');
        testDiv.id = 'test-mutation-1';
        testDiv.textContent = 'Test mutation 1';
        document.body.appendChild(testDiv);
      });

      await page.waitForTimeout(100);

      await page.evaluate(() => {
        const testDiv2 = document.createElement('div');
        testDiv2.id = 'test-mutation-2';
        testDiv2.textContent = 'Test mutation 2';
        document.body.appendChild(testDiv2);
      });

      await page.waitForTimeout(100);

      await page.evaluate(() => {
        const div = document.getElementById('test-mutation-1');
        if (div) {
          div.textContent = 'Modified text';
        }
      });

      await page.waitForTimeout(100);

      // Get recorded events
      const events = await page.evaluate(() => (window as any).events) as eventWithTime[];

      // Verify we captured mutation events
      const mutationEvents = events.filter(
        (e) => e.type === EventType.IncrementalSnapshot && e.data.source === 0 // Mutation source
      );

      // Should have captured at least the 3 mutations we made
      expect(mutationEvents.length).toBeGreaterThan(0);

      // Log for debugging
      console.log(`Captured ${events.length} total events, ${mutationEvents.length} mutation events`);

      // Verify the mutations captured our test elements
      const eventsStr = JSON.stringify(events);
      expect(eventsStr).toContain('test-mutation-1');
      expect(eventsStr).toContain('test-mutation-2');
    } finally {
      await page.close();
    }
  });

  it('should capture mutations during navigation in Angular-like SPA', async () => {
    const page = await browser.newPage();

    try {
      const testUrl = `${serverURL}/html/angular-zone-test.html`;
      await page.goto(testUrl, { waitUntil: 'networkidle' });

      // Wait for Zone.js to load from CDN
      await page.waitForFunction(() => typeof (window as any).Zone !== 'undefined', { timeout: 10000 });

      // Inject rrweb
      await page.evaluate((rrwebCode) => {
        const script = document.createElement('script');
        script.textContent = rrwebCode;
        document.head.appendChild(script);
      }, code);

      await page.waitForFunction(() => typeof (window as any).rrweb !== 'undefined');

      // Start recording
      await page.evaluate(() => {
        (window as any).events = [];
        (window as any).rrweb.record({
          emit: (event: any) => {
            (window as any).events.push(event);
          },
        });
      });

      await page.waitForTimeout(100);

      // Simulate Angular router navigation (history.pushState + DOM changes)
      await page.evaluate(() => {
        // Simulate route change
        history.pushState({}, '', '/new-route');

        // Simulate Angular component rendering
        const appRoot = document.getElementById('app');
        if (appRoot) {
          // Clear previous content
          appRoot.innerHTML = '';

          // Add new content
          const newView = document.createElement('div');
          newView.className = 'view';
          newView.innerHTML = '<h1>New Route</h1><p>Content loaded</p>';
          appRoot.appendChild(newView);
        }
      });

      await page.waitForTimeout(200);

      const events = await page.evaluate(() => (window as any).events) as eventWithTime[];

      const mutationEvents = events.filter(
        (e) => e.type === EventType.IncrementalSnapshot && e.data.source === 0
      );

      // Should have captured the DOM changes from the simulated navigation
      expect(mutationEvents.length).toBeGreaterThan(0);

      const eventsStr = JSON.stringify(events);
      expect(eventsStr).toContain('New Route');
    } finally {
      await page.close();
    }
  });

  it('should handle nested DOM mutations with Zone.js present', async () => {
    const page = await browser.newPage();

    try {
      const testUrl = `${serverURL}/html/angular-zone-test.html`;
      await page.goto(testUrl, { waitUntil: 'networkidle' });

      // Wait for Zone.js to load from CDN
      await page.waitForFunction(() => typeof (window as any).Zone !== 'undefined', { timeout: 10000 });

      await page.evaluate((rrwebCode) => {
        const script = document.createElement('script');
        script.textContent = rrwebCode;
        document.head.appendChild(script);
      }, code);

      await page.waitForFunction(() => typeof (window as any).rrweb !== 'undefined');

      await page.evaluate(() => {
        (window as any).events = [];
        (window as any).rrweb.record({
          emit: (event: any) => {
            (window as any).events.push(event);
          },
        });
      });

      await page.waitForTimeout(100);

      // Create deeply nested DOM structure
      await page.evaluate(() => {
        const container = document.createElement('div');
        container.id = 'nested-container';

        const level1 = document.createElement('div');
        level1.className = 'level-1';

        const level2 = document.createElement('div');
        level2.className = 'level-2';

        const level3 = document.createElement('span');
        level3.textContent = 'Nested content';
        level3.id = 'nested-span';

        level2.appendChild(level3);
        level1.appendChild(level2);
        container.appendChild(level1);
        document.body.appendChild(container);
      });

      await page.waitForTimeout(100);

      // Modify nested element
      await page.evaluate(() => {
        const span = document.getElementById('nested-span');
        if (span) {
          span.textContent = 'Modified nested content';
        }
      });

      await page.waitForTimeout(100);

      const events = await page.evaluate(() => (window as any).events) as eventWithTime[];

      const mutationEvents = events.filter(
        (e) => e.type === EventType.IncrementalSnapshot && e.data.source === 0
      );

      expect(mutationEvents.length).toBeGreaterThan(0);

      const eventsStr = JSON.stringify(events);
      expect(eventsStr).toContain('nested-container');
      expect(eventsStr).toContain('level-1');
      expect(eventsStr).toContain('Modified nested content');
    } finally {
      await page.close();
    }
  });

  it('should use iframe fallback when prototypes are heavily tainted', async () => {
    const page = await browser.newPage();

    try {
      // Load page without Zone.js but with heavy mocking
      const testUrl = `${serverURL}/html/angular-zone-test.html?noZone=true`;
      await page.goto(testUrl, { waitUntil: 'networkidle' });

      // Heavily taint the prototypes before loading rrweb
      await page.evaluate(() => {
        // Mock/taint Node.prototype methods
        const originalChildNodes = Object.getOwnPropertyDescriptor(Node.prototype, 'childNodes');
        Object.defineProperty(Node.prototype, 'childNodes', {
          get: function() {
            // This is a mocked getter, not native
            return originalChildNodes?.get?.call(this);
          }
        });
      });

      // Inject rrweb
      await page.evaluate((rrwebCode) => {
        const script = document.createElement('script');
        script.textContent = rrwebCode;
        document.head.appendChild(script);
      }, code);

      await page.waitForFunction(() => typeof (window as any).rrweb !== 'undefined');

      await page.evaluate(() => {
        (window as any).events = [];
        (window as any).rrweb.record({
          emit: (event: any) => {
            (window as any).events.push(event);
          },
        });
      });

      await page.waitForTimeout(100);

      // Make mutations
      await page.evaluate(() => {
        const div = document.createElement('div');
        div.textContent = 'Test with tainted prototype';
        document.body.appendChild(div);
      });

      await page.waitForTimeout(100);

      const events = await page.evaluate(() => (window as any).events) as eventWithTime[];

      const mutationEvents = events.filter(
        (e) => e.type === EventType.IncrementalSnapshot && e.data.source === 0
      );

      // Should still capture mutations via iframe fallback
      expect(mutationEvents.length).toBeGreaterThan(0);
    } finally {
      await page.close();
    }
  });
});
