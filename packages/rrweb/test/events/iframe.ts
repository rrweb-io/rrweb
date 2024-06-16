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
            tagName: 'iframe',
            attributes: { id: 'one' },
            childNodes: [],
            id: 6,
          },
        },
      ],
    },
    timestamp: now + 500,
  },
  // add iframe one
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
                            type: 3,
                            textContent: '\n\t\tiframe 1\n\t',
                            rootId: 7,
                            id: 13,
                          },
                        ],
                        rootId: 7,
                        id: 12,
                      },
                      { type: 3, textContent: '\n\t', rootId: 7, id: 14 },
                      {
                        type: 2,
                        tagName: 'script',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'SCRIPT_PLACEHOLDER',
                            rootId: 7,
                            id: 16,
                          },
                        ],
                        rootId: 7,
                        id: 15,
                      },
                      { type: 3, textContent: '\t\n', rootId: 7, id: 17 },
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
            tagName: 'iframe',
            attributes: { id: 'two' },
            childNodes: [],
            id: 38,
          },
        },
      ],
    },
    timestamp: now + 1000,
  },
  // add iframe two
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 38,
          nextId: null,
          node: {
            type: 0,
            childNodes: [
              {
                type: 1,
                name: 'html',
                publicId: '',
                systemId: '',
                rootId: 39,
                id: 40,
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
                    childNodes: [
                      { type: 3, textContent: '\n    ', rootId: 39, id: 43 },
                      {
                        type: 2,
                        tagName: 'meta',
                        attributes: { charset: 'UTF-8' },
                        childNodes: [],
                        rootId: 39,
                        id: 44,
                      },
                      { type: 3, textContent: '\n    ', rootId: 39, id: 45 },
                      {
                        type: 2,
                        tagName: 'meta',
                        attributes: {
                          name: 'viewport',
                          content: 'width=device-width, initial-scale=1.0',
                        },
                        childNodes: [],
                        rootId: 39,
                        id: 46,
                      },
                      { type: 3, textContent: '\n    ', rootId: 39, id: 47 },
                      {
                        type: 2,
                        tagName: 'title',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'iframe 2',
                            rootId: 39,
                            id: 49,
                          },
                        ],
                        rootId: 39,
                        id: 48,
                      },
                      { type: 3, textContent: '\n  ', rootId: 39, id: 50 },
                    ],
                    rootId: 39,
                    id: 42,
                  },
                  { type: 3, textContent: '\n  ', rootId: 39, id: 51 },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: '\n    iframe 2\n    ',
                        rootId: 39,
                        id: 53,
                      },
                      {
                        type: 2,
                        tagName: 'iframe',
                        attributes: { id: 'three', frameborder: '0' },
                        childNodes: [],
                        rootId: 39,
                        id: 54,
                      },
                      { type: 3, textContent: '\n    ', rootId: 39, id: 55 },
                      {
                        type: 2,
                        tagName: 'iframe',
                        attributes: { id: 'four', frameborder: '0' },
                        childNodes: [],
                        rootId: 39,
                        id: 56,
                      },
                      { type: 3, textContent: '\n  \n\n', rootId: 39, id: 57 },
                    ],
                    rootId: 39,
                    id: 52,
                  },
                ],
                rootId: 39,
                id: 41,
              },
            ],
            id: 39,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 1000,
  },
  // add iframe three
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 54,
          nextId: null,
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
                    rootId: 58,
                    id: 60,
                  },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [],
                    rootId: 58,
                    id: 61,
                  },
                ],
                rootId: 58,
                id: 59,
              },
            ],
            id: 58,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 1000,
  },
  // add iframe four
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 56,
          nextId: null,
          node: {
            type: 0,
            childNodes: [
              {
                type: 1,
                name: 'html',
                publicId: '',
                systemId: '',
                rootId: 62,
                id: 63,
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
                    childNodes: [
                      { type: 3, textContent: '\n    ', rootId: 62, id: 66 },
                      {
                        type: 2,
                        tagName: 'meta',
                        attributes: { charset: 'UTF-8' },
                        childNodes: [],
                        rootId: 62,
                        id: 67,
                      },
                      { type: 3, textContent: '\n    ', rootId: 62, id: 68 },
                      {
                        type: 2,
                        tagName: 'meta',
                        attributes: {
                          name: 'viewport',
                          content: 'width=device-width, initial-scale=1.0',
                        },
                        childNodes: [],
                        rootId: 62,
                        id: 69,
                      },
                      { type: 3, textContent: '\n    ', rootId: 62, id: 70 },
                      {
                        type: 2,
                        tagName: 'title',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'iframe 4',
                            rootId: 62,
                            id: 72,
                          },
                        ],
                        rootId: 62,
                        id: 71,
                      },
                      { type: 3, textContent: '\n  ', rootId: 62, id: 73 },
                    ],
                    rootId: 62,
                    id: 65,
                  },
                  { type: 3, textContent: '\n  ', rootId: 62, id: 74 },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: '\n    iframe 4\n  \n  ',
                        rootId: 62,
                        id: 76,
                      },
                      {
                        type: 2,
                        tagName: 'script',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'SCRIPT_PLACEHOLDER',
                            rootId: 62,
                            id: 78,
                          },
                        ],
                        rootId: 62,
                        id: 77,
                      },
                      { type: 3, textContent: '\n\n', rootId: 62, id: 79 },
                    ],
                    rootId: 62,
                    id: 75,
                  },
                ],
                rootId: 62,
                id: 64,
              },
            ],
            id: 62,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 1500,
  },
  // add iframe five
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 75,
          nextId: null,
          node: {
            type: 2,
            tagName: 'iframe',
            attributes: { id: 'five' },
            childNodes: [],
            rootId: 62,
            id: 80,
          },
        },
      ],
    },
    timestamp: now + 2000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 80,
          nextId: null,
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
                    rootId: 81,
                    id: 83,
                  },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'script',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'SCRIPT_PLACEHOLDER',
                            rootId: 81,
                            id: 86,
                          },
                        ],
                        rootId: 81,
                        id: 85,
                      },
                    ],
                    rootId: 81,
                    id: 84,
                  },
                ],
                rootId: 81,
                id: 82,
              },
            ],
            id: 81,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 2000,
  },
  // remove the html element of iframe four
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 62, id: 64 }],
      adds: [],
    },
    timestamp: now + 2500,
  },
];

export default events;
