import { EventType, IncrementalSource, type eventWithTime } from '@rrweb/types';

const events: eventWithTime[] = [
  {
    type: 4,
    data: {
      href: '',
      width: 1600,
      height: 900,
    },
    timestamp: 1636379531385,
  },
  {
    type: 2,
    data: {
      node: {
        type: 0,
        childNodes: [
          { type: 1, name: 'html', publicId: '', systemId: '', id: 2 },
          {
            type: 2,
            tagName: 'html',
            attributes: { lang: 'en' },
            childNodes: [
              {
                type: 2,
                tagName: 'head',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 5 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: { charset: 'UTF-8' },
                    childNodes: [],
                    id: 6,
                  },
                  { type: 3, textContent: '\n    ', id: 7 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      name: 'viewport',
                      content: 'width=device-width, initial-scale=1.0',
                    },
                    childNodes: [],
                    id: 8,
                  },
                  { type: 3, textContent: '\n    ', id: 9 },
                  {
                    type: 2,
                    tagName: 'title',
                    attributes: {},
                    childNodes: [{ type: 3, textContent: 'assets', id: 11 }],
                    id: 10,
                  },
                  { type: 3, textContent: '\n  ', id: 12 },
                ],
                id: 4,
              },
              { type: 3, textContent: '\n  ', id: 13 },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 15 },
                  {
                    type: 2,
                    tagName: 'img',
                    attributes: {
                      width: '100',
                      height: '100',
                      style: 'border: 1px solid #000000',
                    },
                    childNodes: [{ type: 3, textContent: '\n    ', id: 17 }],
                    id: 16,
                  },
                  { type: 3, textContent: '\n    ', id: 18 },
                  {
                    type: 2,
                    tagName: 'script',
                    attributes: {},
                    childNodes: [
                      { type: 3, textContent: 'SCRIPT_PLACEHOLDER', id: 20 },
                    ],
                    id: 19,
                  },
                  { type: 3, textContent: '\n  \n\n', id: 21 },
                ],
                id: 14,
              },
            ],
            id: 3,
          },
        ],
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: 1636379531389,
  },
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [
        {
          id: 16,
          attributes: {
            src: 'httpx://example.com/image.png',
          },
        },
      ],
      removes: [],
      adds: [],
    },
    timestamp: 1636379531390,
  },
  {
    type: EventType.Asset,
    data: {
      url: 'httpx://example.com/image.png',
      payload: {
        rr_type: 'Blob',
        type: 'image/png',
        data: [
          {
            rr_type: 'ArrayBuffer',
            base64:
              'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAWtJREFUeF7t1cEJAEAIxEDtv2gProo8xgpCwuLezI3LGFhBMi0+iCCtHoLEeggiSM1AjMcPESRmIIZjIYLEDMRwLESQmIEYjoUIEjMQw7EQQWIGYjgWIkjMQAzHQgSJGYjhWIggMQMxHAsRJGYghmMhgsQMxHAsRJCYgRiOhQgSMxDDsRBBYgZiOBYiSMxADMdCBIkZiOFYiCAxAzEcCxEkZiCGYyGCxAzEcCxEkJiBGI6FCBIzEMOxEEFiBmI4FiJIzEAMx0IEiRmI4ViIIDEDMRwLESRmIIZjIYLEDMRwLESQmIEYjoUIEjMQw7EQQWIGYjgWIkjMQAzHQgSJGYjhWIggMQMxHAsRJGYghmMhgsQMxHAsRJCYgRiOhQgSMxDDsRBBYgZiOBYiSMxADMdCBIkZiOFYiCAxAzEcCxEkZiCGYyGCxAzEcCxEkJiBGI6FCBIzEMOxEEFiBmI4FiJIzEAMx0IEiRmI4TwVjsedWCiXGAAAAABJRU5ErkJggg==', // base64
          },
        ],
      },
    },
    timestamp: 1636379532355,
  },
];

export default events;
