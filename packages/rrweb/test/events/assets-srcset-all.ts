import { EventType, type eventWithTime } from '@rrweb/types';

const A = 'https://example.com/a.png';
const B = 'https://example.com/b.png';
const BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAWtJREFUeF7t1cEJAEAIxEDtv2gProo8xgpCwuLezI3LGFhBMi0+iCCtHoLEeggiSM1AjMcPESRmIIZjIYLEDMRwLESQmIEYjoUIEjMQw7EQQWIGYjgWIkjMQAzHQgSJGYjhWIggMQMxHAsRJGYghmMhgsQMxHAsRJCYgRiOhQgSMxDDsRBBYgZiOBYiSMxADMdCBIkZiOFYiCAxAzEcCxEkZiCGYyGCxAzEcCxEkJiBGI6FCBIzEMOxEEFiBmI4FiJIzEAMx0IEiRmI4ViIIDEDMRwLESRmIIZjIYLEDMRwLESQmIEYjoUIEjMQw7EQQWIGYjgWIkjMQAzHQgSJGYjhWIggMQMxHAsRJGYghmMhgsQMxHAsRJCYgRiOhQgSMxDDsRBBYgZiOBYiSMxADMdCBIkZiOFYiCAxAzEcCxEkZiCGYyGCxAzEcCxEkJiBGI6FCBIzEMOxEEFiBmI4FiJIzEAMx0IEiRmI4TwVjsedWCiXGAAAAABJRU5ErkJggg==';

const asset = (url: string): eventWithTime => ({
  type: EventType.Asset,
  data: {
    url,
    payload: {
      rr_type: 'Blob',
      type: 'image/png',
      data: [{ rr_type: 'ArrayBuffer', base64: BASE64 }],
    },
  },
  timestamp: 100,
});

const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: { href: '', width: 800, height: 600 },
    timestamp: 100,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          { type: 1, name: 'html', publicId: '', systemId: '', id: 2 },
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
                    type: 2,
                    tagName: 'img',
                    attributes: {
                      rr_captured_src: A,
                      'rrweb-original-srcset': `${A}, ${B} 2x`,
                    },
                    childNodes: [],
                    id: 6,
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
      initialOffset: { top: 0, left: 0 },
    },
    timestamp: 100,
  },
  asset(A),
  asset(B),
];

export default events;
