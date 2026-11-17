import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const now = Date.now();

// a node (id 10) is added by one mutation and removed by a later one
const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now,
  },
  {
    type: EventType.FullSnapshot,
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
            attributes: {},
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
    timestamp: now + 10,
  },
  // add <div id="modal">
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 5,
          nextId: null,
          node: {
            id: 10,
            type: 2,
            tagName: 'div',
            attributes: { id: 'modal' },
            childNodes: [],
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
    },
    timestamp: now + 100,
  },
  // remove <div id="modal">
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [],
      removes: [{ parentId: 5, id: 10 }],
      texts: [],
      attributes: [],
    },
    timestamp: now + 200,
  },
];

export default events;
