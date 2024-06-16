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
                        '.css-added-at-200 { position: fixed; top: 0px; right: 0px; left: 4rem; z-index: 15; flex-shrink: 0; height: 0.25rem; overflow: hidden; background-color: rgb(17, 171, 209); }.css-added-at-200.alt { height: 0.25rem; background-color: rgb(190, 232, 242); opacity: 0; transition: opacity 0.5s ease 0s; }.css-added-at-200.alt2 { padding-left: 4rem; }',
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
                    tagName: 'a',
                    attributes: {
                      class: 'css-added-at-1000-deleted-at-2500',
                    },
                    childNodes: [
                      {
                        id: 109,
                        type: 3,
                        textContent: 'string',
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
  // mutation that adds stylesheet
  {
    data: {
      adds: [
        {
          node: {
            id: 255,
            type: 2,
            tagName: 'style',
            attributes: { 'data-jss': '', 'data-meta': 'Col, Themed, Dynamic' },
            childNodes: [],
          },
          nextId: 101,
          parentId: 4,
        },
        {
          node: {
            id: 256,
            type: 3,
            isStyle: true,
            textContent:
              '\n.css-added-at-400 {\n  padding: 1.3125rem;\n  flex: none;\n  width: 100%;\n}\n',
          },
          nextId: null,
          parentId: 255,
        },
      ],
      texts: [],
      source: IncrementalSource.Mutation,
      removes: [],
      attributes: [],
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 400,
  },
  // mutation that adds style rule to existing stylesheet
  {
    data: {
      id: 101,
      adds: [
        {
          rule: '.css-added-at-500-overwritten-at-3000 {border: 1px solid blue;}',
          index: 1,
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 500,
  },
  // adds StyleSheetRule
  {
    data: {
      id: 105,
      adds: [
        {
          rule: '.css-added-at-1000-deleted-at-2500{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-flex-direction:column;-ms-flex-direction:column;flex-direction:column;min-width:60rem;min-height:100vh;color:blue;}',
          index: 2,
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 1000,
  },
  {
    data: {
      id: 105,
      removes: [
        {
          index: 2,
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 2500,
  },
  // overwrite all contents of stylesheet
  {
    data: {
      texts: [
        {
          id: 102,
          value: '.all-css-overwritten-at-3000 { color: indigo; }',
        },
      ],
      attributes: [],
      removes: [],
      adds: [],
      source: IncrementalSource.Mutation,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 3000,
  },
  {
    data: {
      id: 101,
      adds: [
        {
          rule: '.css-added-at-3100{color:blue;}',
          index: 1,
        },
      ],
      source: IncrementalSource.StyleSheetRule,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 3100,
  },
];

export default events;
