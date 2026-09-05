import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '../../../types/src';

/**
 * Fixture: element with duplicate class tokens and a CSS attribute selector.
 *
 * The element has class="ui middle aligned center aligned grid" which
 * contains the token "aligned" twice. A CSS rule uses
 * [class*="center aligned"] to target it. When the replayer adds `:hover`
 * via classList.add(), the browser's DOMTokenList normalizes the class
 * attribute by deduplicating tokens, turning it into
 * "ui middle aligned center grid :hover", which breaks the selector.
 */
const events: eventWithTime[] = [
  // Meta event
  {
    type: EventType.Meta,
    data: {
      href: '',
      width: 1600,
      height: 900,
    },
    timestamp: 0,
  },
  // FullSnapshot
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0, // Document
        childNodes: [
          { type: 1, name: 'html', publicId: '', systemId: '', id: 2 },
          {
            type: 2, // Element
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
                        textContent:
                          '.ui[class*="center aligned"].grid { justify-content: center; text-align: center; }',
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
                      // This class attribute intentionally contains "aligned"
                      // twice, which is how Semantic UI's grid works.
                      class: 'ui middle aligned center aligned grid',
                      style:
                        'width: 400px; height: 100px; border: 1px solid #000;',
                    },
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'div',
                        attributes: {
                          class: 'column',
                          style: 'width: 200px;',
                        },
                        childNodes: [
                          { type: 3, textContent: 'Centered content', id: 19 },
                        ],
                        id: 18,
                      },
                    ],
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
  // Mouse move to the grid element to trigger hover
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        {
          x: 50,
          y: 50,
          id: 16,
          timeOffset: 0,
        },
      ],
    },
    timestamp: 500,
  },
  // Mouse move away (to body) to remove hover
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseMove,
      positions: [
        {
          x: 0,
          y: 0,
          id: 14,
          timeOffset: 0,
        },
      ],
    },
    timestamp: 1000,
  },
];

export default events;
