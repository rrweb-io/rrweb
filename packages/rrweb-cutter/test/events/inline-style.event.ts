import { EventType, eventWithTime, IncrementalSource } from '@rrweb/types';

const now = Date.now();

export const eventsFn = (): eventWithTime[] => [
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
    data: { href: 'http://localhost', width: 1512, height: 395 },
    timestamp: now + 100,
  },
  // a full snapshot contains a link element and a style element contains inline css styles
  {
    type: EventType.FullSnapshot,
    data: {
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
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 4 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: { charset: 'utf-8' },
                    childNodes: [],
                    id: 5,
                  },
                  { type: 3, textContent: '\n    ', id: 6 },
                  // Inlined _cssText is downloaded from a remote css file.
                  {
                    type: 2,
                    tagName: 'link',
                    attributes: {
                      _cssText:
                        '#root { background: yellow; width: 10px; height: 10px; }',
                    },
                    childNodes: [],
                    id: 7,
                  },
                  { type: 3, textContent: '\n    ', id: 8 },
                  // These styles are inserted into style element through javascript.
                  {
                    type: 2,
                    tagName: 'style',
                    attributes: {
                      _cssText:
                        '.block { width: 20px; height: 20px; background: red; }',
                    },
                    childNodes: [],
                    id: 9,
                  },
                  { type: 3, textContent: '\n  ', id: 10 },
                ],
                id: 3,
              },
              { type: 3, textContent: '\n  ', id: 11 },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 13 },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: { id: 'root' },
                    childNodes: [
                      { type: 3, textContent: '      \n    ', id: 15 },
                    ],
                    id: 14,
                  },
                  { type: 3, textContent: '\n    ', id: 16 },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: { class: 'block' },
                    childNodes: [],
                    id: 17,
                  },
                  { type: 3, textContent: '\n\n', id: 18 },
                ],
                id: 12,
              },
            ],
            id: 2,
          },
        ],
        compatMode: 'BackCompat',
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: now + 200,
  },
  // mutation that adds a div element before 1000ms
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 12, id: 18 }],
      adds: [],
    },
    timestamp: now + 999,
  },
  // a placeholder event to extend the duration of the whole session
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: 2,
      id: 15,
      x: 190,
      y: 19,
    },
    timestamp: now + 1500,
  },
];
