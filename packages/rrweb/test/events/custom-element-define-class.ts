import { EventType } from '@saola.ai/rrweb-types';
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
                    id: 5,
                    type: 2,
                    tagName: 'style',
                    childNodes: [
                      {
                        id: 6,
                        type: 3,
                        isStyle: true,
                        // Set style of defined custom element to display: block
                        // Set undefined custom element to display: none
                        textContent:
                          'custom-element:not(:defined) { display: none;} \n custom-element:defined { display: block; }',
                      },
                    ],
                  },
                ],
              },
              {
                id: 7,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    id: 8,
                    type: 2,
                    tagName: 'custom-element',
                    childNodes: [],
                    isCustom: true,
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
];

export default events;
