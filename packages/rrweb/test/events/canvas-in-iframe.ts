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
                  { type: 3, textContent: '    \n  ', id: 6 },
                ],
                id: 3,
              },
              { type: 3, textContent: '\n  ', id: 7 },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 9 },
                  {
                    type: 2,
                    tagName: 'iframe',
                    attributes: { id: 'target' },
                    childNodes: [],
                    id: 19,
                  },
                  { type: 3, textContent: '\n\n', id: 27 },
                ],
                id: 8,
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
  // add an iframe
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 19,
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
                    rootId: 30,
                    id: 32,
                  },
                  {
                    type: 2,
                    tagName: 'body',
                    attributes: {},
                    childNodes: [],
                    rootId: 30,
                    id: 33,
                  },
                ],
                rootId: 30,
                id: 31,
              },
            ],
            compatMode: 'BackCompat',
            id: 30,
          },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true,
    },
    timestamp: now + 500,
  },
  // add two canvas, one is blank ans the other is filled with data
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: 0,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 33,
          nextId: null,
          node: {
            type: 2,
            tagName: 'canvas',
            attributes: {
              width: '10',
              height: '10',
              id: 'blank_canvas',
            },
            childNodes: [],
            rootId: 30,
            id: 34,
          },
        },
        {
          parentId: 33,
          nextId: null,
          node: {
            type: 2,
            tagName: 'canvas',
            attributes: {
              width: '10',
              height: '10',
              rr_dataURL:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAB5JREFUKFNjZCASMBKpjmEQKvzPwIDqrEHoRozgBQC/ZQELU4DiXAAAAABJRU5ErkJggg==',
              id: 'canvas_with_data',
            },
            childNodes: [],
            rootId: 30,
            id: 35,
          },
        },
      ],
    },
    timestamp: now + 500,
  },
];

export default events;
