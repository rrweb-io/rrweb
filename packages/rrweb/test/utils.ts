import { NodeType } from 'rrweb-snapshot';
import {
  EventType,
  IncrementalSource,
  eventWithTime,
  MouseInteractions,
} from '../src/types';
import * as puppeteer from 'puppeteer';
import { format } from 'prettier';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

export async function launchPuppeteer() {
  return await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS ? true : false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    // devtools: true,
    args: ['--no-sandbox'],
  });
}

interface IMimeType {
  [key: string]: string;
}

export const startServer = (defaultPort: number = 3030) =>
  new Promise<http.Server>((resolve) => {
    const mimeType: IMimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
    };
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!);
      const sanitizePath = path
        .normalize(parsedUrl.pathname!)
        .replace(/^(\.\.[\/\\])+/, '');
      let pathname = path.join(__dirname, sanitizePath);

      try {
        const data = fs.readFileSync(pathname);
        const ext = path.parse(pathname).ext;
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-type');
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
        console.log('port in use, trying next one');
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
function stringifySnapshots(snapshots: eventWithTime[]): string {
  return JSON.stringify(
    snapshots
      .filter((s) => {
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseMove
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
        const coordinatesReg = /(bottom|top|left|right|width|height): \d+(\.\d+)?px/g;
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.MouseInteraction
        ) {
          delete (s.data as any).x;
          delete (s.data as any).y;
        }
        if (
          s.type === EventType.IncrementalSnapshot &&
          s.data.source === IncrementalSource.Mutation
        ) {
          s.data.attributes.forEach((a) => {
            if (
              'style' in a.attributes &&
              a.attributes.style &&
              typeof a.attributes.style === 'object'
            ) {
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
            }
          });
          s.data.adds.forEach((add) => {
            if (
              add.node.type === NodeType.Element &&
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
          });
        }
        delete (s as any).timestamp;
        return s;
      }),
    null,
    2,
  );
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

  const newResult: Array<{ filename: string; content: string }> = result.map(
    (asset: { filename: string; content: string }) => {
      let { filename, content } = asset;
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

export function assertSnapshot(snapshots: eventWithTime[]) {
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

export async function assertDomSnapshot(
  page: puppeteer.Page,
  filename: string,
  name: string,
) {
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
    if (Array.isArray(obj)) return (obj.map((e) => walk(e)) as unknown) as T;
    const newObj: Partial<T> = {};
    for (let prop in obj) {
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

  return events.map((event) => {
    if (
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.CanvasMutation
    ) {
      const newData = walk(event.data);
      return { ...event, data: newData };
    }
    return event;
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

export async function waitForRAF(page: puppeteer.Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  });
}
