import { EventType, type eventWithTime } from '@rrweb/types';

const events: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: '',
      width: 90,
      height: 90,
    },
    timestamp: 123,
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
            attributes: { lang: 'en' },
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
                    tagName: 'style',
                    attributes: {
                      rr_css_text: 'https://example.com/#rr_style_el:1',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: '',
                        id: 6,
                      },
                    ],
                    id: 5,
                    type: 2,
                  },
                  {
                    tagName: 'div',
                    attributes: {
                      class: 'back-btn__wrapper',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: '\n  ',
                        id: 9,
                      },
                      {
                        tagName: 'a',
                        attributes: {
                          class: 'back-btn',
                          href: 'https://example.com/#back',
                        },
                        childNodes: [
                          {
                            type: 3,
                            textContent: 'Back',
                            id: 11,
                          },
                        ],
                        id: 10,
                        type: 2,
                      },
                    ],
                    id: 8,
                    type: 2,
                  },
                ],
                id: 7,
              },
            ],
            id: 3,
          },
        ],
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
      capturedAssetStatuses: [
        {
          url: 'https://example.com/#rr_style_el:1',
          status: 'captured',
        },
      ],
    },
    timestamp: 125,
  },
  {
    type: EventType.Asset,
    data: {
      url: 'https://example.com/#rr_style_el:1',
      payload: {
        rr_type: 'CssText',
        cssTexts: [
          '.back-btn { background: rgb(0, 255, 0); padding: 10px 7px 4px 6px; }}',
        ],
      },
    },
    timestamp: 127,
  },
];

export default events;
