import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const now = Date.now();

/**
 * Test events for StyleDeclaration on nested CSS rules.
 * This tests setProperty/removeProperty on rules inside @media blocks.
 */
const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now,
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
                    type: 2,
                    tagName: 'style',
                    attributes: {
                      _cssText:
                        '@media all { .test-nested { background-color: blue; width: 100px; } .test-second { color: red; } } @supports (display: block) { @media all { .test-deep { background-color: teal; } } }',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: '',
                        isStyle: true,
                        id: 6,
                      },
                    ],
                    id: 5,
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
                    type: 3,
                    textContent: '\n       ',
                    id: 8,
                  },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      class: 'test-nested',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'Nested rule test',
                        id: 10,
                      },
                    ],
                    id: 9,
                  },
                  {
                    type: 3,
                    textContent: '\n       ',
                    id: 11,
                  },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      class: 'test-second',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'Second nested rule',
                        id: 13,
                      },
                    ],
                    id: 12,
                  },
                  {
                    type: 3,
                    textContent: '\n       ',
                    id: 14,
                  },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: {
                      class: 'test-deep',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'Deep nested rule',
                        id: 16,
                      },
                    ],
                    id: 15,
                  },
                ],
                id: 7,
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
  // setProperty on rule inside @media at index [0, 0]
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      set: {
        property: 'background-color',
        value: 'red',
        priority: undefined,
      },
      index: [0, 0],
    },
    timestamp: now + 200,
  },
  // setProperty on second rule inside @media at index [0, 1]
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      set: {
        property: 'font-weight',
        value: 'bold',
        priority: undefined,
      },
      index: [0, 1],
    },
    timestamp: now + 300,
  },
  // removeProperty on rule inside @media at index [0, 0]
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      remove: {
        property: 'width',
      },
      index: [0, 0],
    },
    timestamp: now + 400,
  },
  // setProperty on deeply nested rule inside @supports > @media at index [1, 0, 0]
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      set: {
        property: 'background-color',
        value: 'purple',
        priority: undefined,
      },
      index: [1, 0, 0],
    },
    timestamp: now + 500,
  },
  // removeProperty on deeply nested rule
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      remove: {
        property: 'background-color',
      },
      index: [1, 0, 0],
    },
    timestamp: now + 600,
  },
];

export default events;
