import { EventType, type eventWithTime } from '@rrweb/types';

const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: '',
      width: 800,
      height: 600,
    },
    timestamp: 1636379531385,
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
                      'rrweb-original-src': 'https://example.com/fallback.jpg',
                      'rrweb-original-srcset':
                        'https://example.com/a.jpg, https://example.com/b.jpg 2x',
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
    timestamp: 1636379531386,
  },
];

export default events;
