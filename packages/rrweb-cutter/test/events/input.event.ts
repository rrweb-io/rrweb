import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

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
                childNodes: [],
              },
              {
                id: 5,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [
                  {
                    id: 6,
                    type: 2,
                    tagName: 'input',
                    attributes: {
                      type: 'text',
                      value: 'valueA',
                      id: 'input1',
                    },
                    childNodes: [],
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
  // mutation that adds select elements
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [],
      adds: [
        {
          parentId: 5,
          nextId: null,
          node: {
            type: 2,
            tagName: 'select',
            attributes: {
              id: 'select1',
            },
            childNodes: [],
            id: 26,
          },
        },
        {
          parentId: 26,
          nextId: null,
          node: {
            type: 2,
            tagName: 'option',
            attributes: { value: 'valueB' },
            childNodes: [],
            id: 27,
          },
        },
        {
          parentId: 27,
          nextId: null,
          node: { type: 3, textContent: 'B', id: 28 },
        },
        {
          parentId: 26,
          nextId: 27,
          node: {
            type: 2,
            tagName: 'option',
            attributes: { value: 'valueC', selected: true },
            childNodes: [],
            id: 29,
          },
        },
        {
          parentId: 26,
          nextId: 29,
          node: {
            type: 2,
            tagName: 'option',
            attributes: { value: 'valueD' },
            childNodes: [],
            id: 30,
          },
        },
        {
          parentId: 30,
          nextId: null,
          node: { type: 3, textContent: 'D', id: 31 },
        },
        {
          parentId: 29,
          nextId: null,
          node: { type: 3, textContent: 'C', id: 32 },
        },
        {
          parentId: 5,
          nextId: null,
          node: {
            type: 2,
            tagName: 'input',
            attributes: {
              id: 'input2',
            },
            childNodes: [],
            id: 33,
          },
        },
      ],
    },
    timestamp: now + 1000,
  },
  // change the value of the input element '#input1'
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Input,
      text: 'valueE',
      isChecked: false,
      id: 6,
    },
    timestamp: now + 1000,
  },
  // change the value of the input element '#input2'
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Input,
      text: 'valueF',
      isChecked: false,
      id: 33,
    },
    timestamp: now + 1500,
  },
  // Change the value of the select element '#select1'
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Input,
      text: 'valueG',
      isChecked: false,
      id: 26,
    },
    timestamp: now + 1500,
  },
  // A dummy event to increase the session duration
  {
    type: EventType.Custom,
    data: {
      tag: 'dummy',
      payload: {},
    },
    timestamp: now + 2000,
  },
];

export default events;
