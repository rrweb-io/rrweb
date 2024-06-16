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
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      charset: 'UTF-8',
                    },
                    childNodes: [],
                    id: 6,
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
                    tagName: 'span',
                    attributes: {
                      id: 'startNode',
                    },
                    childNodes: [],
                    id: 11,
                  },
                  {
                    type: 3,
                    textContent:
                      'some text between the start node and the end node',
                    id: 13,
                  },
                  {
                    type: 2,
                    tagName: 'span',
                    attributes: {
                      id: 'endNode',
                    },
                    childNodes: [],
                    id: 14,
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
    timestamp: now + 250,
  },
  // add selection targets through incremental mutation
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 11,
          nextId: null,
          node: {
            type: 3,
            textContent: 'This the text of the start node.',
            id: 12,
          },
        },
        {
          parentId: 14,
          nextId: null,
          node: {
            type: 3,
            textContent: 'This the text of the end node.',
            id: 15,
          },
        },
      ],
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
          startOffset: 5,
          end: 15,
          endOffset: 15,
        },
      ],
    },
    timestamp: now + 350,
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
