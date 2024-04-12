/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { mediaSelectorPlugin, pseudoClassPlugin } from '../src/css';
import postcss, { AcceptedPlugin } from 'postcss';
import { JSDOM } from 'jsdom';
import { findCssTextSplits, stringifyStylesheet } from './../src/utils';

describe('css parser', () => {
  function parse(plugin: AcceptedPlugin, input: string): string {
    const ast = postcss([plugin]).process(input, {});
    return ast.css;
  }

  describe('mediaSelectorPlugin', () => {
    it('selectors without device remain unchanged', () => {
      const cssText =
        '@media only screen and (min-width: 1200px) { .a { width: 10px; }}';
      expect(parse(mediaSelectorPlugin, cssText)).toEqual(cssText);
    });

    it('can adapt media rules to replay context', () => {
      [
        ['min', 'width'],
        ['min', 'height'],
        ['max', 'width'],
        ['max', 'height'],
      ].forEach(([first, second]) => {
        expect(
          parse(
            mediaSelectorPlugin,
            `@media only screen and (${first}-device-${second}: 1200px) { .a { width: 10px; }}`,
          ),
        ).toEqual(
          `@media only screen and (${first}-${second}: 1200px) { .a { width: 10px; }}`,
        );
      });
    });
  });

  describe('pseudoClassPlugin', () => {
    it('parses nested commas in selectors correctly', () => {
      const cssText =
        'body > ul :is(li:not(:first-of-type) a:hover, li:not(:first-of-type).active a) {background: red;}';
      expect(parse(pseudoClassPlugin, cssText)).toEqual(cssText);
    });

    it('should parse selector with comma nested inside ()', () => {
      const cssText =
        '[_nghost-ng-c4172599085]:not(.fit-content).aim-select:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--invalid, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--active) { border-color: rgb(84, 84, 84); }';
      expect(parse(pseudoClassPlugin, cssText))
        .toEqual(`[_nghost-ng-c4172599085]:not(.fit-content).aim-select:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--invalid, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--active),
[_nghost-ng-c4172599085]:not(.fit-content).aim-select.\\:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--invalid, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--active) { border-color: rgb(84, 84, 84); }`);
    });

    it('ignores ( in strings', () => {
      const cssText =
        'li[attr="weirdly("] a:hover, li[attr="weirdly)"] a {background-color: red;}';
      expect(parse(pseudoClassPlugin, cssText))
        .toEqual(`li[attr="weirdly("] a:hover, li[attr="weirdly)"] a,
li[attr="weirdly("] a.\\:hover {background-color: red;}`);
    });

    it('ignores escaping in strings', () => {
      const cssText = `li[attr="weirder\\"("] a:hover, li[attr="weirder\\")"] a {background-color: red;}`;
      expect(parse(pseudoClassPlugin, cssText))
        .toEqual(`li[attr="weirder\\"("] a:hover, li[attr="weirder\\")"] a,
li[attr="weirder\\"("] a.\\:hover {background-color: red;}`);
    });

    it('ignores comma in string', () => {
      const cssText = 'li[attr="has,comma"] a:hover {background: red;}';
      expect(parse(pseudoClassPlugin, cssText)).toEqual(
        `li[attr="has,comma"] a:hover,
li[attr="has,comma"] a.\\:hover {background: red;}`,
      );
    });
  });
});

describe('css splitter', () => {
  it('finds css textElement splits correctly', () => {
    const style = JSDOM.fragment(`<style></style>`).querySelector('style');
    if (style) {
      // as authored, e.g. no spaces
      style.appendChild(JSDOM.fragment('.a{background-color:red;}'));
      style.appendChild(JSDOM.fragment('.a{background-color:black;}'));

      // how it is currently stringified (spaces present)
      let browserSheet = '.a { background-color: red; }';
      let expectedSplit = browserSheet.length;
      browserSheet += '.a { background-color: black; }';

      // can't do this as JSDOM doesn't have style.sheet
      //expect(stringifyStylesheet(style.sheet!)).toEqual(browserSheet);

      expect(findCssTextSplits(browserSheet, style)).toEqual([expectedSplit]);
    }
  });
});
