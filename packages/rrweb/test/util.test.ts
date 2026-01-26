/**
 * @vitest-environment jsdom
 */
import {
  getRootShadowHost,
  StyleSheetMirror,
  inDom,
  shadowHostInDom,
  getShadowHost,
  getNestedRule,
  getPositionsAndIndex,
} from '../src/utils';

describe('Utilities for other modules', () => {
  describe('StyleSheetMirror', () => {
    it('should create a StyleSheetMirror', () => {
      const mirror = new StyleSheetMirror();
      expect(mirror).toBeDefined();
      expect(mirror.add).toBeDefined();
      expect(mirror.has).toBeDefined();
      expect(mirror.reset).toBeDefined();
      expect(mirror.getId).toBeDefined();
    });

    it('can add CSSStyleSheet into the mirror without ID parameter', () => {
      const mirror = new StyleSheetMirror();
      const styleSheet = new CSSStyleSheet();
      expect(mirror.has(styleSheet)).toBeFalsy();
      expect(mirror.add(styleSheet)).toEqual(1);
      expect(mirror.has(styleSheet)).toBeTruthy();
      // This stylesheet has been added before so just return its assigned id.
      expect(mirror.add(styleSheet)).toEqual(1);

      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        expect(mirror.has(styleSheet)).toBeFalsy();
        expect(mirror.add(styleSheet)).toEqual(i + 2);
        expect(mirror.has(styleSheet)).toBeTruthy();
      }
    });

    it('can add CSSStyleSheet into the mirror with ID parameter', () => {
      const mirror = new StyleSheetMirror();
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        expect(mirror.has(styleSheet)).toBeFalsy();
        expect(mirror.add(styleSheet, i)).toEqual(i);
        expect(mirror.has(styleSheet)).toBeTruthy();
      }
    });

    it('can get the id from the mirror', () => {
      const mirror = new StyleSheetMirror();
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        mirror.add(styleSheet);
        expect(mirror.getId(styleSheet)).toBe(i + 1);
      }
      expect(mirror.getId(new CSSStyleSheet())).toBe(-1);
    });

    it('can get CSSStyleSheet objects with id', () => {
      const mirror = new StyleSheetMirror();
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        mirror.add(styleSheet);
        expect(mirror.getStyle(i + 1)).toBe(styleSheet);
      }
    });

    it('can reset the mirror', () => {
      const mirror = new StyleSheetMirror();
      const styleList: CSSStyleSheet[] = [];
      for (let i = 0; i < 10; i++) {
        const styleSheet = new CSSStyleSheet();
        mirror.add(styleSheet);
        expect(mirror.getId(styleSheet)).toBe(i + 1);
        styleList.push(styleSheet);
      }
      expect(mirror.reset()).toBeUndefined();
      for (let s of styleList) expect(mirror.has(s)).toBeFalsy();
      for (let i = 0; i < 10; i++) expect(mirror.getStyle(i + 1)).toBeNull();
      expect(mirror.add(new CSSStyleSheet())).toBe(1);
    });
  });

  describe('inDom()', () => {
    it('should get correct result given nested shadow doms', () => {
      const shadowHost = document.createElement('div');
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
      const shadowHost2 = document.createElement('div');
      const shadowRoot2 = shadowHost2.attachShadow({ mode: 'open' });
      const div = document.createElement('div');
      shadowRoot.appendChild(shadowHost2);
      shadowRoot2.appendChild(div);
      // Not in Dom yet.
      expect(getShadowHost(div)).toBe(shadowHost2);
      expect(getRootShadowHost(div)).toBe(shadowHost);
      expect(shadowHostInDom(div)).toBeFalsy();
      expect(inDom(div)).toBeFalsy();

      // Added to the Dom.
      document.body.appendChild(shadowHost);
      expect(getShadowHost(div)).toBe(shadowHost2);
      expect(getRootShadowHost(div)).toBe(shadowHost);
      expect(shadowHostInDom(div)).toBeTruthy();
      expect(inDom(div)).toBeTruthy();
    });

    it('should get correct result given a normal node', () => {
      const div = document.createElement('div');
      // Not in Dom yet.
      expect(getShadowHost(div)).toBeNull();
      expect(getRootShadowHost(div)).toBe(div);
      expect(shadowHostInDom(div)).toBeFalsy();
      expect(inDom(div)).toBeFalsy();

      // Added to the Dom.
      document.body.appendChild(div);
      expect(getShadowHost(div)).toBeNull();
      expect(getRootShadowHost(div)).toBe(div);
      expect(shadowHostInDom(div)).toBeTruthy();
      expect(inDom(div)).toBeTruthy();
    });

    /**
     * Given the textNode of a detached HTMLAnchorElement, getRootNode() will return the anchor element itself and its host property is a string.
     * This corner case may cause an error in getRootShadowHost().
     */
    it('should get correct result given the textNode of a detached HTMLAnchorElement', () => {
      const a = document.createElement('a');
      a.href = 'example.com';
      a.textContent = 'something';
      // Not in Dom yet.
      expect(getShadowHost(a.childNodes[0])).toBeNull();
      expect(getRootShadowHost(a.childNodes[0])).toBe(a.childNodes[0]);
      expect(shadowHostInDom(a.childNodes[0])).toBeFalsy();
      expect(inDom(a.childNodes[0])).toBeFalsy();

      // Added to the Dom.
      document.body.appendChild(a);
      expect(getShadowHost(a.childNodes[0])).toBeNull();
      expect(getRootShadowHost(a.childNodes[0])).toBe(a.childNodes[0]);
      expect(shadowHostInDom(a.childNodes[0])).toBeTruthy();
      expect(inDom(a.childNodes[0])).toBeTruthy();
    });
  });

  describe('getNestedRule()', () => {
    it('should return the rule at position [0] for a top-level rule', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule('.test { color: red; }', 0);

      const rule = getNestedRule(sheet.cssRules, [0]);
      expect(rule).toBe(sheet.cssRules[0]);
      expect((rule as CSSStyleRule).selectorText).toBe('.test');

      document.head.removeChild(style);
    });

    it('should return nested rule inside @media at position [0, 0]', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule(
        '@media (min-width: 1px) { .nested { color: blue; } }',
        0,
      );

      const mediaRule = sheet.cssRules[0] as CSSMediaRule;
      const nestedRule = getNestedRule(sheet.cssRules, [0, 0]);

      expect(nestedRule).toBe(mediaRule.cssRules[0]);
      expect((nestedRule as CSSStyleRule).selectorText).toBe('.nested');

      document.head.removeChild(style);
    });

    it('should return correct rule for multiple rules inside @media', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule(
        '@media (min-width: 1px) { .first { color: red; } .second { color: blue; } }',
        0,
      );

      const mediaRule = sheet.cssRules[0] as CSSMediaRule;

      const firstRule = getNestedRule(sheet.cssRules, [0, 0]);
      expect(firstRule).toBe(mediaRule.cssRules[0]);
      expect((firstRule as CSSStyleRule).selectorText).toBe('.first');

      const secondRule = getNestedRule(sheet.cssRules, [0, 1]);
      expect(secondRule).toBe(mediaRule.cssRules[1]);
      expect((secondRule as CSSStyleRule).selectorText).toBe('.second');

      document.head.removeChild(style);
    });

    it('should handle deeply nested rules (@supports > @media > rule)', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule(
        '@supports (display: flex) { @media (min-width: 1px) { .deep { color: green; } } }',
        0,
      );

      const supportsRule = sheet.cssRules[0] as CSSSupportsRule;
      const mediaRule = supportsRule.cssRules[0] as CSSMediaRule;
      const deepRule = mediaRule.cssRules[0] as CSSStyleRule;

      const result = getNestedRule(sheet.cssRules, [0, 0, 0]);
      expect(result).toBe(deepRule);
      expect((result as CSSStyleRule).selectorText).toBe('.deep');

      document.head.removeChild(style);
    });

    it('should handle multiple top-level grouping rules', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      const sheet = style.sheet!;
      sheet.insertRule(
        '@media (min-width: 1px) { .media-rule { color: red; } }',
        0,
      );
      sheet.insertRule(
        '@supports (display: grid) { .supports-rule { color: blue; } }',
        1,
      );

      // Rule inside first @media
      const mediaNestedRule = getNestedRule(sheet.cssRules, [0, 0]);
      expect((mediaNestedRule as CSSStyleRule).selectorText).toBe(
        '.media-rule',
      );

      // Rule inside second @supports
      const supportsNestedRule = getNestedRule(sheet.cssRules, [1, 0]);
      expect((supportsNestedRule as CSSStyleRule).selectorText).toBe(
        '.supports-rule',
      );

      document.head.removeChild(style);
    });
  });

  describe('getPositionsAndIndex()', () => {
    it('should split single element array into empty positions and index', () => {
      const result = getPositionsAndIndex([5]);
      expect(result.positions).toEqual([]);
      expect(result.index).toBe(5);
    });

    it('should split two element array correctly', () => {
      const result = getPositionsAndIndex([0, 3]);
      expect(result.positions).toEqual([0]);
      expect(result.index).toBe(3);
    });

    it('should split three element array correctly', () => {
      const result = getPositionsAndIndex([1, 2, 3]);
      expect(result.positions).toEqual([1, 2]);
      expect(result.index).toBe(3);
    });
  });
});
