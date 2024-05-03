/**
 * @vitest-environment jsdom
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { mediaSelectorPlugin, pseudoClassPlugin } from '../src/css';
import postcss, { AcceptedPlugin } from 'postcss';
import { JSDOM } from 'jsdom';
import { findCssTextSplits, stringifyStylesheet } from './../src/utils';
import { applyCssSplits } from './../src/rebuild';
import {
  NodeType,
  serializedElementNodeWithId,
  BuildCache,
  textNode,
} from '../src/types';

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

      expect(findCssTextSplits(browserSheet, style)).toEqual([
        expectedSplit,
        browserSheet.length,
      ]);
    }
  });

  it('finds css textElement splits correctly when vendor prefixed rules have been removed', () => {
    const style = JSDOM.fragment(`<style></style>`).querySelector('style');
    if (style) {
      // as authored, with newlines
      style.appendChild(
        JSDOM.fragment(`.x {
  -webkit-transition: all 4s ease;
  content: 'try to keep a newline';
  transition: all 4s ease;
}`),
      );
      // TODO: findCssTextSplits can't handle it yet if both start with .x
      style.appendChild(
        JSDOM.fragment(`.y {
  -moz-transition: all 5s ease;
  transition: all 5s ease;
}`),
      );
      // browser .rules would usually omit the vendored versions and modifies the transition value
      let browserSheet =
        '.x { content: "try to keep a newline"; background: red; transition: 4s; }';
      let expectedSplit = browserSheet.length;
      browserSheet += '.y { transition: 5s; }';

      // can't do this as JSDOM doesn't have style.sheet
      //expect(stringifyStylesheet(style.sheet!)).toEqual(browserSheet);

      expect(findCssTextSplits(browserSheet, style)).toEqual([
        expectedSplit,
        browserSheet.length,
      ]);
    }
  });
});

describe('applyCssSplits css rejoiner', function () {
  const mockLastUnusedArg = null as unknown as BuildCache;
  const halfCssText = '.a { background-color: red; }';
  const otherHalfCssText = halfCssText.replace('.a', '.x');
  const fullCssText = halfCssText + otherHalfCssText;
  let sn: serializedElementNodeWithId;

  beforeEach(() => {
    sn = {
      type: NodeType.Element,
      tagName: 'style',
      childNodes: [
        {
          type: NodeType.Text,
          textContent: '',
        },
        {
          type: NodeType.Text,
          textContent: '',
        },
      ],
    } as serializedElementNodeWithId;
  });

  it('applies css splits correctly', () => {
    // happy path
    applyCssSplits(
      sn,
      fullCssText,
      [halfCssText.length, fullCssText.length],
      false,
      mockLastUnusedArg,
    );
    expect((sn.childNodes[0] as textNode).textContent).toEqual(halfCssText);
    expect((sn.childNodes[1] as textNode).textContent).toEqual(
      otherHalfCssText,
    );
  });

  it('applies css splits correctly even when there are too many child nodes', () => {
    let sn3 = {
      type: NodeType.Element,
      tagName: 'style',
      childNodes: [
        {
          type: NodeType.Text,
          textContent: '',
        },
        {
          type: NodeType.Text,
          textContent: '',
        },
        {
          type: NodeType.Text,
          textContent: '',
        },
      ],
    } as serializedElementNodeWithId;
    applyCssSplits(
      sn3,
      fullCssText,
      [halfCssText.length, fullCssText.length],
      false,
      mockLastUnusedArg,
    );
    expect((sn3.childNodes[0] as textNode).textContent).toEqual(halfCssText);
    expect((sn3.childNodes[1] as textNode).textContent).toEqual(
      otherHalfCssText,
    );
    expect((sn3.childNodes[2] as textNode).textContent).toEqual('');
  });

  it('maintains entire css text when there are too few child nodes', () => {
    let sn1 = {
      type: NodeType.Element,
      tagName: 'style',
      childNodes: [
        {
          type: NodeType.Text,
          textContent: '',
        },
      ],
    } as serializedElementNodeWithId;
    applyCssSplits(
      sn1,
      fullCssText,
      [halfCssText.length, fullCssText.length],
      false,
      mockLastUnusedArg,
    );
    expect((sn1.childNodes[0] as textNode).textContent).toEqual(fullCssText);
  });

  it('ignores css splits correctly when there is a mismatch in length check', () => {
    applyCssSplits(sn, fullCssText, [2, 3], false, mockLastUnusedArg);
    expect((sn.childNodes[0] as textNode).textContent).toEqual(fullCssText);
    expect((sn.childNodes[1] as textNode).textContent).toEqual('');
  });

  it('ignores css splits correctly when we indicate a split is invalid with the zero marker', () => {
    applyCssSplits(
      sn,
      fullCssText,
      [0, fullCssText.length],
      false,
      mockLastUnusedArg,
    );
    expect((sn.childNodes[0] as textNode).textContent).toEqual(fullCssText);
    expect((sn.childNodes[1] as textNode).textContent).toEqual('');
  });

  it('ignores css splits correctly with negative splits', () => {
    applyCssSplits(sn, fullCssText, [-2, -4], false, mockLastUnusedArg);
    expect((sn.childNodes[0] as textNode).textContent).toEqual(fullCssText);
    expect((sn.childNodes[1] as textNode).textContent).toEqual('');
  });

  it('ignores css splits correctly with out of order splits', () => {
    applyCssSplits(
      sn,
      fullCssText,
      [fullCssText.length * 2, fullCssText.length],
      false,
      mockLastUnusedArg,
    );
    expect((sn.childNodes[0] as textNode).textContent).toEqual(fullCssText);
    expect((sn.childNodes[1] as textNode).textContent).toEqual('');
  });
});
