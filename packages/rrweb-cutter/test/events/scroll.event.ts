import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const now = Date.now();
const events: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: now,
  },
  {
    type: EventType.Load,
    data: {},
    timestamp: now + 100,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1200,
      height: 500,
    },
    timestamp: now + 100,
  },
  // full snapshot:
  {
    data: {
      node: {
        id: 1,
        type: 0,
        childNodes: [
          { id: 2, name: 'html', type: 1, publicId: '', systemId: '' },
          {
            id: 3,
            type: 2,
            tagName: 'html',
            attributes: { lang: 'en' },
            childNodes: [
              {
                id: 4,
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [],
              },
              {
                id: 5,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      id: 'container',
                      style: 'height: 1000px; overflow: scroll;',
                    },
                    childNodes: [],
                    id: 6,
                  },
                ],
              },
            ],
          },
        ],
      },
      initialOffset: { top: 0, left: 0 },
    },
    type: EventType.FullSnapshot,
    timestamp: now + 100,
  },
  // scroll event on the "#container" div
  {
    type: EventType.IncrementalSnapshot,
    data: { source: IncrementalSource.Scroll, id: 6, x: 100, y: 150 },
    timestamp: now + 1000,
  },
  // scroll event on document
  {
    type: EventType.IncrementalSnapshot,
    data: { source: IncrementalSource.Scroll, id: 1, x: 200, y: 250 },
    timestamp: now + 1500,
  },
  // A dummy event to increase the session duration
  {
    type: EventType.Custom,
    data: {
      tag: 'dummy',
      payload: {},
    },
    timestamp: now + 2000,
  },
];

export default events;
