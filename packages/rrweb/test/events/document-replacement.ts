import { EventType, IncrementalSource } from '@saola.ai/rrweb-types';
import type { eventWithTime } from '@saola.ai/rrweb-types';

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
                childNodes: [],
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
  // mutation that replace the old document
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 1,
          nextId: null,
          node: {
            type: 2,
            tagName: 'html',
            attributes: {},
            childNodes: [],
            id: 6,
          },
        },
        {
          parentId: 6,
          nextId: null,
          node: {
            type: 2,
            tagName: 'body',
            attributes: {},
            childNodes: [],
            id: 7,
          },
        },
        {
          parentId: 1,
          nextId: 6,
          node: {
            type: 1,
            name: 'html',
            publicId: '',
            systemId: '',
            id: 8,
          },
        },
        {
          parentId: 6,
          nextId: 7,
          node: {
            type: 2,
            tagName: 'head',
            attributes: {},
            childNodes: [],
            id: 9,
          },
        },
      ],
    },
    timestamp: now + 500,
  },
];

export default events;
