/* tslint:disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import {
  recordOptions,
  listenerHandler,
  eventWithTime,
  EventType,
  IncrementalSource,
  CanvasContext,
} from '../../src/types';
import { assertSnapshot, launchPuppeteer, waitForRAF } from '../utils';
import { ICanvas } from 'rrweb-snapshot';

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

const setup = function (this: ISuite, content: string): ISuite {
  const ctx = {} as ISuite;

  beforeAll(async () => {
    ctx.browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.min.js');
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

    await ctx.page.evaluate(() => {
      const { record } = ((window as unknown) as IWindow).rrweb;
      record({
        recordCanvas: true,
        emit: ((window as unknown) as IWindow).emit,
      });
    });
  });

  afterEach(async () => {
    await ctx.page.close();
  });

  afterAll(async () => {
    await ctx.browser.close();
  });

  return ctx;
};

describe('record webgl', function (this: ISuite) {
  jest.setTimeout(100_000);

  const ctx: ISuite = setup.call(
    this,
    `
      <!DOCTYPE html>
      <html>
        <body>
          <canvas id="canvas"></canvas>
        </body>
      </html>
    `,
  );

  it('will record changes to a canvas element', async () => {
    await ctx.page.evaluate(() => {
      var canvas = document.getElementById('canvas') as HTMLCanvasElement;
      var gl = canvas.getContext('webgl')!;

      gl.clear(gl.COLOR_BUFFER_BIT);
    });

    await ctx.page.waitForTimeout(50);

    const lastEvent = ctx.events[ctx.events.length - 1];
    expect(lastEvent).toMatchObject({
      data: {
        source: IncrementalSource.CanvasMutation,
        type: CanvasContext.WebGL,
        commands: [
          {
            args: [16384],
            property: 'clear',
          },
        ],
      },
    });
    assertSnapshot(ctx.events);
  });

  it('will record changes to a webgl2 canvas element', async () => {
    await ctx.page.evaluate(() => {
      var canvas = document.getElementById('canvas') as HTMLCanvasElement;
      var gl = canvas.getContext('webgl2')!;

      gl.clear(gl.COLOR_BUFFER_BIT);
    });

    await ctx.page.waitForTimeout(50);

    const lastEvent = ctx.events[ctx.events.length - 1];
    expect(lastEvent).toMatchObject({
      data: {
        source: IncrementalSource.CanvasMutation,
        type: CanvasContext.WebGL2,
        commands: [
          {
            args: [16384],
            property: 'clear',
          },
        ],
      },
    });
    assertSnapshot(ctx.events);
  });

  it('will record changes to a canvas element before the canvas gets added', async () => {
    await ctx.page.evaluate(() => {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl')!;
      var program = gl.createProgram()!;
      gl.linkProgram(program);
      gl.clear(gl.COLOR_BUFFER_BIT);
      document.body.appendChild(canvas);
    });

    await waitForRAF(ctx.page);

    assertSnapshot(ctx.events);
  });

  it('will record changes to a canvas element before the canvas gets added (webgl2)', async () => {
    await ctx.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl2')!;
        var program = gl.createProgram()!;
        gl.linkProgram(program);
        gl.clear(gl.COLOR_BUFFER_BIT);
        setTimeout(() => {
          document.body.appendChild(canvas);
          resolve();
        }, 10);
      });
    });

    // FIXME: this wait deeply couples the test to the implementation
    // When `pendingCanvasMutations` isn't run on requestAnimationFrame,
    // we need to change this
    await waitForRAF(ctx.page);

    assertSnapshot(ctx.events);
  });

  it('will record webgl variables', async () => {
    await ctx.page.evaluate(() => {
      var canvas = document.getElementById('canvas') as HTMLCanvasElement;
      var gl = canvas.getContext('webgl')!;
      var program0 = gl.createProgram()!;
      gl.linkProgram(program0);
      var program1 = gl.createProgram()!;
      gl.linkProgram(program1);
    });

    await ctx.page.waitForTimeout(50);

    assertSnapshot(ctx.events);
  });

  it('will record webgl variables in reverse order', async () => {
    await ctx.page.evaluate(() => {
      var canvas = document.getElementById('canvas') as HTMLCanvasElement;
      var gl = canvas.getContext('webgl')!;
      var program0 = gl.createProgram()!;
      var program1 = gl.createProgram()!;
      // attach them in reverse order
      gl.linkProgram(program1);
      gl.linkProgram(program0);
    });

    await ctx.page.waitForTimeout(50);

    assertSnapshot(ctx.events);
  });

  it('sets _context on canvas.getContext()', async () => {
    const context = await ctx.page.evaluate(() => {
      var canvas = document.getElementById('canvas') as HTMLCanvasElement;
      canvas.getContext('webgl')!;
      return (canvas as ICanvas).__context;
    });

    expect(context).toBe('webgl');
  });

  it('only sets _context on first canvas.getContext() call', async () => {
    const context = await ctx.page.evaluate(() => {
      var canvas = document.getElementById('canvas') as HTMLCanvasElement;
      canvas.getContext('webgl');
      canvas.getContext('2d'); // returns null
      return (canvas as ICanvas).__context;
    });

    expect(context).toBe('webgl');
  });

  it('should batch events by RAF', async () => {
    await ctx.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl') as WebGLRenderingContext;
        const program = gl.createProgram()!;
        gl.linkProgram(program);
        requestAnimationFrame(() => {
          const program2 = gl.createProgram()!;
          gl.linkProgram(program2);
          gl.clear(gl.COLOR_BUFFER_BIT);
          requestAnimationFrame(() => {
            gl.clear(gl.COLOR_BUFFER_BIT);
            resolve();
          });
        });
      });
    });

    await ctx.page.waitForTimeout(50);

    assertSnapshot(ctx.events);
    expect(ctx.events.length).toEqual(5);
  });
});
