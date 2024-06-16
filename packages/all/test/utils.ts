import { NodeType } from '@saola.ai/rrweb-snapshot';
import { expect } from 'vitest';
import {
  EventType,
  IncrementalSource,
  eventWithTime,
  Optional,
  mouseInteractionData,
  event,
  pluginEvent,
} from '@saola.ai/rrweb-types';
import * as puppeteer from 'puppeteer';
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
export const startServer = (defaultPort = 3030) =>
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
      if (/^\/rrweb.*\.c?js.*/.test(sanitizePath)) {
        pathname = path.join(__dirname, `../dist`, sanitizePath);
      }

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
          (s.data.source === IncrementalSource.MouseMove ||
            s.data.source === IncrementalSource.ViewportResize)
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
        return s as event;
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
    src?: string;
  };
}) {
  if (
    'src' in node.attributes &&
    node.attributes.src &&
    typeof node.attributes.src === 'string' &&
    node.attributes.src.startsWith('blob:')
  ) {
    node.attributes.src = node.attributes.src
      .replace(/[\w-]+$/, '...')
      .replace(/:[0-9]+\//, ':xxxx/');
  }
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
