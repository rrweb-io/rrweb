import { eventWithTime, IncrementalSource } from '@rrweb/types';

const events: eventWithTime[] = [
  { type: 0, data: {}, timestamp: 1900000001 },
  { type: 1, data: {}, timestamp: 1900000132 },
  {
    type: 4,
    data: {
      href: 'http://127.0.0.1:5500/test/html/dialog.html',
      width: 1600,
      height: 900,
    },
    timestamp: 1900000132,
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
                      'http-equiv': 'X-UA-Compatible',
                      content: 'IE=edge',
                    },
                    childNodes: [],
                    id: 8,
                  },
                  { type: 3, textContent: '\n    ', id: 9 },
                  {
                    type: 2,
                    tagName: 'meta',
                    attributes: {
                      name: 'viewport',
                      content: 'width=device-width, initial-scale=1.0',
                    },
                    childNodes: [],
                    id: 10,
                  },
                  { type: 3, textContent: '\n    ', id: 11 },
                  {
                    type: 2,
                    tagName: 'title',
                    attributes: {},
                    childNodes: [{ type: 3, textContent: '<Dialog>', id: 13 }],
                    id: 12,
                  },
                ],
                id: 4,
              },
              { type: 3, textContent: '\n  ', id: 21 },
              {
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  { type: 3, textContent: '\n    ', id: 23 },
                  {
                    type: 2,
                    tagName: 'dialog',
                    attributes: {
                      rr_open: 'modal',
                      style: 'outline: blue solid 1px;',
                    },
                    childNodes: [{ type: 3, textContent: 'Dialog 1', id: 25 }],
                    id: 24,
                  },
                  { type: 3, textContent: '\n    ', id: 26 },
                  {
                    type: 2,
                    tagName: 'dialog',
                    attributes: {
                      style: 'outline: red solid 1px;',
                    },
                    childNodes: [{ type: 3, textContent: 'Dialog 2', id: 28 }],
                    id: 27,
                  },
                  { type: 3, textContent: '\n  ', id: 31 },
                ],
                id: 22,
              },
            ],
            id: 3,
          },
        ],
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: 1900000136,
  },
  // open dialog with .show()
  {
    type: 3,
    data: {
      source: IncrementalSource.Mutation,
      adds: [],
      removes: [],
      texts: [],
      attributes: [
        {
          id: 27,
          attributes: { open: '' },
        },
      ],
    },
    timestamp: 1900001500,
  },
  // close dialog with .close()
  {
    type: 3,
    data: {
      source: IncrementalSource.Mutation,
      adds: [],
      removes: [],
      texts: [],
      attributes: [
        {
          id: 27,
          attributes: { open: null },
        },
      ],
    },
    timestamp: 1900002000,
  },
  // open dialog with .showModal()
  {
    type: 3,
    data: {
      source: IncrementalSource.Mutation,
      adds: [],
      removes: [],
      texts: [],
      attributes: [
        {
          id: 27,
          attributes: { rr_open: 'modal' },
        },
      ],
    },
    timestamp: 1900002500,
  },
];

export default events;
