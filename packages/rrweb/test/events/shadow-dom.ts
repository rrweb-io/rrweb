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
    timestamp: now + 200,
  },
  // add shadow dom elements
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 5,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 6,
            isShadowHost: true,
          },
        },
      ],
    },
    timestamp: now + 500,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 6,
          nextId: null,
          node: {
            type: 2,
            tagName: 'span',
            attributes: {},
            childNodes: [],
            id: 7,
            isShadow: true,
          },
        },
        {
          parentId: 7,
          nextId: null,
          node: { type: 3, textContent: 'shadow dom one', id: 8 },
        },
      ],
    },
    timestamp: now + 500,
  },
  // add nested shadow dom elements
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 6,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 9,
            isShadow: true,
            isShadowHost: true,
          },
        },
      ],
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 9,
          nextId: null,
          node: {
            type: 2,
            tagName: 'span',
            attributes: {},
            childNodes: [],
            id: 10,
            isShadow: true,
          },
        },
        {
          parentId: 10,
          nextId: null,
          node: { type: 3, textContent: 'shadow dom two', id: 11 },
        },
      ],
    },
    timestamp: now + 1000,
  },
];

export default events;
