import { EventType, IncrementalSource } from '@saola.ai/rrweb-types';
import type { eventWithTime } from '@saola.ai/rrweb-types';

const now = Date.now();
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
                    textContent: '\n       ',
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
                    textContent: '       \n       ',
                    id: 9,
                  },
                  {
                    type: 2,
                    tagName: 'iframe',
                    attributes: {},
                    childNodes: [],
                    id: 10,
                  },
                  {
                    type: 3,
                    textContent: '\n     ',
                    id: 11,
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
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 1,
      styleIds: [1],
      styles: [
        {
          styleId: 1,
          rules: [],
        },
      ],
    },
    timestamp: now + 150,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: 0,
      adds: [
        {
          parentId: 10,
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
                    rootId: 12,
                    id: 14,
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
                            rootId: 12,
                            id: 17,
                          },
                        ],
                        rootId: 12,
                        id: 16,
                      },
                    ],
                    rootId: 12,
                    id: 15,
                  },
                ],
                rootId: 12,
                id: 13,
              },
            ],
            compatMode: 'BackCompat',
            id: 12,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 200,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 12,
      styleIds: [2],
      styles: [
        {
          rules: [],
          styleId: 2,
        },
      ],
    },
    timestamp: now + 250,
  },
  // use CSSStyleSheet.replace api
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 1,
      replace: 'div { color: yellow; }',
    },
    timestamp: now + 300,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 2,
      replace: 'h1 { color: blue; }',
    },
    timestamp: now + 300,
  },
  // use CSSStyleSheet.replaceSync api
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 1,
      replaceSync: 'div { display: inline ; }',
    },
    timestamp: now + 400,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 2,
      replaceSync: 'h1 { font-size: large; }',
    },
    timestamp: now + 400,
  },
  // use StyleDeclaration.setProperty api
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      styleId: 1,
      set: {
        property: 'color',
        value: 'green',
        priority: undefined,
      },
      index: [0],
    },
    timestamp: now + 500,
  },
  // use StyleDeclaration.removeProperty api
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      styleId: 1,
      remove: {
        property: 'display',
      },
      index: [0],
    },
    timestamp: now + 500,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      styleId: 2,
      set: {
        property: 'font-size',
        value: 'medium',
        priority: 'important',
      },
      index: [0],
    },
    timestamp: now + 500,
  },
  // use CSSStyleSheet.insertRule api
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 2,
      adds: [
        {
          rule: 'h2 { color: red; }',
        },
      ],
    },
    timestamp: now + 500,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 1,
      adds: [
        {
          rule: 'body { border: 2px solid blue; }',
          index: 1,
        },
      ],
    },
    timestamp: now + 600,
  },
  // use CSSStyleSheet.deleteRule api
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 2,
      removes: [
        {
          index: 0,
        },
      ],
    },
    timestamp: now + 600,
  },
];

export default events;
