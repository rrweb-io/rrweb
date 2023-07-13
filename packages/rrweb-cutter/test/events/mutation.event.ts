import { EventType, eventWithTime, IncrementalSource } from '@rrweb/types';

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
    data: { href: 'http://localhost', width: 1512, height: 395 },
    timestamp: now + 100,
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
                    tagName: 'meta',
                    attributes: { charset: 'utf-8' },
                    childNodes: [],
                    id: 4,
                  },
                  { type: 3, textContent: '    \n  ', id: 5 },
                ],
                id: 3,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 16 },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: { id: 'container' },
                    childNodes: [{ type: 3, textContent: '\nempty\n', id: 18 }],
                    id: 17,
                  },
                  { type: 3, textContent: '\n  \n  ', id: 19 },
                ],
                id: 6,
              },
            ],
            id: 2,
          },
        ],
        compatMode: 'BackCompat',
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: now + 100,
  },
  // mutation that adds five div elements before 1000ms
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 17, id: 18 }],
      adds: [
        {
          parentId: 17,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 29,
          },
        },
        {
          parentId: 29,
          nextId: null,
          node: { type: 3, textContent: '5', id: 30 },
        },
        {
          parentId: 17,
          nextId: 29,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 31,
          },
        },
        {
          parentId: 17,
          nextId: 31,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 32,
          },
        },
        {
          parentId: 17,
          nextId: 32,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 33,
          },
        },
        {
          parentId: 17,
          nextId: 33,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 34,
          },
        },
        {
          parentId: 34,
          nextId: null,
          node: { type: 3, textContent: '1', id: 35 },
        },
        {
          parentId: 33,
          nextId: null,
          node: { type: 3, textContent: '2', id: 36 },
        },
        {
          parentId: 32,
          nextId: null,
          node: { type: 3, textContent: '3', id: 37 },
        },
        {
          parentId: 31,
          nextId: null,
          node: { type: 3, textContent: '4', id: 38 },
        },
      ],
    },
    timestamp: now + 999,
  },
  // mutation that reverses the order of five div elements at 2000ms
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [
        { parentId: 17, id: 29 },
        { parentId: 17, id: 31 },
        { parentId: 17, id: 32 },
        { parentId: 17, id: 33 },
        { parentId: 17, id: 34 },
      ],
      adds: [
        {
          parentId: 17,
          nextId: 31,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 29,
          },
        },
        {
          parentId: 29,
          nextId: null,
          node: { type: 3, textContent: '5', id: 30 },
        },
        {
          parentId: 17,
          nextId: 32,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 31,
          },
        },
        {
          parentId: 31,
          nextId: null,
          node: { type: 3, textContent: '4', id: 38 },
        },
        {
          parentId: 17,
          nextId: 33,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 32,
          },
        },
        {
          parentId: 32,
          nextId: null,
          node: { type: 3, textContent: '3', id: 37 },
        },
        {
          parentId: 17,
          nextId: 34,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 33,
          },
        },
        {
          parentId: 33,
          nextId: null,
          node: { type: 3, textContent: '2', id: 36 },
        },
        {
          parentId: 17,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 34,
          },
        },
        {
          parentId: 34,
          nextId: null,
          node: { type: 3, textContent: '1', id: 35 },
        },
      ],
    },
    timestamp: now + 1500,
  },
  // mutation that removes five div elements at 3000ms
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [
        { parentId: 17, id: 29 },
        { parentId: 17, id: 31 },
        { parentId: 17, id: 32 },
        { parentId: 17, id: 33 },
        { parentId: 17, id: 34 },
      ],
      adds: [],
    },
    timestamp: now + 3000,
  },
];

export default events;
