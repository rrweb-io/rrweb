/**
 * @vitest-environment jsdom
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { mediaSelectorPlugin, pseudoClassPlugin } from '../src/css';
import postcss, { type AcceptedPlugin } from 'postcss';
import { JSDOM } from 'jsdom';
import { splitCssText, stringifyStylesheet } from './../src/utils';
import { applyCssSplits } from './../src/rebuild';
import * as fs from 'fs';
import * as path from 'path';
import type {
  serializedElementNodeWithId,
  BuildCache,
  textNode,
} from '../src/types';
import { NodeType } from '@rrweb/types';
import { Window } from 'happy-dom';

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
        'body > ul :is(li:not(:first-of-type) a.current, li:not(:first-of-type).active a) {background: red;}';
      expect(parse(pseudoClassPlugin, cssText)).toEqual(cssText);
    });

    it("doesn't ignore :hover within :is brackets", () => {
      const cssText =
        'body > ul :is(li:not(:first-of-type) a:hover, li:not(:first-of-type).active a) {background: red;}';
      expect(parse(pseudoClassPlugin, cssText))
        .toEqual(`body > ul :is(li:not(:first-of-type) a:hover, li:not(:first-of-type).active a),
body > ul :is(li:not(:first-of-type) a.\\:hover, li:not(:first-of-type).active a) {background: red;}`);
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
    const window = new Window({ url: 'https://localhost:8080' });
    const document = window.document;
    document.head.innerHTML = '<style>.a{background-color:red;}</style>';
    const style = document.querySelector('style');
    if (style) {
      // as authored, e.g. no spaces
      style.append('.a{background-color:black;}');

      // test how normalization finds the right sections
      style.append('.b      {background-color:black;}');
      style.append('.c{      background-color:                     black}');

      // how it is currently stringified (spaces present)
      const expected = [
        '.a { background-color: red; }',
        '.a { background-color: black; }',
        '.b { background-color: black; }',
        '.c { background-color: black; }',
      ];
      const browserSheet = expected.join('');
      expect(stringifyStylesheet(style.sheet!)).toEqual(browserSheet);

      expect(splitCssText(browserSheet, style)).toEqual(expected);
    }
  });

  it('finds css textElement splits correctly when comments are present', () => {
    const window = new Window({ url: 'https://localhost:8080' });
    const document = window.document;
    // as authored, with comment, missing semicolons
    document.head.innerHTML =
      '<style>.a{color:red}.b{color:blue} /* author comment */</style>';
    const style = document.querySelector('style');
    if (style) {
      style.append('/* author comment */.a{color:red}.b{color:green}');

      // how it is currently stringified (spaces present)
      const expected = [
        '.a { color: red; } .b { color: blue; }',
        '.a { color: red; } .b { color: green; }',
      ];
      const browserSheet = expected.join('');
      expect(splitCssText(browserSheet, style)).toEqual(expected);
    }
  });

  it('finds css textElement splits correctly with two identical text nodes', () => {
    const window = new Window({ url: 'https://localhost:8080' });
    const document = window.document;
    // as authored, with comment, missing semicolons
    const textContent = '.a { color:red; } .b { color:blue; }';
    document.head.innerHTML = '<style></style>';
    const style = document.querySelector('style');
    if (style) {
      style.append(textContent);
      style.append(textContent);

      const expected = [textContent, textContent];
      const browserSheet = expected.join('');
      expect(splitCssText(browserSheet, style)).toEqual(expected);

      style.append(textContent);
      const expected3 = [textContent, textContent, textContent];
      const browserSheet3 = expected3.join('');
      expect(splitCssText(browserSheet3, style)).toEqual(expected3);
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
      // TODO: splitCssText can't handle it yet if both start with .x
      style.appendChild(
        JSDOM.fragment(`.y {
  -moz-transition: all 5s ease;
  transition: all 5s ease;
}`),
      );
      // browser .rules would usually omit the vendored versions and modifies the transition value
      const expected = [
        '.x { content: "try to keep a newline"; background: red; transition: 4s; }',
        '.y { transition: 5s; }',
      ];
      const browserSheet = expected.join('');

      // can't do this as JSDOM doesn't have style.sheet
      // also happy-dom doesn't strip out vendor-prefixed rules like a real browser does
      //expect(stringifyStylesheet(style.sheet!)).toEqual(browserSheet);

      expect(splitCssText(browserSheet, style)).toEqual(expected);
    }
  });

  it('efficiently finds split points in large files', () => {
    const cssText = fs.readFileSync(
      path.resolve(__dirname, './css/benchmark.css'),
      'utf8',
    );

    const parts = cssText.split('}');
    const sections = [];
    for (let i = 0; i < parts.length - 1; i++) {
      if (i % 100 === 0) {
        sections.push(parts[i] + '}');
      } else {
        sections[sections.length - 1] += parts[i] + '}';
      }
    }
    sections[sections.length - 1] += parts[parts.length - 1];

    expect(cssText.length).toEqual(sections.join('').length);

    const style = JSDOM.fragment(`<style></style>`).querySelector('style');
    if (style) {
      sections.forEach((section) => {
        style.appendChild(JSDOM.fragment(section));
      });
    }
    expect(splitCssText(cssText, style)).toEqual(sections);
  });
});

describe('applyCssSplits css rejoiner', function () {
  const mockLastUnusedArg = null as unknown as BuildCache;
  const halfCssText = '.a { background-color: red; }';
  const otherHalfCssText = halfCssText.replace('.a', '.x');
  const markedCssText = [halfCssText, otherHalfCssText].join('/* rr_split */');
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
    applyCssSplits(sn, markedCssText, false, mockLastUnusedArg);
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
    applyCssSplits(sn3, markedCssText, false, mockLastUnusedArg);
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
    applyCssSplits(sn1, markedCssText, false, mockLastUnusedArg);
    expect((sn1.childNodes[0] as textNode).textContent).toEqual(
      halfCssText + otherHalfCssText,
    );
  });
});
