import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const now = Date.now();

/**
 * Test events for StyleDeclaration events that reference non-existent rules.
 *
 * This tests that the replayer gracefully handles:
 * 1. StyleDeclaration events with invalid indices (rule doesn't exist)
 * 2. StyleDeclaration events referencing nested rules in empty grouping rules
 *
 * These scenarios can occur due to:
 * - Timing issues during recording/replay
 * - Event ordering where StyleDeclaration arrives before StyleSheetRule
 * - Dynamic stylesheets that aren't fully synchronized
 */
const events: eventWithTime[] = [
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
                childNodes: [
                  {
                    type: 2,
                    tagName: 'style',
                    attributes: {
                      // Only one rule at index 0, but we'll try to access index 5
                      _cssText: '.existing { color: blue; }',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: '',
                        isStyle: true,
                        id: 6,
                      },
                    ],
                    id: 5,
                  },
                ],
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
                    attributes: {
                      class: 'existing',
                    },
                    childNodes: [
                      {
                        type: 3,
                        textContent: 'Test content',
                        id: 8,
                      },
                    ],
                    id: 7,
                  },
                ],
                id: 9,
              },
            ],
            id: 3,
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
  // setProperty on a rule that doesn't exist (index 5, but only index 0 exists)
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      set: {
        property: 'background-color',
        value: 'red',
        priority: undefined,
      },
      index: [5], // This index doesn't exist!
    },
    timestamp: now + 200,
  },
  // removeProperty on a rule that doesn't exist
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      remove: {
        property: 'color',
      },
      index: [99], // This index doesn't exist!
    },
    timestamp: now + 300,
  },
  // setProperty on nested rule that doesn't exist [0, 5]
  // (rule 0 exists but it's not a grouping rule with nested rules)
  {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.StyleDeclaration,
      id: 5,
      set: {
        property: 'font-size',
        value: '20px',
        priority: undefined,
      },
      index: [0, 5], // Tries to access nested rule that doesn't exist
    },
    timestamp: now + 400,
  },
];

export default events;
