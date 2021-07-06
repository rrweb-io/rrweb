import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import {
  applyVirtualStyleRulesToNode,
  StyleRuleType,
  VirtualStyleRules,
} from '../../src/replay/virtual-styles';

describe('virtual styles', () => {
  describe('applyVirtualStyleRulesToNode', () => {
    it('should insert rule at index 0 in empty sheet', () => {
      const dom = new JSDOM(`
        <style></style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';

      const virtualStyleRules: VirtualStyleRules = [
        { cssText, index: 0, type: StyleRuleType.Insert },
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(1);
      expect(styleEl.sheet?.cssRules[0].cssText).to.equal(cssText);
    });

    it('should insert rule at index 0 and keep exsisting rules', () => {
      const dom = new JSDOM(`
        <style>
          a {color: blue}
          div {color: black}
        </style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';
      const virtualStyleRules: VirtualStyleRules = [
        { cssText, index: 0, type: StyleRuleType.Insert },
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(3);
      expect(styleEl.sheet?.cssRules[0].cssText).to.equal(cssText);
    });

    it('should delete rule at index 1', () => {
      const dom = new JSDOM(`
        <style>
          a {color: blue;}
          div {color: black;}
        </style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const virtualStyleRules: VirtualStyleRules = [
        { index: 0, type: StyleRuleType.Remove },
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(1);
      expect(styleEl.sheet?.cssRules[0].cssText).to.equal(
        'div {color: black;}',
      );
    });

    it('should restore a snapshot by inserting missing rules', () => {
      const dom = new JSDOM(`
        <style>
          a {color: blue;}
          .deleted-rule {color: pink;}
          div {color: black;}
        </style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const virtualStyleRules: VirtualStyleRules = [
        {
          cssTexts: ['a {color: blue;}', 'div {color: black;}'],
          type: StyleRuleType.Snapshot,
        },
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(2);
    });

    it('should restore a snapshot by fixing order of rules', () => {
      const dom = new JSDOM(`
        <style>
          div {color: black;}
          a {color: blue;}
        </style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const cssTexts = ['a {color: blue;}', 'div {color: black;}'];

      const virtualStyleRules: VirtualStyleRules = [
        {
          cssTexts,
          type: StyleRuleType.Snapshot,
        },
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(2);
      expect(
        Array.from(styleEl.sheet?.cssRules || []).map((rule) => rule.cssText),
      ).to.have.ordered.members(cssTexts);
    });
  });
});
