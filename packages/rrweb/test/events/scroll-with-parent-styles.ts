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
    type: EventType.FullSnapshot,
    data: {
      node: {
        id: 1,
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
            id: 3,
            type: 2,
            tagName: 'html',
            attributes: {
              lang: 'en',
            },
            childNodes: [
              {
                id: 4,
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  {
                    id: 5,
                    type: 2,
                    tagName: 'style',
                    attributes: {
                      type: 'text/css',
                    },
                    childNodes: [
                      {
                        id: 6,
                        type: 3,
                        textContent:
                          'main[data-v-7231068e] { position: fixed; top: 0px; right: 0px; height: calc(100% - 0px); overflow: auto; left: 0px; }.container[data-v-7231068e] { overflow: auto; overscroll-behavior-y: contain; position: relative; height: 100%; }.container .card[data-v-7231068e] { min-height: 170px; height: 100%; }',
                        isStyle: true,
                      },
                    ],
                  },
                ],
              },
              {
                id: 7,
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
                        tagName: 'ul',
                        attributes: {},
                        childNodes: [
                          {
                            type: 2,
                            tagName: 'li',
                            attributes: {},
                            childNodes: [
                              {
                                type: 2,
                                tagName: 'a',
                                attributes: {
                                  href: 'https://localhost/page1',
                                },
                                childNodes: [
                                  {
                                    type: 3,
                                    textContent: '\nGo to page 1\n',
                                    id: 12,
                                  },
                                ],
                                id: 11,
                              },
                            ],
                            id: 10,
                          },
                          {
                            type: 2,
                            tagName: 'li',
                            attributes: {},
                            childNodes: [
                              {
                                type: 2,
                                tagName: 'a',
                                attributes: {
                                  href: 'https://localhost/page2',
                                },
                                childNodes: [
                                  {
                                    type: 3,
                                    textContent: '\nGo to page 2\n',
                                    id: 15,
                                  },
                                ],
                                id: 14,
                              },
                            ],
                            id: 13,
                          },
                        ],
                        id: 9,
                      },
                    ],
                    id: 8,
                  },
                ],
              },
            ],
          },
        ],
      },
      initialOffset: {
        left: 0,
        top: 0,
      },
    },
    timestamp: now + 100,
  },
  // mutation that adds all of the new parent/child elements
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 8,
          nextId: null,
          node: {
            type: 2,
            tagName: 'main',
            attributes: {
              'data-v-7231068e': '',
            },
            childNodes: [],
            id: 16,
          },
        },
        {
          parentId: 16,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {
              'data-v-7231068e': '',
              class: 'container',
            },
            childNodes: [],
            id: 17,
          },
        },
        {
          parentId: 17,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {
              'data-v-7231068e': '',
              class: 'card',
            },
            childNodes: [],
            id: 18,
          },
        },
        {
          parentId: 18,
          nextId: null,
          node: {
            type: 2,
            tagName: 'button',
            attributes: {
              'data-v-7231068e': '',
            },
            childNodes: [],
            id: 19,
          },
        },
        {
          parentId: 19,
          nextId: null,
          node: {
            type: 3,
            textContent: '1',
            id: 20,
          },
        },
        {
          parentId: 17,
          nextId: 18,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {
              'data-v-7231068e': '',
              class: 'card',
            },
            childNodes: [],
            id: 21,
          },
        },
        {
          parentId: 21,
          nextId: null,
          node: {
            type: 2,
            tagName: 'button',
            attributes: {
              'data-v-7231068e': '',
            },
            childNodes: [],
            id: 22,
          },
        },
        {
          parentId: 22,
          nextId: null,
          node: {
            type: 3,
            textContent: '2',
            id: 23,
          },
        },
        {
          parentId: 17,
          nextId: 21,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {
              'data-v-7231068e': '',
              class: 'card',
            },
            childNodes: [],
            id: 24,
          },
        },
        {
          parentId: 24,
          nextId: null,
          node: {
            type: 2,
            tagName: 'button',
            attributes: {
              'data-v-7231068e': '',
            },
            childNodes: [],
            id: 25,
          },
        },
        {
          parentId: 25,
          nextId: null,
          node: {
            type: 3,
            textContent: '3',
            id: 26,
          },
        },
      ],
    },
    timestamp: now + 500,
  },
  // scroll event on the '.container' div
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Scroll,
      id: 17,
      x: 0,
      y: 800,
    },
    timestamp: now + 1000,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 16, id: 17 }],
      adds: [],
    },
    timestamp: now + 2000,
  },
];

export default events;
