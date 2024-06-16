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
                childNodes: [
                  {
                    id: 6,
                    type: 2,
                    tagName: 'iframe',
                    attributes: {},
                    childNodes: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      initialOffset: { top: 0, left: 0 },
    },
    timestamp: now + 200,
  },
  // add iframe
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 6,
          nextId: null,
          node: {
            type: 0,
            childNodes: [
              {
                type: 1,
                name: 'html',
                publicId: '',
                systemId: '',
                rootId: 7,
                id: 8,
              },
              {
                type: 2,
                tagName: 'html',
                attributes: { lang: 'en' },
                childNodes: [
                  {
                    type: 2,
                    tagName: 'head',
                    attributes: {},
                    childNodes: [],
                    rootId: 7,
                    id: 10,
                  },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'div',
                        attributes: {},
                        childNodes: [
                          {
                            type: 2,
                            tagName: 'div',
                            attributes: {},
                            childNodes: [],
                            rootId: 7,
                            id: 13,
                            isShadow: true,
                          },
                        ],
                        isShadowHost: true,
                        rootId: 7,
                        id: 12,
                      },
                      {
                        type: 2,
                        tagName: 'span',
                        attributes: {},
                        childNodes: [],
                        rootId: 7,
                        id: 14,
                      },
                      { type: 3, textContent: '\t\n', rootId: 7, id: 15 },
                    ],
                    rootId: 7,
                    id: 11,
                  },
                ],
                rootId: 7,
                id: 9,
              },
            ],
            id: 7,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 500,
  },
  // hover element in iframe
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        {
          x: 0,
          y: 0,
          id: 14,
          timeOffset: 0,
        },
      ],
    },
    timestamp: now + 500,
  },
  // hover element in shadow dom
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        {
          x: 0,
          y: 0,
          id: 13,
          timeOffset: 0,
        },
      ],
    },
    timestamp: now + 1000,
  },
  // hover element in iframe again
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        {
          x: 0,
          y: 0,
          id: 14,
          timeOffset: 0,
        },
      ],
    },
    timestamp: now + 1500,
  },
];

export default events;
