/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  adaptCssForReplay,
  buildNodeWithSN,
  createCache,
} from '../src/rebuild';
import { NodeType } from '../src/types';
import { createMirror, Mirror } from '../src/utils';

function getDuration(hrtime: [number, number]) {
  const [seconds, nanoseconds] = hrtime;
  return seconds * 1000 + nanoseconds / 1000000;
}

describe('rebuild', function () {
  let cache: ReturnType<typeof createCache>;
  let mirror: Mirror;

  beforeEach(() => {
    mirror = createMirror();
    cache = createCache();
  });

  describe('rr_dataURL', function () {
    it('should rebuild dataURL', function () {
      const dataURI =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const node = buildNodeWithSN(
        {
          id: 1,
          tagName: 'img',
          type: NodeType.Element,
          attributes: {
            rr_dataURL: dataURI,
            src: 'http://example.com/image.png',
          },
          childNodes: [],
        },
        {
          doc: document,
          mirror,
          hackCss: false,
          cache,
        },
      ) as HTMLImageElement;
      expect(node?.src).toBe(dataURI);
    });
  });

  describe('shadowDom', function () {
    it('rebuild shadowRoot without siblings', function () {
      const node = buildNodeWithSN(
        {
          id: 1,
          tagName: 'div',
          type: NodeType.Element,
          attributes: {},
          childNodes: [
            {
              id: 2,
              tagName: 'div',
              type: NodeType.Element,
              attributes: {},
              childNodes: [],
              isShadow: true,
            },
          ],
          isShadowHost: true,
        },
        {
          doc: document,
          mirror,
          hackCss: false,
          cache,
        },
      ) as HTMLDivElement;
      expect(node.shadowRoot?.childNodes.length).toBe(1);
    });
  });

  describe('add hover class to hover selector related rules', function () {
    it('will do nothing to css text without :hover', () => {
      const cssText = 'body{color:white}';
      expect(adaptCssForReplay(cssText, cache)).toEqual(cssText);
    });

    it('can add hover class to css text', () => {
      const cssText = '.a:hover { color: white }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `.a:hover,
.a.\\:hover { color: white }`,
      );
    });

    it('can correctly add hover when in middle of selector', () => {
      const cssText = 'ul li a:hover img { color: white }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `ul li a:hover img,
ul li a.\\:hover img { color: white }`,
      );
    });

    it('can correctly add hover on multiline selector', () => {
      const cssText = `ul li.specified a:hover img,
ul li.multiline
b:hover
img,
ul li.specified c:hover img {
  color: white
}`;
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `ul li.specified a:hover img,
ul li.multiline
b:hover
img,
ul li.specified c:hover img,
ul li.specified a.\\:hover img,
ul li.multiline b.\\:hover img,
ul li.specified c.\\:hover img {
  color: white
}`,
      );
    });

    it('can add hover class within media query', () => {
      const cssText = '@media screen { .m:hover { color: white } }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `@media screen { .m:hover,
.m.\\:hover { color: white } }`,
      );
    });

    it('can add hover class when there is multi selector', () => {
      const cssText = '.a, .b:hover, .c { color: white }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `.a, .b:hover, .c,
.b.\\:hover { color: white }`,
      );
    });

    it('can add hover class when there is a multi selector with the same prefix', () => {
      const cssText = '.a:hover, .a:hover::after { color: white }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `.a:hover, .a:hover::after,
.a.\\:hover,
.a.\\:hover::after { color: white }`,
      );
    });

    it('can add hover class when :hover is not the end of selector', () => {
      const cssText = 'div:hover::after { color: white }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `div:hover::after,
div.\\:hover::after { color: white }`,
      );
    });

    it('can add hover class when the selector has multi :hover', () => {
      const cssText = 'a:hover b:hover { color: white }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        `a:hover b:hover,
a.\\:hover b.\\:hover { color: white }`,
      );
    });

    it('will ignore :hover in css value', () => {
      const cssText = '.a::after { content: ":hover" }';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        '.a::after { content: ":hover" }',
      );
    });

    it('can adapt media rules to replay context', () => {
      const cssText =
        '@media only screen and (min-device-width : 1200px) { .a { width: 10px; }}';
      expect(adaptCssForReplay(cssText, cache)).toEqual(
        '@media only screen and (min-width:1200px){.a{width:10px}}',
      );
    });

    it('should allow empty property value', () => {
      expect(adaptCssForReplay('p { color:; }', cache)).toEqual(
        'p { color:; }',
      );
    });

    it('should parse selector with comma nested inside ()', () => {
      expect(
        adaptCssForReplay(
          '[_nghost-ng-c4172599085]:not(.fit-content).aim-select:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--invalid, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--active) { border-color: rgb(84, 84, 84); }',
          cache,
        ),
      )
        .toEqual(`[_nghost-ng-c4172599085]:not(.fit-content).aim-select:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--invalid, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--active),
[_nghost-ng-c4172599085]:not(.fit-content).aim-select.\\:hover:not(:disabled, [_nghost-ng-c4172599085]:not(.fit-content).aim-select--disabled { border-color: rgb(84, 84, 84); }`);
    });

    it('parses nested commas in selectors correctly', () => {
      expect(
        adaptCssForReplay(
          'body > ul :is(li:not(:first-of-type) a:hover, li:not(:first-of-type).active a) { background: red; }',
          cache,
        ),
      ).toEqual(
        'body > ul :is(li:not(:first-of-type) a:hover, li:not(:first-of-type).active a) { background: red; }',
      );
    });

    it('ignores comma in string', () => {
      expect(
        adaptCssForReplay(
          'li[attr="has,comma"] a:hover { background-color: red; }',
          cache,
        ),
      ).toEqual(`li[attr="has,comma"] a:hover,
li[attr="has,comma"] a.\\:hover { background-color: red; }`);
    });

    // this benchmark is unreliable when run in parallel with other tests
    it.skip('benchmark', () => {
      const cssText = fs.readFileSync(
        path.resolve(__dirname, './css/benchmark.css'),
        'utf8',
      );
      const start = process.hrtime();
      adaptCssForReplay(cssText, cache);
      const end = process.hrtime(start);
      const duration = getDuration(end);
      expect(duration).toBeLessThan(100);
    });

    it('should be a lot faster to add a hover class to a previously processed css string', () => {
      const factor = 100;

      let cssText = fs.readFileSync(
        path.resolve(__dirname, './css/benchmark.css'),
        'utf8',
      );

      const start = process.hrtime();
      adaptCssForReplay(cssText, cache);
      const end = process.hrtime(start);

      const cachedStart = process.hrtime();
      adaptCssForReplay(cssText, cache);
      const cachedEnd = process.hrtime(cachedStart);

      expect(getDuration(cachedEnd) * factor).toBeLessThan(getDuration(end));
    });
  });
});
