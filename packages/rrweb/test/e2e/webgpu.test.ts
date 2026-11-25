import * as fs from 'fs';
import * as path from 'path';
import {
  startServer,
  launchPuppeteer,
  getServerURL,
  replaceLast,
  ISuite,
  fakeGoto,
} from '../utils';
import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

describe('e2e webgpu', () => {
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await launchPuppeteer({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-unsafe-webgpu',
      ],
    });

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await server.close();
    await browser.close();
  });

  // A WebGPU canvas only holds its image between the page's draw call and the end of
  // that frame; afterwards the current texture is expired and `createImageBitmap`
  // returns a transparent imageBitmap, which the snapshot worker drops. Callbacks queued
  // from within a `requestAnimationFrame` callback keep their relative order, so a
  // snapshot loop registered before the page's render loop would read the canvas ahead
  // of the draw on every frame. The recorder therefore snapshots WebGPU canvases from a
  // callback queued from a task, which lands behind the page's render callback.
  it('records a webgpu canvas with canvas FPS sampling when the recorder starts before the render loop', async (context) => {
    page = await browser.newPage();
    await fakeGoto(page, `${serverURL}/html/canvas-webgpu-triangle.html`);

    const html = fs.readFileSync(
      path.resolve(__dirname, '../html/canvas-webgpu-triangle.html'),
      'utf8',
    );
    await page.setContent(
      replaceLast(
        html,
        '</body>',
        `
    <script>
      ${code}
      window.snapshots = [];
      rrweb.record({
        emit: (event) => window.snapshots.push(event),
        recordCanvas: true,
        sampling: { canvas: 15 },
      });
    </script>
    </body>
    `,
      ),
    );

    const supported = await page.evaluate('window.startWebGPU()');
    if (!supported) {
      // No WebGPU adapter on this machine (e.g. a CI runner without a GPU).
      context.skip();
      return;
    }

    await page.waitForFunction(
      `window.snapshots.some((event) => event.type === ${EventType.IncrementalSnapshot} && event.data.source === ${IncrementalSource.CanvasMutation})`,
      { timeout: 3000 },
    );

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    const canvasMutations = snapshots.filter(
      (event) =>
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.CanvasMutation,
    );
    expect(canvasMutations.length).toBeGreaterThan(0);
  });
});
