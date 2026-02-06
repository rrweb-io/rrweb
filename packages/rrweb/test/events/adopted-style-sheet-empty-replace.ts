import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

/**
 * Test events for validating that empty string replace/replaceSync clears stylesheets.
 * This tests the fix for the bug where `if (data.replace)` would skip empty strings.
 */
const now = Date.now();
export const emptyReplaceSyncEvents: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 1,
            name: 'html',
            publicId: '',
            systemId: '',
            id: 2,
          },
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
                    tagName: 'div',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'test element',
                        id: 6,
                      },
                    ],
                    id: 5,
                  },
                ],
                id: 3,
              },
            ],
            id: 7,
          },
        ],
        id: 1,
      },
      initialOffset: {
        left: 0,
        top: 0,
      },
    },
    timestamp: now + 100,
  },
  // Adopt a stylesheet with initial styles
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 1,
      styles: [
        {
          styleId: 1,
          rules: [
            {
              rule: 'div { background: red; color: white; }',
              index: 0,
            },
          ],
        },
      ],
      styleIds: [1],
    },
    timestamp: now + 200,
  },
  // Clear stylesheet using replaceSync('') - this was the bug!
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 1,
      replaceSync: '',
    },
    timestamp: now + 300,
  },
];

export const emptyReplaceEvents: eventWithTime[] = [
  {
    type: EventType.Meta,
    data: {
      href: 'about:blank',
      width: 1920,
      height: 1080,
    },
    timestamp: now,
  },
  {
    type: EventType.FullSnapshot,
    data: {
      node: {
        type: 0,
        childNodes: [
          {
            type: 1,
            name: 'html',
            publicId: '',
            systemId: '',
            id: 2,
          },
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
                    tagName: 'div',
                    attributes: {},
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'test element',
                        id: 6,
                      },
                    ],
                    id: 5,
                  },
                ],
                id: 3,
              },
            ],
            id: 7,
          },
        ],
        id: 1,
      },
      initialOffset: {
        left: 0,
        top: 0,
      },
    },
    timestamp: now + 100,
  },
  // Adopt a stylesheet with initial styles
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      id: 1,
      styles: [
        {
          styleId: 1,
          rules: [
            {
              rule: 'div { background: blue; color: yellow; }',
              index: 0,
            },
          ],
        },
      ],
      styleIds: [1],
    },
    timestamp: now + 200,
  },
  // Clear stylesheet using replace('') - this was the bug!
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleSheetRule,
      styleId: 1,
      replace: '',
    },
    timestamp: now + 300,
  },
];
