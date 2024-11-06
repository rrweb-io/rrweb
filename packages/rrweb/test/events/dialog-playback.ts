import { eventWithTime, IncrementalSource } from '@saola.ai/rrweb-types';

const startTime = 1900000000;
export const closedFullSnapshotTime = 132;
export const showIncrementalAttributeTime = 1500;
export const closeIncrementalAttributeTime = 2000;
export const showModalIncrementalAttributeTime = 2500;
export const switchBetweenShowModalAndShowIncrementalAttributeTime = 2600;
export const switchBetweenShowAndShowModalIncrementalAttributeTime = 2700;
export const showFullSnapshotTime = 3000;
export const showModalFullSnapshotTime = 3500;
export const showModalIncrementalAddTime = 4000;

const events: eventWithTime[] = [
  { type: 0, data: {}, timestamp: startTime + 1 },
  { type: 1, data: {}, timestamp: startTime + closedFullSnapshotTime },
  {
    type: 4,
    data: {
      href: 'http://127.0.0.1:5500/test/html/dialog.html',
      width: 1600,
      height: 900,
    },
    timestamp: startTime + closedFullSnapshotTime,
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
    timestamp: startTime + closedFullSnapshotTime,
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
          attributes: { open: '', rr_open_mode: 'non-modal', class: 'show' },
        },
      ],
    },
    timestamp: startTime + showIncrementalAttributeTime,
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
          attributes: { open: null, class: 'closed' },
        },
      ],
    },
    timestamp: startTime + closeIncrementalAttributeTime,
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
          attributes: { rr_open_mode: 'modal', open: '', class: 'showModal' },
        },
      ],
    },
    timestamp: startTime + showModalIncrementalAttributeTime,
  },
  // switch between .showModal() and .show()
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
          attributes: {
            rr_open_mode: 'non-modal',
            class: 'switched-from-show-modal-to-show',
          },
        },
      ],
    },
    timestamp:
      startTime + switchBetweenShowModalAndShowIncrementalAttributeTime,
  },
  // switch between .show() and .showModal()
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
          attributes: {
            rr_open_mode: 'modal',
            class: 'switched-from-show-to-show-modal',
          },
        },
      ],
    },
    timestamp:
      startTime + switchBetweenShowAndShowModalIncrementalAttributeTime,
  },
  // open dialog with .show()
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
                      open: '',
                      rr_open_mode: 'non-modal',
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
    timestamp: startTime + showFullSnapshotTime,
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
                      rr_open_mode: 'modal',
                      open: '',
                      style: 'outline: blue solid 1px;',
                      class: 'existing-1',
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
                      class: 'existing-2',
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
    timestamp: startTime + showModalFullSnapshotTime,
  },
  // add open dialog with .showModal()
  {
    type: 3,
    data: {
      source: IncrementalSource.Mutation,
      adds: [
        {
          parentId: 22,
          previousId: 23,
          nextId: 24,
          node: {
            type: 2,
            tagName: 'dialog',
            attributes: {
              rr_open_mode: 'modal',
              open: '',
              style: 'outline: orange solid 1px;',
              class: 'new-dialog',
            },
            childNodes: [],
            id: 32,
          },
        },
        {
          parentId: 32,
          previousId: null,
          nextId: null,
          node: { type: 3, textContent: 'Dialog 3', id: 33 },
        },
      ],
      removes: [],
      texts: [],
      attributes: [],
    },
    timestamp: startTime + showModalIncrementalAddTime,
  },
];

export default events;
