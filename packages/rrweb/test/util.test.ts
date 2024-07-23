import { makeBlockSelector } from '../src/utils';
/**
 * @vitest-environment jsdom
 */
import {
  getRootShadowHost,
  StyleSheetMirror,
  inDom,
  shadowHostInDom,
  getShadowHost,
} from '../src/utils';

describe('Utilities for other modules', () => {
  describe('makeBlockSelector', () => {
    it('should return null when both blockSelector and blockClass are null', () => {
      expect(makeBlockSelector(null, null)).toBeNull();
    });
    it('returns blockClass as selector', () => {
      expect(makeBlockSelector('block', null)).toBe('.block');
    });
    it('returns blockClass as selector when blockSelector is falsy', () => {
      expect(makeBlockSelector('block', '')).toBe('.block');
    });
    it('returns merged blockClass and blockSelector blockSelector is string', () => {
      expect(makeBlockSelector('block', '.selector')).toBe('.block,.selector');
    });
    it('returns merged blockClass and blockSelector blockSelector is string', () => {
      expect(makeBlockSelector('block', '.selector')).toBe('.block,.selector');
    });
    it('returns merged blockClass and blockSelector blockSelector is a RegExp', () => {
      const selector = makeBlockSelector('block', /\.selector/);
      if (!selector || typeof selector === 'string') {
        throw new Error('selector should be a RegExp');
      }
      expect(selector).toBeInstanceOf(RegExp);
      expect(selector.test('.block')).toBeTruthy();
      expect(selector.test('.selector')).toBeTruthy();
    });
    it('returns blockSelector as regexp if blockClass is falsy', () => {
      const regexp = /\.selector/;
      const selector = makeBlockSelector('', regexp);
      if (!selector || typeof selector === 'string') {
        throw new Error('selector should be a RegExp');
      }
      expect(selector).toBeInstanceOf(RegExp);
      expect(selector).toBe(regexp);
    });
  });
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
});
