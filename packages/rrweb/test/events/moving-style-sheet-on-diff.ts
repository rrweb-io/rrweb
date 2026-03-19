import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

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
    timestamp: now + 10,
  },
  {
    type: EventType.Meta,
    data: {
      href: 'http://localhost',
      width: 1000,
      height: 800,
    },
    timestamp: now + 10,
  },
  // full snapshot:
  {
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
            attributes: {
              lang: 'en',
            },
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    tagName: 'style',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent:
                          '#wrapper { width: 200px; margin: 50px auto; background-color: gainsboro; padding: 20px; }.target-element { padding: 12px; margin-top: 12px; }',
                        isStyle: true,
                        id: 6,
                      },
                    ],
                    id: 5,
                  },
                  {
                    type: 2,
                    tagName: 'style',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent:
                          '.new-element-class { font-size: 32px; color: tomato; }',
                        isStyle: true,
                        id: 8,
                      },
                    ],
                    id: 7,
                  },
                ],
                id: 4,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      id: 'wrapper',
                    },
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'div',
                        attributes: {
                          class: 'target-element',
                        },
                        childNodes: [
                          {
                            type: 2,
                            tagName: 'p',
                            attributes: {
                              class: 'target-element-child',
                            },
                            childNodes: [
                              {
                                type: 3,
                                textContent: 'Element to style',
                                id: 113,
                              },
                            ],
                            id: 12,
                          },
                        ],
                        id: 11,
                      },
                    ],
                    id: 10,
                  },
                ],
                id: 9,
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
    type: EventType.FullSnapshot,
    timestamp: now + 20,
  },
  // 1st mutation that applies StyleSheetRule
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      id: 5,
      adds: [
        {
          rule: '.target-element{background-color:teal;}',
        },
      ],
    },
    timestamp: now + 30,
  },
  // 2nd mutation inserts new style element to trigger other style element to get moved in diff
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 4, id: 7 }],
      adds: [
        {
          parentId: 4,
          nextId: 5,
          node: {
            type: 2,
            tagName: 'style',
            attributes: {},
            childNodes: [],
            id: 98,
          },
        },
        {
          parentId: 98,
          nextId: null,
          node: {
            type: 3,
            textContent:
              '.new-element-class { font-size: 32px; color: tomato; }',
            isStyle: true,
            id: 99,
          },
        },
      ],
    },
    timestamp: now + 2000,
  },
  // dummy event to have somewhere to skip
  {
    data: {
      adds: [],
      texts: [],
      source: IncrementalSource.Mutation,
      removes: [],
      attributes: [],
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 3000,
  },
];

export default events;
