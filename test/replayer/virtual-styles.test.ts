import { expect } from 'chai';
import { INode } from 'rrweb-snapshot';
import { Replayer } from '../../src/replay';
import { JSDOM } from 'jsdom';
import {
  applyVirtualStyleRulesToNode,
  VirtualStyleRules,
} from '../../src/replay/virtual-styles';

describe('virtual styles', () => {
  describe('applyVirtualStyleRulesToNode', () => {
    it('should insert rule at index 0 in empty sheet', () => {
      const dom = new JSDOM(`
        <style></style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const cssRule = '.x {border: 1px solid yellow;}';
      const virtualStyleRules: VirtualStyleRules = [
        [{ cssText: cssRule } as CSSRule, 0],
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(1);
      expect(styleEl.sheet?.cssRules[0].cssText).to.equal(cssRule);
    });

    it('should insert rule at index 0 and keep exsisting rules', () => {
      const dom = new JSDOM(`
        <style>
          a {color: blue}
          div {color: black}
        </style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const cssRule = '.x {border: 1px solid yellow;}';
      const virtualStyleRules: VirtualStyleRules = [
        [{ cssText: cssRule } as CSSRule, 0],
      ];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(3);
      expect(styleEl.sheet?.cssRules[0].cssText).to.equal(cssRule);
    });

    it('should delete rule at index 1', () => {
      const dom = new JSDOM(`
        <style>
          a {color: blue;}
          div {color: black;}
        </style>
      `);
      const styleEl = dom.window.document.getElementsByTagName('style')[0];

      const virtualStyleRules: VirtualStyleRules = [[false, 0]];
      applyVirtualStyleRulesToNode(virtualStyleRules, styleEl);

      expect(styleEl.sheet?.cssRules?.length).to.equal(1);
      expect(styleEl.sheet?.cssRules[0].cssText).to.equal(
        'div {color: black;}',
      );
    });
  });
});
