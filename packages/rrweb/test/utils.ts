import { NodeType } from 'rrweb-snapshot';
import {
  EventType,
  IncrementalSource,
  eventWithTime,
  MouseInteractions,
} from '../src/types';
import * as puppeteer from 'puppeteer';
import { format } from 'prettier';

export async function launchPuppeteer() {
  return await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS ? true : false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: ['--no-sandbox'],
  });
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
          delete s.data.x;
          delete s.data.y;
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
        delete s.timestamp;
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
  expect(stringifySnapshots(snapshots)).toMatchSnapshot();
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
};
