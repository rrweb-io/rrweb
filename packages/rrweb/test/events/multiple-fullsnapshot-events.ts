import { EventType, IncrementalSource, MouseInteractions } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const now = Date.now();

const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now,
  },
  // first full snapshot with the root node id 1
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        id: 1,
        type: 0,
        childNodes: [
          {
            id: 2,
            type: 2,
            tagName: 'html',
            attributes: { lang: 'en' },
            childNodes: [
              {
                id: 3,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
              },
            ],
          },
        ],
      },
      initialOffset: { top: 0, left: 0 },
    },
    timestamp: now + 1,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now + 1000,
  },
  // second full snapshot with the root node id 100
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        id: 100,
        type: 0,
        childNodes: [
          {
            id: 2,
            type: 2,
            tagName: 'html',
            attributes: { lang: 'en' },
            childNodes: [
              {
                id: 3,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
              },
            ],
          },
        ],
      },
      initialOffset: { top: 0, left: 0 },
    },
    timestamp: now + 1001,
  },
  // Dummy event
  {
    type: 3,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
      pointerType: 0,
    },
    timestamp: now + 1500,
  },
];

export default events;
