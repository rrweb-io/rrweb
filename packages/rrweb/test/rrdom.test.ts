/**
 * @vitest-environment jsdom
 */
import { EventType, IncrementalSource, Replayer, eventWithTime } from '../src';
import { vi, type MockInstance } from 'vitest';
import type {
  styleDeclarationData,
  styleSheetRuleData,
} from '@saola.ai/rrweb-types';
import { createMirror, Mirror as NodeMirror } from '@saola.ai/rrweb-snapshot';
import type { ReplayerHandler } from '@saola.ai/rrdom';

describe('diff algorithm for rrdom', () => {
  let mirror: NodeMirror;
  let replayer: ReplayerHandler;
  let warn: MockInstance;

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
  });

  afterEach(() => {
    // Check that warn was not called (fail on warning)
    expect(warn).not.toBeCalled();
    warn.mockRestore();
  });

  describe('apply virtual style rules to node', () => {
    beforeEach(() => {
      const dummyReplayer = new Replayer([
        {
          type: EventType.DomContentLoaded,
          timestamp: 0,
        },
        {
          type: EventType.Meta,
          data: {
            with: 1920,
            height: 1080,
          },
          timestamp: 0,
        },
      ] as unknown as eventWithTime[]);
      replayer.applyStyleSheetMutation = (
        data: styleDeclarationData | styleSheetRuleData,
        styleSheet: CSSStyleSheet,
      ) => {
        if (data.source === IncrementalSource.StyleSheetRule)
          // Disable the ts check here because these two functions are private methods.
          // @ts-ignore
          dummyReplayer.applyStyleSheetRule(data, styleSheet);
        else if (data.source === IncrementalSource.StyleDeclaration)
          // @ts-ignore
          dummyReplayer.applyStyleDeclaration(data, styleSheet);
      };
    });

    it('should insert rule at index 0 in empty sheet', () => {
      document.write('<style></style>');
      const styleEl = document.getElementsByTagName('style')[0];
      const cssText = '.added-rule {border: 1px solid yellow;}';

      const styleRuleData: styleSheetRuleData = {
        source: IncrementalSource.StyleSheetRule,
        adds: [
          {
            rule: cssText,
            index: 0,
          },
        ],
      };
      replayer.applyStyleSheetMutation(styleRuleData, styleEl.sheet!);

      expect(styleEl.sheet?.cssRules?.length).toEqual(1);
      expect(styleEl.sheet?.cssRules[0].cssText).toEqual(cssText);
    });

    it('should insert rule at index 0 and keep exsisting rules', () => {
      document.write(`
    <style>
      a {color: blue}
      div {color: black}
    </style>
  `);
      const styleEl = document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';
      const styleRuleData: styleSheetRuleData = {
        source: IncrementalSource.StyleSheetRule,
        adds: [
          {
            rule: cssText,
            index: 0,
          },
        ],
      };
      replayer.applyStyleSheetMutation(styleRuleData, styleEl.sheet!);

      expect(styleEl.sheet?.cssRules?.length).toEqual(3);
      expect(styleEl.sheet?.cssRules[0].cssText).toEqual(cssText);
    });

    it('should delete rule at index 0', () => {
      document.write(`
      <style>
        a {color: blue;}
        div {color: black;}
      </style>
    `);
      const styleEl = document.getElementsByTagName('style')[0];

      const styleRuleData: styleSheetRuleData = {
        source: IncrementalSource.StyleSheetRule,
        removes: [
          {
            index: 0,
          },
        ],
      };
      replayer.applyStyleSheetMutation(styleRuleData, styleEl.sheet!);

      expect(styleEl.sheet?.cssRules?.length).toEqual(1);
      expect(styleEl.sheet?.cssRules[0].cssText).toEqual('div {color: black;}');
    });

    it('should insert rule at index [0,0] and keep existing rules', () => {
      document.write(`
      <style>
        @media {
          a {color: blue}
          div {color: black}
        }
      </style>
    `);
      const styleEl = document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';
      const styleRuleData: styleSheetRuleData = {
        source: IncrementalSource.StyleSheetRule,
        adds: [
          {
            rule: cssText,
            index: [0, 0],
          },
        ],
      };
      replayer.applyStyleSheetMutation(styleRuleData, styleEl.sheet!);

      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules?.length,
      ).toEqual(3);
      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules[0].cssText,
      ).toEqual(cssText);
    });

    it('should delete rule at index [0,1]', () => {
      document.write(`
      <style>
        @media {
          a {color: blue;}
          div {color: black;}
        }
      </style>
    `);
      const styleEl = document.getElementsByTagName('style')[0];
      const styleRuleData: styleSheetRuleData = {
        source: IncrementalSource.StyleSheetRule,
        removes: [
          {
            index: [0, 1],
          },
        ],
      };
      replayer.applyStyleSheetMutation(styleRuleData, styleEl.sheet!);

      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules?.length,
      ).toEqual(1);
      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules[0].cssText,
      ).toEqual('a {color: blue;}');
    });
  });
});
