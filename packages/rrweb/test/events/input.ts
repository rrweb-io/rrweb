import { EventType, IncrementalSource } from '@saola.ai/rrweb-types';
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
                childNodes: [],
              },
              {
                id: 5,
                type: 2,
                tagName: 'body',
                attributes: {},
                childNodes: [],
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
            attributes: {},
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
            attributes: { value: 'valueC' },
            childNodes: [],
            id: 27,
          },
        },
        {
          parentId: 27,
          nextId: null,
          node: { type: 3, textContent: 'C', id: 28 },
        },
        {
          parentId: 26,
          nextId: 27,
          node: {
            type: 2,
            tagName: 'option',
            attributes: { value: 'valueB', selected: true },
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
            attributes: { value: 'valueA' },
            childNodes: [],
            id: 30,
          },
        },
        {
          parentId: 30,
          nextId: null,
          node: { type: 3, textContent: 'A', id: 31 },
        },
        {
          parentId: 29,
          nextId: null,
          node: { type: 3, textContent: 'B', id: 32 },
        },
      ],
    },
    timestamp: now + 1000,
  },
  // input event
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Input,
      text: 'valueA',
      isChecked: false,
      id: 26,
    },
    timestamp: now + 1500,
  },
  // input event
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Input,
      text: 'valueC',
      isChecked: false,
      id: 26,
    },
    timestamp: now + 2000,
  },
  // mutation that adds an input element
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
            tagName: 'input',
            attributes: {},
            childNodes: [],
            id: 33,
          },
        },
      ],
    },
    timestamp: now + 2500,
  },
  // an input event
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Input,
      text: 'test input',
      isChecked: false,
      id: 33,
    },
    timestamp: now + 3000,
  },
  // remove the select element
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 5, id: 26 }],
      adds: [],
    },
    timestamp: now + 3500,
  },
  // remove the input element
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Mutation,
      texts: [],
      attributes: [],
      removes: [{ parentId: 5, id: 33 }],
      adds: [],
    },
    timestamp: now + 4000,
  },
];

export default events;
