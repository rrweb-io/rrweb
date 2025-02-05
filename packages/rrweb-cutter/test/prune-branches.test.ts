/**
 * @jest-environment jsdom
 */
import { NodeType } from 'rrweb-snapshot';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';
import type { eventWithTime } from '@rrweb/types';
import { printRRDom } from 'rrdom';
import { eventsFn as inlineStyleEvents } from './events/inline-style.event';
import { pruneBranches } from '../src';
import { assertSnapshot } from 'rrweb/test/utils';

describe('prune branches', () => {
  it("should cut branches that doesn't include id", () => {
    const events = inlineStyleEvents() as eventWithTime[];
    const result = pruneBranches(events, { keep: [14] });
    expect(result).toHaveLength(5);
    const replayer = new SyncReplayer(result);
    replayer.play();

    expect(
      printRRDom(replayer.virtualDom, replayer.getMirror()),
    ).toMatchSnapshot('pruned all but 14');
  });

  it("should remove mutations that don't include ids", () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [
          {
            id: 15,
            value: 'Kept',
          },
          {
            id: 1001,
            value: 'Cut',
          },
        ],
        attributes: [
          {
            id: 14,
            attributes: {
              'data-attr': 'Kept',
            },
          },
          {
            id: 1002,
            attributes: {
              'data-attr': 'Cut',
            },
          },
        ],
        removes: [
          {
            parentId: 14,
            id: 15,
          },
          {
            parentId: 1002,
            id: 1003,
          },
        ],
        adds: [
          {
            parentId: 14,
            nextId: null,
            node: {},
          },
          {
            parentId: 1001,
            nextId: null,
            node: {},
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [14] });
    expect(result[result.length - 1]).toMatchSnapshot();
  });

  it('should remove branches based on nodes that came in after fullsnapshot', () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [],
        attributes: [],
        removes: [],
        adds: [
          {
            parentId: 14,
            nextId: null,
            node: {
              id: 99,
              type: NodeType.Element,
              tagName: 'canvas',
              attributes: {},
              childNodes: [],
            },
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [99] });
    assertSnapshot(result);
  });
  it('should remove branches based on child nodes that came in after fullsnapshot', () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [],
        attributes: [],
        removes: [],
        adds: [
          {
            parentId: 14,
            nextId: null,
            node: {
              id: 98,
              type: NodeType.Element,
              tagName: 'main',
              attributes: {},
              childNodes: [
                {
                  id: 99,
                  type: NodeType.Element,
                  tagName: 'canvas',
                  attributes: {},
                  childNodes: [],
                },
              ],
            },
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [99] });
    assertSnapshot(result);
  });

  it('should keep branches where target child nodes was, and gets moved to', () => {
    const mutationEvent = {
      type: EventType.IncrementalSnapshot,
      data: {
        source: 0,
        texts: [],
        attributes: [],
        removes: [
          {
            parentId: 14,
            id: 15,
          },
        ],
        adds: [
          {
            parentId: 5,
            nextId: null,
            node: { type: 3, textContent: '      \n    ', id: 15 },
          },
        ],
      },
    };
    const events = [...inlineStyleEvents(), mutationEvent] as eventWithTime[];
    const result = pruneBranches(events, { keep: [15] });
    assertSnapshot(result);
  });
});
