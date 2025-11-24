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
} from '@rrweb/types';
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

export const startServer = (defaultPort: number = 3031) =>
  new Promise<http.Server>((resolve) => {
    const mimeType: IMimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
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
        if (s.type === EventType.Asset) {
          s.data.url = s.data.url.replace(/\/[a-f0-9\-]+$/, '/...');
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
            stripBlobURLsFromValues(a.attributes);
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
              stripBlobURLsFromValues(add.node.attributes);

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
          s.type === EventType.FullSnapshot &&
          s.data.capturedAssetStatuses
        ) {
          s.data.capturedAssetStatuses.forEach(stripBlobURLsFromValues);
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
    // stripBlobURLsFromValues would have to recursively
    // examine fullsnapshots to do this 'properly'
    /href": "blob:null\/[^"]+"/g,
    'href": "blob:null/..."',
  );
}

function stripBlobURLsFromValues(attributes: { [key: string]: any }) {
  for (const attr in attributes) {
    if (
      typeof attributes[attr] === 'string' &&
      attributes[attr].startsWith('blob:')
    ) {
      attributes[attr] = attributes[attr]
        .replace(/[\w-]+$/, '...')
        .replace(/:[0-9]+\//, ':xxxx/');
    }
  }
}

export async function assertSnapshot(
  snapshotsOrPage: eventWithTime[] | puppeteer.Page,
  useOwnFile: boolean | string = false,
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

  if (useOwnFile) {
    // e.g. 'mutation.test.ts > mutation > add elements at once'
    const long_fname = expect.getState().currentTestName.split('/').pop();
    const file = long_fname.split(' > ')[0].replace('.test.ts', '');
    if (typeof useOwnFile !== 'string') {
      useOwnFile = long_fname.substring(long_fname.indexOf(' > ') + 3);
    }
    useOwnFile = useOwnFile.replace(/ > /g, '.').replace(/\s/g, '_');

    const fname = `./__${file}.snapshots__/${useOwnFile}.json`;
    expect(stringifySnapshots(snapshots)).toMatchFileSnapshot(fname);
  } else {
    expect(stringifySnapshots(snapshots)).toMatchSnapshot();
  }
}

export function replaceLast(str: string, find: string, replace: string) {
  const index = str.lastIndexOf(find);
  if (index === -1) {
    return str;
  }
  return str.substring(0, index) + replace + str.substring(index + find.length);
}

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
