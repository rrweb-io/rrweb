import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const events: eventWithTime[] = [
  {
    type: 4,
    data: {
      href: 'http://localhost',
      width: 417,
      height: 1318,
    },
    timestamp: 1734952276181,
  },
  {
    type: 2,
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
              lang: '',
            },
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 5,
                  },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      charset: 'utf-8',
                    },
                    childNodes: [],
                    id: 6,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 7,
                  },
                  {
                    type: 2,
                    tagName: 'link',
                    attributes: {
                      rel: 'stylesheet',
                      href: '',
                    },
                    childNodes: [],
                    id: 8,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 9,
                  },
                  {
                    type: 2,
                    tagName: 'script',
                    attributes: {
                      src: '',
                    },
                    childNodes: [],
                    id: 10,
                  },
                  {
                    type: 3,
                    textContent: '\n    ',
                    id: 11,
                  },
                ],
                id: 4,
              },
              {
                type: 3,
                textContent: '\n    ',
                id: 12,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 14,
                  },
                  {
                    type: 2,
                    tagName: 'select',
                    attributes: {
                      name: 'pets',
                      id: 'pet-select',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: '\n            ',
                        id: 16,
                      },
                      {
                        type: 2,
                        tagName: 'option',
                        attributes: {
                          value: '',
                          selected: true,
                        },
                        childNodes: [
                          {
                            type: 3,
                            textContent: '--Please choose an option--',
                            id: 18,
                          },
                        ],
                        id: 17,
                      },
                      {
                        type: 3,
                        textContent: '\n            ',
                        id: 19,
                      },
                      {
                        type: 2,
                        tagName: 'option',
                        attributes: {
                          value: 'dog',
                        },
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'Dog',
                            id: 21,
                          },
                        ],
                        id: 20,
                      },
                      {
                        type: 3,
                        textContent: '\n            ',
                        id: 22,
                      },
                      {
                        type: 2,
                        tagName: 'option',
                        attributes: {
                          value: 'cat',
                        },
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'Cat',
                            id: 24,
                          },
                        ],
                        id: 23,
                      },
                      {
                        type: 3,
                        textContent: '\n        ',
                        id: 25,
                      },
                    ],
                    id: 15,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 26,
                  },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: '\n            ',
                        id: 28,
                      },
                      {
                        type: 2,
                        tagName: 'input',
                        attributes: {
                          type: 'checkbox',
                          id: 'scales',
                          name: 'scales',
                          checked: true,
                        },
                        childNodes: [],
                        id: 29,
                      },
                      {
                        type: 3,
                        textContent: '\n            ',
                        id: 30,
                      },
                      {
                        type: 2,
                        tagName: 'label',
                        attributes: {
                          for: 'scales',
                        },
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'Scales',
                            id: 32,
                          },
                        ],
                        id: 31,
                      },
                      {
                        type: 3,
                        textContent: '\n        ',
                        id: 33,
                      },
                    ],
                    id: 27,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 34,
                  },
                  {
                    type: 2,
                    tagName: 'button',
                    attributes: {
                      onclick: 'onStartRecord()',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'StartRecord',
                        id: 36,
                      },
                    ],
                    id: 35,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 37,
                  },
                  {
                    type: 2,
                    tagName: 'button',
                    attributes: {
                      onclick: 'onStopRecord()',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'StopRecord',
                        id: 39,
                      },
                    ],
                    id: 38,
                  },
                  {
                    type: 3,
                    textContent: '\n        ',
                    id: 40,
                  },
                  {
                    type: 2,
                    tagName: 'script',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'SCRIPT_PLACEHOLDER',
                        id: 42,
                      },
                    ],
                    id: 41,
                  },
                  {
                    type: 3,
                    textContent: '\n    \n\n',
                    id: 43,
                  },
                ],
                id: 13,
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
    timestamp: 1734952276197,
  },
  {
    type: 3,
    data: {
      source: 5,
      text: 'dog',
      isChecked: false,
      id: 15,
    },
    timestamp: 1734952277674,
  },
  {
    type: 3,
    data: {
      source: 5,
      text: 'cat',
      isChecked: false,
      id: 15,
    },
    timestamp: 1734952279091,
  },
  {
    type: 3,
    data: {
      source: 5,
      text: 'on',
      isChecked: false,
      id: 29,
    },
    timestamp: 1734952280046,
  },
  {
    type: 3,
    data: {
      source: 5,
      text: 'on',
      isChecked: true,
      id: 29,
    },
    timestamp: 1734952280897,
  },
];
export default events;
