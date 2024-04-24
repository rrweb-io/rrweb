import { EventType, IncrementalSource } from '@sentry-internal/rrweb-types';
import type { eventWithTime } from '@sentry-internal/rrweb-types';

const now = Date.now();

const events: eventWithTime[] = [
  { type: EventType.DomContentLoaded, data: {}, timestamp: now },
  {
    type: EventType.Meta,
    data: {
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now + 100,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 1,
            name: 'html',
            publicId: '',
            systemId: '',
            id: 2,
          },
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
                id: 4,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 6,
                  },
                  {
                    type: 2,
                    tagName: 'noscript',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'text in noscript',
                        id: 8,
                      },
                    ],
                    id: 7,
                  },
                ],
                id: 5,
              },
            ],
            id: 3,
          },
        ],
        id: 1,
      },
      initialOffset: {
        left: 0,
        top: 0,
      },
    },
    timestamp: now + 100,
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
          parentId: -1,
          nextId: null,
          node: {
            type: 3,
            textContent: 'SCRIPT_PLACEHOLDER',
            id: 21,
          },
        },
      ],
    },
    timestamp: now + 300,
  },
];

export default events;
