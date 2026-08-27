import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

const now = Date.now();

/**
 * A `<style>` element whose text node is later replaced by a text mutation,
 * with a `:hover` rule in the new value. Used to check whether the replayer
 * rewrites CSS in text mutations (see `adaptCssInTextMutations`).
 */
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
                    id: 101,
                    type: 2,
                    tagName: 'style',
                    attributes: {},
                    childNodes: [
                      {
                        id: 102,
                        type: 3,
                        isStyle: true,
                        textContent: '.initial {color: yellow;}',
                      },
                    ],
                  },
                ],
              },
              {
                id: 107,
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
  // replaces the stylesheet text with a rule that has a `:hover` selector
  {
    data: {
      texts: [{ id: 102, value: '.mutated:hover {color: red;}' }],
      attributes: [],
      removes: [],
      adds: [],
      source: IncrementalSource.Mutation,
    },
    type: EventType.IncrementalSnapshot,
    timestamp: now + 500,
  },
];

export default events;
