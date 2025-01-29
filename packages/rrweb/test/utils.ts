import {
  NodeType,
  EventType,
  IncrementalSource,
  eventWithTime,
  eventWithoutTime,
  MouseInteractions,
  Optional,
  mouseInteractionData,
  pluginEvent,
} from '@saola.ai/rrweb-types';
import type { recordOptions } from '../src/types';
import * as puppeteer from 'puppeteer';
import { format } from 'prettier';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

export async function launchPuppeteer(
  options?: Parameters<(typeof puppeteer)['launch']>[0],
) {
  return await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS ? 'new' : false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: ['--no-sandbox'],
    ...options,
  });
}

interface IMimeType {
  [key: string]: string;
}

export interface ISuite {
  server: http.Server;
  serverURL: string;
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  events: eventWithTime[];
}

export const startServer = (defaultPort = 3030) =>
  new Promise<http.Server>((resolve) => {
    const mimeType: IMimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.webm': 'video/webm',
    };
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!);
      const sanitizePath = path
        .normalize(parsedUrl.pathname!)
        .replace(/^(\.\.[\/\\])+/, '');

      let pathname = path.join(__dirname, sanitizePath);
      if (/^\/rrweb.*\.c?js.*/.test(sanitizePath)) {
        pathname = path.join(__dirname, `../dist/main`, sanitizePath);
      }

      try {
        const data = fs.readFileSync(pathname);
        const ext = path.parse(pathname).ext;
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-type');
        if (ext === '.webm') res.setHeader('Accept-Ranges', 'bytes');
        setTimeout(() => {
          res.end(data);
          // mock delay
        }, 100);
      } catch (error) {
        res.end();
      }
    });
    s.listen(defaultPort)
      .on('listening', () => {
        resolve(s);
      })
      .on('error', (e) => {
        s.listen().on('listening', () => {
          resolve(s);
        });
      });
  });

export function getServerURL(server: http.Server): string {
  const address = server.address();
  if (address && typeof address !== 'string') {
    return `http://localhost:${address.port}`;
  } else {
    return `${address}`;
  }
}

/**
 * Puppeteer may cast random mouse move which make our tests flaky.
 * So we only do snapshot test with filtered events.
 * Also remove timestamp from event.
 * @param snapshots incrementalSnapshotEvent[]
 */
export function stringifySnapshots(snapshots: eventWithTime[]): string {
  return JSON.stringify(
    snapshots
      .filter((s) => {
        if (
          // mouse move or viewport resize can happen on accidental user interference
          // so we ignore them
          (s.type === EventType.IncrementalSnapshot &&
            (s.data.source === IncrementalSource.MouseMove ||
              s.data.source === IncrementalSource.ViewportResize)) ||
          // ignore '[vite] connected' messages from vite
          (s.type === EventType.Plugin &&
            s.data.plugin === 'rrweb/console@1' &&
            (s.data.payload as { payload: string[] })?.payload?.find((msg) =>
              msg.includes('[vite] connected'),
            ))
        ) {
          return false;
        }
        return true;
      })
      .map((s) => {
        if (s.type === EventType.Meta) {
          s.data.href = 'about:blank';
        }
        // FIXME: travis coordinates seems different with my laptop
        const coordinatesReg =
          /(bottom|top|left|right|width|height): \d+(\.\d+)?px/g;
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseInteraction
        ) {
          delete (s.data as Optional<mouseInteractionData, 'x'>).x;
          delete (s.data as Optional<mouseInteractionData, 'y'>).y;
        }
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.Mutation
        ) {
          s.data.attributes.forEach((a) => {
            if ('style' in a.attributes && a.attributes.style) {
              if (typeof a.attributes.style === 'object') {
                for (const [k, v] of Object.entries(a.attributes.style)) {
                  if (Array.isArray(v)) {
                    if (coordinatesReg.test(k + ': ' + v[0])) {
                      // TODO: could round the number here instead depending on what's coming out of various test envs
                      a.attributes.style[k] = ['Npx', v[1]];
                    }
                  } else if (typeof v === 'string') {
                    if (coordinatesReg.test(k + ': ' + v)) {
                      a.attributes.style[k] = 'Npx';
                    }
                  }
                  coordinatesReg.lastIndex = 0; // wow, a real wart in ECMAScript
                }
              } else if (coordinatesReg.test(a.attributes.style)) {
                a.attributes.style = a.attributes.style.replace(
                  coordinatesReg,
                  '$1: Npx',
                );
              }
            }

            // strip blob:urls as they are different every time
            stripBlobURLsFromAttributes(a);
          });
          s.data.adds.forEach((add) => {
            if (add.node.type === NodeType.Element) {
              if (
                'style' in add.node.attributes &&
                typeof add.node.attributes.style === 'string' &&
                coordinatesReg.test(add.node.attributes.style)
              ) {
                add.node.attributes.style = add.node.attributes.style.replace(
                  coordinatesReg,
                  '$1: Npx',
                );
              }
              coordinatesReg.lastIndex = 0; // wow, a real wart in ECMAScript

              // strip blob:urls as they are different every time
              stripBlobURLsFromAttributes(add.node);

              // strip rr_dataURL as they are not consistent
              if (
                'rr_dataURL' in add.node.attributes &&
                add.node.attributes.rr_dataURL &&
                typeof add.node.attributes.rr_dataURL === 'string'
              ) {
                add.node.attributes.rr_dataURL =
                  add.node.attributes.rr_dataURL.replace(/,.+$/, ',...');
              }
            }
          });
        } else if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MediaInteraction
        ) {
          // round the currentTime to 1 decimal place
          if (s.data.currentTime) {
            s.data.currentTime = Math.round(s.data.currentTime * 10) / 10;
          }
        } else if (
          s.type === EventType.Plugin &&
          s.data.plugin === 'rrweb/console@1'
        ) {
          const pluginPayload = (
            s as pluginEvent<{
              trace: string[];
              payload: string[];
            }>
          ).data.payload;

          if (pluginPayload?.trace.length) {
            pluginPayload.trace = pluginPayload.trace.map((trace) => {
              return trace.replace(
                /^pptr:evaluate;.*?:(\d+:\d+)/,
                '__puppeteer_evaluation_script__:$1',
              );
            });
          }
          if (pluginPayload?.payload.length) {
            pluginPayload.payload = pluginPayload.payload.map((payload) => {
              return payload.replace(
                /pptr:evaluate;.*?:(\d+:\d+)/g,
                '__puppeteer_evaluation_script__:$1',
              );
            });
          }
        }
        delete (s as Optional<eventWithTime, 'timestamp'>).timestamp;
        return s as eventWithoutTime;
      }),
    null,
    2,
  ).replace(
    // servers might get run on a random port,
    // so we need to normalize the port number
    /http:\/\/localhost:\d+/g,
    'http://localhost:3030',
  );
}

function stripBlobURLsFromAttributes(node: {
  attributes: {
    [key: string]: any;
  };
}) {
  for (const attr in node.attributes) {
    if (
      typeof node.attributes[attr] === 'string' &&
      node.attributes[attr].startsWith('blob:')
    ) {
      node.attributes[attr] = node.attributes[attr]
        .replace(/[\w-]+$/, '...')
        .replace(/:[0-9]+\//, ':xxxx/');
    }
  }
}

function stringifyDomSnapshot(mhtml: string): string {
  const { Parser } = require('fast-mhtml');
  const resources: string[] = [];
  const p = new Parser({
    rewriteFn: (filename: string): string => {
      const index = resources.indexOf(filename);
      const prefix = /^\w+/.exec(filename);
      if (index !== -1) {
        return `file-${prefix}-${index}`;
      } else {
        return `file-${prefix}-${resources.push(filename) - 1}`;
      }
    },
  });
  const result = p
    .parse(mhtml) // parse file
    .rewrite() // rewrite all links
    .spit(); // return all contents

  const newResult: { filename: string; content: string }[] = result.map(
    (asset: { filename: string; content: string }) => {
      const { filename, content } = asset;
      let res: string | undefined;
      if (filename.includes('frame')) {
        res = format(content, {
          parser: 'html',
        });
      }
      return { filename, content: res || content };
    },
  );
  return newResult.map((asset) => Object.values(asset).join('\n')).join('\n\n');
}

export async function assertSnapshot(
  snapshotsOrPage: eventWithTime[] | puppeteer.Page,
) {
  let snapshots: eventWithTime[];
  if (!Array.isArray(snapshotsOrPage)) {
    // make sure page has finished executing js
    await waitForRAF(snapshotsOrPage);
    await snapshotsOrPage.waitForFunction(
      'window.snapshots && window.snapshots.length > 0',
    );

    snapshots = (await snapshotsOrPage.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
  } else {
    snapshots = snapshotsOrPage;
  }

  expect(snapshots).toBeDefined();
  expect(stringifySnapshots(snapshots)).toMatchSnapshot();
}

export function replaceLast(str: string, find: string, replace: string) {
  const index = str.lastIndexOf(find);
  if (index === -1) {
    return str;
  }
  return str.substring(0, index) + replace + str.substring(index + find.length);
}

export async function assertDomSnapshot(page: puppeteer.Page) {
  const cdp = await page.target().createCDPSession();
  const { data } = await cdp.send('Page.captureSnapshot', {
    format: 'mhtml',
  });

  expect(stringifyDomSnapshot(data)).toMatchSnapshot();
}

export function stripBase64(events: eventWithTime[]) {
  const base64Strings: string[] = [];
  function walk<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((e) => walk(e)) as unknown as T;
    const newObj: Partial<T> = {};
    for (const prop in obj) {
      const value = obj[prop];
      if (prop === 'base64' && typeof value === 'string') {
        let index = base64Strings.indexOf(value);
        if (index === -1) {
          index = base64Strings.push(value) - 1;
        }
        (newObj as any)[prop] = `base64-${index}`;
      } else {
        (newObj as any)[prop] = walk(value);
      }
    }
    return newObj as T;
  }

  return events.map((evt) => {
    if (
      evt.type === EventType.IncrementalSnapshot &&
      evt.data.source === IncrementalSource.CanvasMutation
    ) {
      const newData = walk(evt.data);
      return { ...evt, data: newData };
    }
    return evt;
  });
}

const now = Date.now();
export const sampleEvents: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: now,
  },
  {
    type: EventType.Load,
    data: {},
    timestamp: now + 1000,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 2,
            tagName: 'html',
            attributes: {},
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [],
                id: 3,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
                id: 4,
              },
            ],
            id: 2,
          },
        ],
        id: 1,
      },
      initialOffset: {
        top: 0,
        left: 0,
      },
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp: now + 2000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp: now + 3000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp: now + 4000,
  },
];

export const sampleStyleSheetRemoveEvents: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: now,
  },
  {
    type: EventType.Load,
    data: {},
    timestamp: now + 1000,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 2,
            tagName: 'html',
            attributes: {},
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    tagName: 'style',
                    attributes: {
                      'data-jss': '',
                      'data-meta': 'OverlayDrawer',
                      _cssText:
                        '.OverlayDrawer-modal-187 { }.OverlayDrawer-paper-188 { width: 100%; }@media (min-width: 48em) {\n  .OverlayDrawer-paper-188 { width: 38rem; }\n}@media (min-width: 48em) {\n}@media (min-width: 48em) {\n}',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: '\n',
                        isStyle: true,
                        id: 5,
                      },
                    ],
                    id: 4,
                  },
                ],
                id: 3,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
                id: 6,
              },
            ],
            id: 2,
          },
        ],
        id: 1,
      },
      initialOffset: {
        top: 0,
        left: 0,
      },
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [
        {
          parentId: 3,
          id: 4,
        },
      ],
      adds: [],
    },
    timestamp: now + 2000,
  },
];

export const sampleRemoteStyleSheetEvents: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: now,
  },
  {
    type: EventType.Load,
    data: {},
    timestamp: now + 1000,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 2,
            tagName: 'html',
            attributes: {},
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    tagName: 'link',
                    attributes: {
                      rel: 'stylesheet',
                      href: '',
                    },
                    childNodes: [],
                    id: 4,
                  },
                ],
                id: 3,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
                id: 6,
              },
            ],
            id: 2,
          },
        ],
        id: 1,
      },
      initialOffset: {
        top: 0,
        left: 0,
      },
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [
        {
          id: 4,
          attributes: {
            href: null,
            rel: null,
            _cssText:
              '.OverlayDrawer-modal-187 { }.OverlayDrawer-paper-188 { width: 100%; }@media (min-width: 48em) {\n  .OverlayDrawer-paper-188 { width: 38rem; }\n}@media (min-width: 48em) {\n}@media (min-width: 48em) {\n}',
          },
        },
      ],
      removes: [],
      adds: [],
    },
    timestamp: now + 2000,
  },
];

export const polyfillWebGLGlobals = () => {
  // polyfill as jsdom does not have support for these classes
  // consider replacing with https://www.npmjs.com/package/canvas
  class WebGLActiveInfo {
    constructor() {}
  }

  global.WebGLActiveInfo = WebGLActiveInfo as any;
  class WebGLBuffer {
    constructor() {}
  }

  global.WebGLBuffer = WebGLBuffer as any;
  class WebGLFramebuffer {
    constructor() {}
  }

  global.WebGLFramebuffer = WebGLFramebuffer as any;
  class WebGLProgram {
    constructor() {}
  }

  global.WebGLProgram = WebGLProgram as any;
  class WebGLRenderbuffer {
    constructor() {}
  }

  global.WebGLRenderbuffer = WebGLRenderbuffer as any;
  class WebGLShader {
    constructor() {}
  }

  global.WebGLShader = WebGLShader as any;
  class WebGLShaderPrecisionFormat {
    constructor() {}
  }

  global.WebGLShaderPrecisionFormat = WebGLShaderPrecisionFormat as any;
  class WebGLTexture {
    constructor() {}
  }

  global.WebGLTexture = WebGLTexture as any;
  class WebGLUniformLocation {
    constructor() {}
  }

  global.WebGLUniformLocation = WebGLUniformLocation as any;
  class WebGLVertexArrayObject {
    constructor() {}
  }

  global.WebGLVertexArrayObject = WebGLVertexArrayObject as any;

  class ImageData {
    public data: Uint8ClampedArray;
    public width: number;
    public height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  }

  global.ImageData = ImageData as any;

  class WebGL2RenderingContext {
    constructor() {}
  }
  global.WebGL2RenderingContext = WebGL2RenderingContext as any;
};

export async function waitForRAF(
  pageOrFrame: puppeteer.Page | puppeteer.Frame,
) {
  return await pageOrFrame.evaluate(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  });
}

export async function waitForIFrameLoad(
  page: puppeteer.Frame | puppeteer.Page,
  iframeSelector: string,
  timeout = 10000,
): Promise<puppeteer.Frame> {
  const el = await page.waitForSelector(iframeSelector);
  if (!el)
    throw new Error('Waiting for iframe load has timed out - no element found');

  let frame = await el.contentFrame();
  if (frame && frame.isDetached()) {
    throw new Error(
      'Waiting for iframe load has timed out - frame is detached',
    );
  }
  if (frame && frame.url() !== '') {
    return frame;
  }

  await page.$eval(
    iframeSelector,
    (el, timeout) => {
      const p = new Promise((resolve, reject) => {
        (el as HTMLIFrameElement).onload = () => {
          resolve(el as HTMLIFrameElement);
        };
        setTimeout(() => {
          reject(
            new Error(
              'Waiting for iframe load has timed out - onload not fired',
            ),
          );
        }, timeout);
      });
      return p;
    },
    timeout,
  );

  frame = await el.contentFrame();
  if (!frame)
    throw new Error('Waiting for iframe load has timed out - no frame found');
  return frame;
}

export function generateRecordSnippet(options: recordOptions<eventWithTime>) {
  return `
  rrweb.record({
    emit: event => {
      if (!window.snapshots) window.snapshots = [];
      window.snapshots.push(event);
    },
    ignoreSelector: ${JSON.stringify(options.ignoreSelector)},
    maskTextSelector: ${JSON.stringify(options.maskTextSelector)},
    maskAllInputs: ${options.maskAllInputs},
    maskInputOptions: ${JSON.stringify(options.maskAllInputs)},
    userTriggeredOnInput: ${options.userTriggeredOnInput},
    maskTextClass: ${options.maskTextClass},
    maskTextFn: ${options.maskTextFn},
    maskInputFn: ${options.maskInputFn},
    recordCanvas: ${options.recordCanvas},
    recordAfter: '${options.recordAfter || 'load'}',
    inlineImages: ${options.inlineImages},
    plugins: ${options.plugins}
  });
  `;
}

export async function hideMouseAnimation(p: puppeteer.Page): Promise<void> {
  await p.addStyleTag({
    content: `.replayer-mouse-tail{display: none !important;}
                html, body { margin: 0; padding: 0; }
                iframe { border: none; }`,
  });
}

export const fakeGoto = async (p: puppeteer.Page, url: string) => {
  const intercept = async (request: puppeteer.HTTPRequest) => {
    await request.respond({
      status: 200,
      contentType: 'text/html',
      body: ' ', // non-empty string or page will load indefinitely
    });
  };
  await p.setRequestInterception(true);
  p.on('request', intercept);
  await p.goto(url);
  p.off('request', intercept);
  await p.setRequestInterception(false);
};
