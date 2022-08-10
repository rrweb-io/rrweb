import { EventType, eventWithTime, IncrementalSource } from '../../src/types';

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
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now + 200,
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
                childNodes: [
                  {
                    type: 3,
                    textContent: '\\\\n    ',
                    id: 5,
                  },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      charset: 'UTF-8',
                    },
                    childNodes: [],
                    id: 6,
                  },
                  {
                    type: 3,
                    textContent: '\\\\n  ',
                    id: 7,
                  },
                ],
                id: 4,
              },
              {
                type: 3,
                textContent: '\\\\n  ',
                id: 8,
              },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    type: 3,
                    textContent: '\\\\n    Lorem, ipsum\\\\n    ',
                    id: 10,
                  },
                  {
                    type: 2,
                    tagName: 'span',
                    attributes: {
                      id: 'startNode',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent:
                          '\\\\n      Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolores culpa\\\\n      corporis voluptas odit nobis recusandae inventore, magni praesentium\\\\n      maiores perferendis quaerat excepturi officia minus velit voluptate\\\\n      placeat minima? Nesciunt, eum!\\\\n    ',
                        id: 12,
                      },
                    ],
                    id: 11,
                  },
                  {
                    type: 3,
                    textContent:
                      '\\\\n    dolor sit amet consectetur adipisicing elit. Ad repellendus quas hic\\\\n    deleniti, delectus consequatur voluptas aliquam dolore voluptates repellat\\\\n    perferendis aperiam saepe maxime officia rem corporis beatae, assumenda\\\\n    doloribus.\\\\n    ',
                    id: 13,
                  },
                  {
                    type: 2,
                    tagName: 'span',
                    attributes: {
                      id: 'endNode',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent:
                          '\\\\n      Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae\\\\n      explicabo omnis dolores magni, ea doloribus possimus debitis reiciendis\\\\n      distinctio perferendis nihil ipsum officiis pariatur laboriosam quas,\\\\n      corrupti vero vitae minus.\\\\n    ',
                        id: 15,
                      },
                    ],
                    id: 14,
                  },
                  {
                    type: 3,
                    textContent: '\\\\n  \\\\n    ',
                    id: 16,
                  },
                  {
                    type: 2,
                    tagName: 'script',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'SCRIPT_PLACEHOLDER',
                        id: 18,
                      },
                    ],
                    id: 17,
                  },
                  {
                    type: 3,
                    textContent: '\\\\n    \\\\n    \\\\n\\\\n',
                    id: 19,
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
    timestamp: now + 300,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Selection,
      ranges: [
        {
          start: 12,
          startOffset: 11,
          end: 15,
          endOffset: 6,
        },
      ],
    },
    timestamp: now + 400,
  },
];

export default events;
