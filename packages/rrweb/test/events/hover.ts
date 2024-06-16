import { IncrementalSource, MouseInteractions } from '@saola.ai/rrweb-types';
import type { eventWithTime } from '../../../types/src';

const events: eventWithTime[] = [
  {
    type: 4,
    data: {
      href: '',
      width: 1600,
      height: 900,
    },
    timestamp: 0,
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
                  {
                    id: 101,
                    type: 2,
                    tagName: 'style',
                    attributes: {},
                    childNodes: [
                      {
                        id: 102,
                        type: 3,
                        isStyle: true,
                        textContent: 'div:hover { background-color: gold; }',
                      },
                    ],
                  },
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
                    tagName: 'div',
                    attributes: {
                      style:
                        'border: 1px solid #000000; width: 100px; height: 100px;',
                    },
                    childNodes: [{ type: 3, textContent: '\n    ', id: 17 }],
                    id: 16,
                  },
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
    timestamp: 10,
  },
  {
    type: 3,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.MouseDown,
      id: 16,
      x: 30,
      y: 30,
    },
    timestamp: 100,
  },
  {
    type: 3,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.MouseUp,
      id: 16,
      x: 30,
      y: 30,
    },
    timestamp: 150,
  },
  {
    type: 3,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 16,
      x: 30,
      y: 30,
    },
    timestamp: 155,
  },
];

export default events;
