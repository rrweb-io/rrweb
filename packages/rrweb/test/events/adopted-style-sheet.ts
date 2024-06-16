import { EventType, IncrementalSource } from '@saola.ai/rrweb-types';
import type { eventWithTime } from '@saola.ai/rrweb-types';

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
                    tagName: 'div',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'div in outermost document',
                        id: 8,
                      },
                    ],
                    id: 7,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 9,
                  },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      id: 'shadow-host1',
                    },
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'div',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'div in shadow dom 1',
                            id: 12,
                          },
                        ],
                        id: 11,
                        isShadow: true,
                      },
                      {
                        type: 2,
                        tagName: 'span',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'span in shadow dom 1',
                            id: 14,
                          },
                        ],
                        id: 13,
                        isShadow: true,
                      },
                    ],
                    id: 10,
                    isShadowHost: true,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 15,
                  },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      id: 'shadow-host2',
                    },
                    childNodes: [],
                    id: 16,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 17,
                  },
                  {
                    type: 2,
                    tagName: 'iframe',
                    attributes: {},
                    childNodes: [],
                    id: 18,
                  },
                  {
                    type: 3,
                    textContent: '\n      ',
                    id: 19,
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
  // Adopt the stylesheet #1 on document at 200ms
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 1,
      styleIds: [1],
      styles: [
        {
          rules: [
            {
              rule: 'div { color: yellow; }',
            },
          ],
          styleId: 1,
        },
      ],
    },
    timestamp: now + 200,
  },
  // Add an IFrame element
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 18,
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
                    rootId: 20,
                    id: 22,
                  },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'h1',
                        attributes: {},
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'h1 in iframe',
                            rootId: 20,
                            id: 25,
                          },
                        ],
                        rootId: 20,
                        id: 24,
                      },
                    ],
                    rootId: 20,
                    id: 23,
                  },
                ],
                rootId: 20,
                id: 21,
              },
            ],
            compatMode: 'BackCompat',
            id: 20,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 250,
  },
  // Adopt the stylesheet #2 on a shadow root at 300ms
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 10,
      styleIds: [1, 2],
      styles: [
        {
          rules: [
            {
              rule: 'span { color: red; }',
            },
          ],
          styleId: 2,
        },
      ],
    },
    timestamp: now + 300,
  },
  // Adopt the stylesheet #3 on document of the IFrame element
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 20,
      styleIds: [3],
      styles: [
        {
          rules: [
            {
              rule: 'h1 { color: blue; }',
            },
          ],
          styleId: 3,
        },
      ],
    },
    timestamp: now + 300,
  },
  // create a new shadow dom
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: 0,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 16,
          nextId: null,
          node: {
            type: 2,
            tagName: 'span',
            attributes: {},
            childNodes: [],
            id: 26,
            isShadow: true,
          },
        },
        {
          parentId: 26,
          nextId: null,
          node: {
            type: 3,
            textContent: 'span in shadow dom 2',
            id: 27,
          },
        },
        {
          parentId: 16,
          nextId: 26,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 28,
            isShadow: true,
          },
        },
        {
          parentId: 28,
          nextId: null,
          node: {
            type: 3,
            textContent: 'div in shadow dom 2',
            id: 29,
          },
        },
      ],
    },
    timestamp: now + 500,
  },
  // Adopt the stylesheet #4 on the shadow dom
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 16,
      styleIds: [4],
      styles: [
        {
          rules: [{ rule: 'span { color: green; }' }],
          styleId: 4,
        },
      ],
    },
    timestamp: now + 550,
  },
];

export default events;
