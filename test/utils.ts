import { SnapshotState, toMatchSnapshot } from 'jest-snapshot';
import { NodeType } from 'rrweb-snapshot';
import { assert } from 'chai';
import {
  EventType,
  IncrementalSource,
  eventWithTime,
  MouseInteractions,
} from '../src/types';
import * as puppeteer from 'puppeteer';

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

export function matchSnapshot(
  actual: string,
  testFile: string,
  testTitle: string,
) {
  const snapshotState = new SnapshotState(testFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'new',
  });

  const matcher = toMatchSnapshot.bind({
    snapshotState,
    currentTestName: testTitle,
  });
  const result = matcher(actual);
  snapshotState.save();
  return result;
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
        const coordinatesReg = /(bottom|top|left|right)/;
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
              coordinatesReg.test(a.attributes.style!)
            ) {
              delete a.attributes.style;
            }
          });
          s.data.adds.forEach((add) => {
            if (
              add.node.type === NodeType.Element &&
              'style' in add.node.attributes &&
              typeof add.node.attributes.style === 'string' &&
              coordinatesReg.test(add.node.attributes.style)
            ) {
              delete add.node.attributes.style;
            }
          });
        }
        delete s.timestamp;
        return s;
      }),
    null,
    2,
  );
}

export function assertSnapshot(
  snapshots: eventWithTime[],
  filename: string,
  name: string,
) {
  const result = matchSnapshot(stringifySnapshots(snapshots), filename, name);
  assert(result.pass, result.pass ? '' : result.report());
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
                    tagName: "style",
                    attributes: {
                      "data-jss": "",
                      "data-meta": "OverlayDrawer",
                      _cssText: ".OverlayDrawer-modal-187 { }.OverlayDrawer-paper-188 { width: 100%; }@media (min-width: 48em) {\n  .OverlayDrawer-paper-188 { width: 38rem; }\n}@media (min-width: 48em) {\n}@media (min-width: 48em) {\n}"
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: "\n",
                        isStyle: true,
                        id: 5
                      },
                    ],
                    id: 4
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
          id: 4
        }
      ],
      adds: []
    },
    timestamp: now + 2000,
  },
];
