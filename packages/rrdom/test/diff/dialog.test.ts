/**
 * @vitest-environment happy-dom
 */
import { vi, MockInstance } from 'vitest';
import {
  createMirror,
  Mirror as NodeMirror,
  serializedNodeWithId,
} from 'rrweb-snapshot';
import { NodeType as RRNodeType } from '@rrweb/types';
import { RRDocument } from '../../src';
import { diff, ReplayerHandler } from '../../src/diff';

describe('diff algorithm for rrdom', () => {
  let mirror: NodeMirror;
  let replayer: ReplayerHandler;
  let warn: MockInstance;
  let elementSn: serializedNodeWithId;
  let elementSn2: serializedNodeWithId;

  beforeEach(() => {
    mirror = createMirror();
    replayer = {
      mirror,
      applyCanvas: () => {},
      applyInput: () => {},
      applyScroll: () => {},
      applyStyleSheetMutation: () => {},
      afterAppend: () => {},
    };
    document.write('<!DOCTYPE html><html><head></head><body></body></html>');
    // Mock the original console.warn function to make the test fail once console.warn is called.
    warn = vi.spyOn(console, 'warn');

    elementSn = {
      type: RRNodeType.Element,
      tagName: 'DIALOG',
      attributes: {},
      childNodes: [],
      id: 1,
    };

    elementSn2 = {
      ...elementSn,
      attributes: {},
    };
  });

  afterEach(() => {
    // Check that warn was not called (fail on warning)
    expect(warn).not.toBeCalled();
    vi.resetAllMocks();
  });
  describe('diff dialog elements', () => {
    vi.setConfig({ testTimeout: 60_000 });

    it('should trigger `showModal` on rr_open_mode:modal attributes', () => {
      const tagName = 'DIALOG';
      const node = document.createElement(tagName) as HTMLDialogElement;
      vi.spyOn(node, 'matches').mockReturnValue(false); // matches is used to check if the dialog was opened with showModal
      const showModalFn = vi.spyOn(node, 'showModal');

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      rrNode.attributes = { rr_open_mode: 'modal', open: '' };

      mirror.add(node, elementSn);
      rrDocument.mirror.add(rrNode, elementSn);
      diff(node, rrNode, replayer);

      expect(showModalFn).toBeCalled();
    });

    it('should trigger `close` on rr_open_mode removed', () => {
      const tagName = 'DIALOG';
      const node = document.createElement(tagName) as HTMLDialogElement;
      node.showModal();
      vi.spyOn(node, 'matches').mockReturnValue(true); // matches is used to check if the dialog was opened with showModal
      const closeFn = vi.spyOn(node, 'close');

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      rrNode.attributes = {};

      mirror.add(node, elementSn);
      rrDocument.mirror.add(rrNode, elementSn);
      diff(node, rrNode, replayer);

      expect(closeFn).toBeCalled();
    });

    it('should not trigger `close` on rr_open_mode is kept', () => {
      const tagName = 'DIALOG';
      const node = document.createElement(tagName) as HTMLDialogElement;
      vi.spyOn(node, 'matches').mockReturnValue(true); // matches is used to check if the dialog was opened with showModal
      node.setAttribute('rr_open_mode', 'modal');
      node.setAttribute('open', '');
      const closeFn = vi.spyOn(node, 'close');

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      rrNode.attributes = { rr_open_mode: 'modal', open: '' };

      mirror.add(node, elementSn);
      rrDocument.mirror.add(rrNode, elementSn);
      diff(node, rrNode, replayer);

      expect(closeFn).not.toBeCalled();
      expect(node.open).toBe(true);
    });
  });
});
