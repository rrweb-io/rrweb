import type { eventWithTime } from '@amplitude/rrweb-types';
import { EventType, IncrementalSource } from '@amplitude/rrweb-types';

/**
 * Two shadow hosts share a CSSStyleSheet (styleId 1) declared in the
 * FullSnapshot, followed by harmless incremental events spread over a few
 * seconds. The incremental events exist so the seek cache has a window to
 * capture a checkpoint after the FullSnapshot — no further AdoptedStyleSheet
 * events are emitted, so a cache-restored seek must reproduce the shared-sheet
 * adoption from the cached snapshot alone (it cannot rely on incremental
 * adoption events to repaint styling after a checkpoint hit).
 */
const now = Date.now();

const events: eventWithTime[] = [
  { type: EventType.DomContentLoaded, data: {}, timestamp: now },
  {
    type: EventType.Meta,
    data: { href: 'about:blank', width: 1920, height: 1080 },
    timestamp: now + 100,
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
                  { type: 3, textContent: '\n  ', id: 6 },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: { id: 'shadow-host-1' },
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'span',
                        attributes: {},
                        childNodes: [
                          { type: 3, textContent: 'text in shadow 1', id: 9 },
                        ],
                        id: 8,
                        isShadow: true,
                      },
                    ],
                    id: 7,
                    isShadowHost: true,
                    adoptedStyleSheets: [
                      {
                        styleId: 1,
                        rules: [{ rule: 'span { color: red; }', index: 0 }],
                      },
                    ],
                  },
                  { type: 3, textContent: '\n  ', id: 10 },
                  {
                    type: 2,
                    tagName: 'div',
                    attributes: { id: 'shadow-host-2' },
                    childNodes: [
                      {
                        type: 2,
                        tagName: 'span',
                        attributes: {},
                        childNodes: [
                          { type: 3, textContent: 'text in shadow 2', id: 13 },
                        ],
                        id: 12,
                        isShadow: true,
                      },
                    ],
                    id: 11,
                    isShadowHost: true,
                    adoptedStyleSheets: [{ styleId: 1, rules: [] }],
                  },
                  { type: 3, textContent: '\n', id: 14 },
                ],
                id: 5,
              },
            ],
            id: 3,
          },
        ],
        id: 1,
      },
      initialOffset: { left: 0, top: 0 },
    },
    timestamp: now + 100,
  },
  // Mouse moves spaced 500ms apart give the seek cache distinct anchor points
  // without touching shadow DOM state.
  ...(Array.from({ length: 8 }, (_, i) => ({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: 1,
      id: 1,
      x: i * 5,
      y: i * 5,
    },
    timestamp: now + 500 + i * 500,
  })) as eventWithTime[]),
];

export default events;
