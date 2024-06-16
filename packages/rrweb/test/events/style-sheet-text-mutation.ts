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
      width: 1000,
      height: 800,
    },
    timestamp: now + 100,
  },
  // full snapshot
  {
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
                childNodes: [
                  {
                    id: 101,
                    type: 2,
                    tagName: 'style',
                    attributes: {},
                    childNodes: [
                      {
                        id: 102,
                        type: 3,
                        isStyle: true,
                        textContent: '\n.css-added-at-100 {color: yellow;}\n',
                      },
                    ],
                  },
                ],
              },
              {
                id: 107,
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
    type: EventType.FullSnapshot,
    timestamp: now + 100,
  },
  // mutation that adds an element
  {
    data: {
      adds: [
        {
          node: {
            id: 108,
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
          },
          nextId: null,
          parentId: 107,
        },
      ],
      texts: [],
      source: IncrementalSource.Mutation,
      removes: [],
      attributes: [],
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 500,
  },
  // adds a StyleSheetRule by inserting
  {
    data: {
      id: 101,
      adds: [
        {
          rule: '.css-added-at-1000-overwritten-at-1500 {color:red;}',
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 1000,
  },
  // adds a StyleSheetRule by adding a text
  {
    data: {
      adds: [
        {
          node: {
            type: 3,
            textContent: '.css-added-at-1500-deleted-at-2500 {color: yellow;}',
            id: 109,
          },
          nextId: null,
          parentId: 101,
        },
      ],
      texts: [],
      source: IncrementalSource.Mutation,
      removes: [],
      attributes: [],
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 1500,
  },
  // adds a StyleSheetRule by inserting
  {
    data: {
      id: 101,
      adds: [
        {
          rule: '.css-added-at-2000-overwritten-at-2500 {color: blue;}',
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 2000,
  },
  // deletes a StyleSheetRule by removing the text
  {
    data: {
      texts: [],
      attributes: [],
      removes: [{ parentId: 101, id: 109 }],
      adds: [],
      source: IncrementalSource.Mutation,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 2500,
  },
  // adds a StyleSheetRule by inserting
  {
    data: {
      id: 101,
      adds: [
        {
          rule: '.css-added-at-3000 {color: red;}',
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 3000,
  },
];

export default events;
