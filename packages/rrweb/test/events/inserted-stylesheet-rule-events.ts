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
  // full snapshot:
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
                    attributes: {
                      'data-meta': 'from full-snapshot, gets rule added at 500',
                    },
                    childNodes: [
                      {
                        id: 102,
                        type: 3,
                        isStyle: true,
                        textContent:
                          '\n.css-added-at-200-overwritten-at-3000 {\n  opacity: 1;\n  transform: translateX(0);\n}\n',
                      },
                    ],
                  },
                  {
                    id: 105,
                    type: 2,
                    tagName: 'style',
                    attributes: {
                      _cssText:
                        '.css-added-at-200 { position: fixed; top: 0px; right: 0px; left: 4rem; z-index: 15; flex-shrink: 0; height: 0.25rem; overflow: hidden; background-color: rgb(17, 171, 209); }.css-added-at-200.alt { height: 0.25rem; background-color: rgb(190, 232, 242); opacity: 0; transition: opacity 0.5s ease-in 0.1s; }.css-added-at-200.alt2 { padding-left: 4rem; }',
                      'data-emotion': 'css',
                    },
                    childNodes: [
                      { id: 106, type: 3, isStyle: true, textContent: '' },
                    ],
                  },
                ],
              },
              {
                id: 107,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    id: 108,
                    type: 2,
                    tagName: 'style',
                    attributes: {
                        'type': 'text/css',
                        'gs-style-id': 'gs-id-0',
                        '_cssText': '.original-style-rule { color: red; }'
                    },
                    childNodes: [
                      {
                        id: 109,
                        type: 3,
                        textContent: '',
                        isStyle: true
                      },
                    ],
                  },
                ],
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
  // mutation that uses insertRule to add a new style rule to the existing body stylesheet
  {
    data: {
      id: 108,
      adds: [
        {
          rule: '.css-inserted-at-500 {border: 1px solid blue;}',
          index: 1,
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 500,
  },
  // mutation that adds a child to the body
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 107,
          nextId: null,
          node: {
            type: 2,
            tagName: 'div',
            attributes: {},
            childNodes: [],
            id: 110,
          },
        }
      ],
    },
    timestamp: now + 900,
  }
];

export default events;
