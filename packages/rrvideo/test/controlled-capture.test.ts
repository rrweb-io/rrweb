import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { RRvideoConfig } from '../src/types';
async function transformToVideo(options: RRvideoConfig) {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `require('./build').transformToVideo(JSON.parse(process.argv[1])).catch(e => {console.error(e.message); process.exit(1)})`,
      JSON.stringify(options),
    ],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 30000 },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || String(result.error));
}
import events from './events/example';

// A played <video> whose source can never load (a common shape for MSE
// players such as HLS.js), plus DOM mutations spread across 0.6s. Media
// rejection must stay diagnostic-only; the visible mutations must keep
// getting captured.
function mediaElement(
  id: number,
  tagName: string,
  attributes: Record<string, unknown> = {},
) {
  return { type: 2, id, tagName, attributes, childNodes: [] as unknown[] };
}
const unavailableMediaEvents = [
  {
    type: 4,
    timestamp: 1700000000000,
    data: { href: 'about:blank', width: 640, height: 360 },
  },
  {
    type: 2,
    timestamp: 1700000000000,
    data: {
      initialOffset: { top: 0, left: 0 },
      node: {
        type: 0,
        id: 1,
        childNodes: [
          { type: 1, id: 2, name: 'html', publicId: '', systemId: '' },
          {
            type: 2,
            id: 3,
            tagName: 'html',
            attributes: {},
            childNodes: [
              {
                type: 2,
                id: 4,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    id: 5,
                    tagName: 'style',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        id: 6,
                        textContent:
                          'html,body{margin:0;width:640px;height:360px;background:#fff;font:24px monospace}',
                      },
                    ],
                  },
                ],
              },
              {
                type: 2,
                id: 7,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    id: 8,
                    tagName: 'p',
                    attributes: {},
                    childNodes: [{ type: 3, id: 9, textContent: '0' }],
                  },
                  mediaElement(10, 'video', {
                    src: 'blob:https://example.test/unavailable',
                    autoplay: true,
                    rr_mediaState: 'played',
                  }),
                ],
              },
            ],
          },
        ],
      },
    },
  },
  ...Array.from({ length: 6 }, (_, i) => {
    const t = (i + 1) * 100;
    return {
      type: 3,
      timestamp: 1700000000000 + t,
      data: {
        source: 0,
        adds: [],
        removes: [],
        attributes: [],
        texts: [{ id: 9, value: String(t) }],
      },
    };
  }),
];

jest.setTimeout(60000);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rrvideo-controlled-'));
const input = path.join(dir, 'events.json');
beforeAll(() => fs.writeJsonSync(input, events));
afterAll(() => fs.removeSync(dir));
function hashes(file: string): string[] {
  const result = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'framemd5', '-'],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(',').pop()!.trim());
}
it('keeps JS replay frames unchanged when capture is delayed and renders mutations', async () => {
  const outputs: string[][] = [];
  for (const frameDelayMs of [0, 50]) {
    const output = path.join(dir, `delay-${frameDelayMs}.mp4`);
    await transformToVideo({
      input,
      output,
      fps: 20,
      resolutionRatio: 0.2,
      frameDelayMs,
      replayMode: 'incremental',
    } as Parameters<typeof transformToVideo>[0]);
    outputs.push(hashes(output));
  }
  expect(outputs[0]).toHaveLength(6);
  expect(new Set(outputs[0]).size).toBeGreaterThan(1);
  expect(outputs[1]).toEqual(outputs[0]);
});
it('preserves an existing output and removes temporary files when the encoder cannot start', async () => {
  const output = path.join(dir, 'existing.mp4');
  fs.writeFileSync(output, 'keep existing output');
  await expect(
    transformToVideo({
      input,
      output,
      ffmpegPath: path.join(dir, 'missing-ffmpeg'),
      captureTimeoutMs: 3000,
    }),
  ).rejects.toThrow(/start ffmpeg/);
  expect(fs.readFileSync(output, 'utf8')).toBe('keep existing output');
  expect(
    fs.readdirSync(dir).filter((name) => name.startsWith('.rrvideo-')),
  ).toEqual([]);
});

if (process.platform === 'darwin') {
  it('rejects compositor capture on macOS before starting the encoder', async () => {
    await expect(
      transformToVideo({
        input,
        capture: 'compositor',
        ffmpegPath: '/missing',
      }),
    ).rejects.toThrow(/Linux|Windows/);
  });
}

if (process.platform === 'linux' || process.platform === 'win32') {
  it('advances CSS animation to the compositor timestamp', () => {
    const result = spawnSync(
      process.execPath,
      [
        '-e',
        `
      const assert = require('assert');
      const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
      const { resolveConfig } = require('./build/config');
      (async () => {
        const config = resolveConfig({input:'unused',capture:'compositor',fps:30});
        config.rrwebPlayer = {width:640,height:360};
        const browser = await launchCaptureBrowser(config);
        try {
          const source = await FrameSource.create(browser, require('./benchmark/fixtures.cjs')['css-animation'], {width:640,height:360}, config);
          await source.frame(0);
          const start = await source.page.frameLocator('iframe').locator('#box').evaluate(el => el.getBoundingClientRect().left);
          for(let i=1; i<=30; i++) await source.frame(i);
          const end = await source.page.frameLocator('iframe').locator('#box').evaluate(el => el.getBoundingClientRect().left);
          assert.ok(Math.abs(start) < 2, 'CSS animation must start at zero');
          assert.ok(Math.abs(end - 400) < 2, 'CSS animation must advance to 400px at 1000ms, got ' + end);
        } finally { await browser.close(); }
      })().catch(e => { console.error(e); process.exitCode = 1; });
    `,
      ],
      { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 15000 },
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('keeps compositor CSS animation frames identical under delayed capture', async () => {
    const fixtures = require('../benchmark/fixtures.cjs') as Record<
      string,
      unknown
    >;
    const animationInput = path.join(dir, 'animation.json');
    fs.writeJsonSync(animationInput, fixtures['css-animation']);
    const outputs: string[][] = [];
    for (const frameDelayMs of [0, 40]) {
      const output = path.join(dir, `compositor-${frameDelayMs}.mp4`);
      await transformToVideo({
        input: animationInput,
        output,
        capture: 'compositor',
        fps: 30,
        frameDelayMs,
      });
      outputs.push(hashes(output));
    }
    expect(outputs[0]).toHaveLength(60);
    expect(new Set(outputs[0]).size).toBeGreaterThan(1);
    expect(outputs[1]).toEqual(outputs[0]);
  });
}

function runCaptureScript(script: string, timeout = 20000): string {
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || String(result.error));
  }
  return result.stdout;
}

const captureBackends =
  process.platform === 'linux' || process.platform === 'win32'
    ? ['ffmpeg', 'compositor']
    : ['ffmpeg'];

it.each(captureBackends)(
  'keeps capturing %s frames past an unavailable, playing media element',
  (capture) => {
    const stdout = runCaptureScript(`
      const assert = require('assert');
      const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
      const { resolveConfig } = require('./build/config');
      const events = ${JSON.stringify(unavailableMediaEvents)};
      (async () => {
        const config = resolveConfig({input:'unused',capture:'${capture}',fps:10});
        Object.assign(config.rrwebPlayer, { width:640, height:360 });
        const browser = await launchCaptureBrowser(config);
        try {
          const source = await FrameSource.create(browser, events, {width:640,height:360}, config);
          for (let i = 0; i <= 6; i++) await source.frame(i);
          await source.finish();
          const text = await source.page.frameLocator('iframe').locator('p').textContent();
          assert.strictEqual(text, '600', 'DOM mutations must keep applying after the media rejection');
          console.log('CAPTURED_ALL_FRAMES');
        } finally { await browser.close(); }
      })().catch(e => { console.error(e); process.exitCode = 1; });
    `);
    expect(stdout.trim()).toContain('CAPTURED_ALL_FRAMES');
  },
);

it.each(
  captureBackends.flatMap((capture) => [
    [
      capture,
      'a thrown Error',
      "throw new Error('RRVIDEO_LOOP_FAILURE')",
      'RRVIDEO_LOOP_FAILURE',
    ],
    [
      capture,
      'a thrown DOMException',
      'document.body.appendChild(document)',
      'HierarchyRequestError',
    ],
  ]),
)(
  'rejects %s frame 3 when an actual rrweb timer action throws (%s)',
  (capture, _label, doAction, expectedDiagnostic) => {
    const stdout = runCaptureScript(`
      const assert = require('assert');
      const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
      const { resolveConfig } = require('./build/config');
      const events = require('./benchmark/fixtures.cjs')['dom-mutations'];
      (async () => {
        const config = resolveConfig({input:'unused',capture:'${capture}',fps:30});
        Object.assign(config.rrwebPlayer, { width:640, height:360 });
        const browser = await launchCaptureBrowser(config);
        try {
          const source = await FrameSource.create(browser, events, {width:640,height:360}, config);
          await source.frame(0);
          await source.frame(1);
          await source.frame(2);
          await source.page.evaluate(() => {
            window.replayer.getReplayer().timer.addAction({
              delay: 100,
              doAction() { ${doAction}; },
            });
          });
          let captureError;
          try { await source.frame(3); } catch (error) { captureError = error; }
          assert.ok(captureError, 'frame 3 unexpectedly succeeded after the timer action threw');
          assert.match(captureError.message, new RegExp(${JSON.stringify(
            expectedDiagnostic,
          )}));
          console.log(captureError.message);
        } finally { await browser.close(); }
      })().catch(e => { console.error(e); process.exitCode = 1; });
    `);
    expect(stdout.trim()).toContain(expectedDiagnostic);
  },
);

it.each(captureBackends)(
  'treats an unrelated rejected promise on %s as diagnostic only',
  (capture) => {
    const stdout = runCaptureScript(`
      const assert = require('assert');
      const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
      const { resolveConfig } = require('./build/config');
      const events = require('./benchmark/fixtures.cjs')['dom-mutations'];
      (async () => {
        const config = resolveConfig({input:'unused',capture:'${capture}',fps:30});
        Object.assign(config.rrwebPlayer, { width:640, height:360 });
        const browser = await launchCaptureBrowser(config);
        try {
          const source = await FrameSource.create(browser, events, {width:640,height:360}, config);
          const observed = source.page.waitForEvent('pageerror');
          await source.page.evaluate(() => queueMicrotask(() => { throw new Error('RRVIDEO_UNRELATED_DIAGNOSTIC'); }));
          const pageError = await observed;
          assert.match(pageError.message, /RRVIDEO_UNRELATED_DIAGNOSTIC/);
          await source.frame(0);
          await source.frame(1);
          await source.finish();
          console.log('SUBSEQUENT_CAPTURES_OK');
        } finally { await browser.close(); }
      })().catch(e => { console.error(e); process.exitCode = 1; });
    `);
    expect(stdout.trim()).toContain('SUBSEQUENT_CAPTURES_OK');
  },
);

if (process.platform === 'linux') {
  it('captures 30 idle compositor frames and includes the 100ms pixel change in frame 3', () => {
    const recording = [
      {
        type: 4,
        timestamp: 1700000000000,
        data: { href: 'about:blank', width: 640, height: 360 },
      },
      {
        type: 2,
        timestamp: 1700000000000,
        data: {
          initialOffset: { top: 0, left: 0 },
          node: {
            type: 0,
            id: 1,
            childNodes: [
              { type: 1, id: 2, name: 'html', publicId: '', systemId: '' },
              {
                type: 2,
                id: 3,
                tagName: 'html',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    id: 4,
                    tagName: 'head',
                    attributes: {},
                    childNodes: [
                      {
                        type: 2,
                        id: 5,
                        tagName: 'style',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            id: 6,
                            textContent:
                              'html,body{margin:0;width:640px;height:360px;background:#fff}',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 2,
                    id: 7,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        type: 3,
        timestamp: 1700000000100,
        data: {
          source: 0,
          adds: [],
          removes: [],
          attributes: [],
          texts: [
            {
              id: 6,
              value:
                'html,body{margin:0;width:640px;height:360px;background:#000}',
            },
          ],
        },
      },
      {
        type: 3,
        timestamp: 1700000001000,
        data: { source: 0, adds: [], removes: [], attributes: [], texts: [] },
      },
    ];
    const inputPath = path.join(dir, 'static-compositor.json');
    const outputPath = path.join(dir, 'static-compositor.mp4');
    fs.writeJsonSync(inputPath, recording);
    const capture = spawnSync(
      process.execPath,
      [
        '-e',
        `require('./build').transformToVideo({input:${JSON.stringify(
          inputPath,
        )},output:${JSON.stringify(
          outputPath,
        )},capture:'compositor',fps:30}).catch(e => {console.error(e.message); process.exit(1)})`,
      ],
      { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 60000 },
    );
    expect(capture.status).toBe(0);

    const decoded = spawnSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        outputPath,
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgb24',
        '-',
      ],
      { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 },
    );
    expect(decoded.status).toBe(0);
    const frameBytes = 640 * 360 * 3;
    expect(decoded.stdout.length).toBe(frameBytes * 30);
    const pixel = (frame: number) => {
      const offset = frame * frameBytes + (180 * 640 + 320) * 3;
      return [
        decoded.stdout[offset],
        decoded.stdout[offset + 1],
        decoded.stdout[offset + 2],
      ];
    };
    expect(pixel(2).every((channel) => channel > 220)).toBe(true);
    expect(pixel(3).every((channel) => channel < 40)).toBe(true);
  });
}

it.each(
  (process.platform === 'darwin'
    ? ['ffmpeg']
    : ['ffmpeg', 'compositor']
  ).flatMap((capture) =>
    [
      [30, 30, 1, '1000'],
      [120, 3, 1, '20'],
      [30, 15, 2, '1000'],
    ].map((values) => [capture, ...values]),
  ),
)(
  'applies %s mutations at %sfps frame %s with speed %s',
  (capture, fps, frame, speed, expected) => {
    const script = `
    const { FrameSource, launchCaptureBrowser } = require('./build/frame-source');
    const { resolveConfig } = require('./build/config');
    const events = require('./benchmark/fixtures.cjs')['dom-mutations'];
    (async () => {
      const config = resolveConfig({input:'unused',capture:'${capture}',fps:${fps},rrwebPlayer:{speed:${speed}}});
      Object.assign(config.rrwebPlayer, { width:640, height:360 });
      const browser = await launchCaptureBrowser(config);
      try {
        const source = await FrameSource.create(browser, events, {width:640,height:360}, config);
        await source.frame(0);
        await source.frame(${frame});
        console.log(await source.page.frameLocator('iframe').locator('p').textContent());
      } finally { await browser.close(); }
    })().catch(e => {console.error(e);process.exitCode=1});
  `;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(expected);
  },
);

it('accepts unordered events in the legacy WebM backend', async () => {
  const unorderedInput = path.join(dir, 'unordered.json');
  const output = path.join(dir, 'unordered.webm');
  fs.writeJsonSync(unorderedInput, [...events].reverse());
  await transformToVideo({
    input: unorderedInput,
    output,
    capture: 'playwright',
    resolutionRatio: 0.1,
  });
  expect(fs.statSync(output).size).toBeGreaterThan(0);
});
