/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import { RRDocument, RRElement, RRStyleElement } from '../src/document-nodejs';
import { buildFromDom } from '../src/virtual-dom';

describe('RRDocument for nodejs environment', () => {
  describe('RRDocument API', () => {
    let rrdom: RRDocument;
    beforeAll(() => {
      // initialize rrdom
      document.write(getHtml('main.html'));
      rrdom = new RRDocument();
      buildFromDom(document, rrdom);
    });

    it('get className', () => {
      expect(rrdom.getElementsByTagName('DIV')[0].className).toEqual(
        'blocks blocks1',
      );
      expect(rrdom.getElementsByTagName('DIV')[1].className).toEqual(
        'blocks blocks1 :hover',
      );
    });

    it('get id', () => {
      expect(rrdom.getElementsByTagName('DIV')[0].id).toEqual('block1');
      expect(rrdom.getElementsByTagName('DIV')[1].id).toEqual('block2');
      expect(rrdom.getElementsByTagName('DIV')[2].id).toEqual('block3');
    });

    it('get attribute name', () => {
      expect(
        rrdom.getElementsByTagName('DIV')[0].getAttribute('class'),
      ).toEqual('blocks blocks1');
      expect(
        rrdom.getElementsByTagName('dIv')[0].getAttribute('cLaSs'),
      ).toEqual('blocks blocks1');
      expect(rrdom.getElementsByTagName('DIV')[0].getAttribute('id')).toEqual(
        'block1',
      );
      expect(rrdom.getElementsByTagName('div')[0].getAttribute('iD')).toEqual(
        'block1',
      );
      expect(
        rrdom.getElementsByTagName('p')[0].getAttribute('class'),
      ).toBeNull();
    });

    it('get firstElementChild', () => {
      expect(rrdom.firstElementChild).toBeDefined();
      expect(rrdom.firstElementChild!.tagName).toEqual('HTML');

      const div1 = rrdom.getElementById('block1');
      expect(div1).toBeDefined();
      expect(div1!.firstElementChild).toBeDefined();
      expect(div1!.firstElementChild!.id).toEqual('block2');
      const div2 = div1!.firstElementChild;
      expect(div2!.firstElementChild!.id).toEqual('block3');
    });

    it('get nextElementSibling', () => {
      expect(rrdom.documentElement!.firstElementChild).not.toBeNull();
      expect(rrdom.documentElement!.firstElementChild!.tagName).toEqual('HEAD');
      expect(
        rrdom.documentElement!.firstElementChild!.nextElementSibling,
      ).not.toBeNull();
      expect(
        rrdom.documentElement!.firstElementChild!.nextElementSibling!.tagName,
      ).toEqual('BODY');
      expect(
        rrdom.documentElement!.firstElementChild!.nextElementSibling!
          .nextElementSibling,
      ).toBeNull();

      expect(rrdom.getElementsByTagName('h1').length).toEqual(2);
      const element1 = rrdom.getElementsByTagName('h1')[0];
      const element2 = rrdom.getElementsByTagName('h1')[1];
      expect(element1.tagName).toEqual('H1');
      expect(element2.tagName).toEqual('H1');
      expect(element1.nextElementSibling).toEqual(element2);
      expect(element2.nextElementSibling).not.toBeNull();
      expect(element2.nextElementSibling!.id).toEqual('block1');
      expect(element2.nextElementSibling!.nextElementSibling).toBeNull();
    });

    it('getElementsByTagName', () => {
      for (let tagname of [
        'HTML',
        'BODY',
        'HEAD',
        'STYLE',
        'META',
        'TITLE',
        'SCRIPT',
        'LINK',
        'DIV',
        'H1',
        'P',
        'BUTTON',
        'IMG',
        'CANVAS',
      ]) {
        const expectedResult = document.getElementsByTagName(tagname).length;
        expect(rrdom.getElementsByTagName(tagname).length).toEqual(
          expectedResult,
        );
        expect(
          rrdom.getElementsByTagName(tagname.toLowerCase()).length,
        ).toEqual(expectedResult);
        for (let node of rrdom.getElementsByTagName(tagname)) {
          expect(node.tagName).toEqual(tagname);
        }
      }
    });

    it('getElementsByClassName', () => {
      for (let className of [
        'blocks',
        'blocks1',
        ':hover',
        'blocks1 blocks',
        'blocks blocks1',
        ':hover blocks1',
        ':hover blocks1 blocks',
        ':hover blocks1 block',
      ]) {
        const msg = `queried class name: '${className}'`;
        expect({
          message: msg,
          result: rrdom.getElementsByClassName(className).length,
        }).toEqual({
          message: msg,
          result: document.getElementsByClassName(className).length,
        });
      }
    });

    it('getElementById', () => {
      for (let elementId of ['block1', 'block2', 'block3']) {
        expect(rrdom.getElementById(elementId)).not.toBeNull();
        expect(rrdom.getElementById(elementId)!.id).toEqual(elementId);
      }
      for (let elementId of ['block', 'blocks', 'blocks1'])
        expect(rrdom.getElementById(elementId)).toBeNull();
    });

    it('querySelectorAll querying tag name', () => {
      expect(rrdom.querySelectorAll('H1')).toHaveLength(2);
      expect(rrdom.querySelectorAll('H1')[0]).toBeInstanceOf(RRElement);
      expect((rrdom.querySelectorAll('H1')[0] as RRElement).tagName).toEqual(
        'H1',
      );
      expect(rrdom.querySelectorAll('H1')[1]).toBeInstanceOf(RRElement);
      expect((rrdom.querySelectorAll('H1')[1] as RRElement).tagName).toEqual(
        'H1',
      );
    });

    it('querySelectorAll querying class name', () => {
      for (let className of [
        '.blocks',
        '.blocks1',
        '.\\:hover',
        '.blocks1.blocks',
        '.blocks.blocks1',
        '.\\:hover.blocks1',
        '.\\:hover.blocks1.blocks',
        '.\\:hover.blocks1.block',
      ]) {
        const msg = `queried class name: '${className}'`;
        expect({
          message: msg,
          result: rrdom.querySelectorAll(className).length,
        }).toEqual({
          message: msg,
          result: document.querySelectorAll(className).length,
        });
      }
      for (let element of rrdom.querySelectorAll('.\\:hover')) {
        expect(element).toBeInstanceOf(RRElement);
        expect((element as RRElement).classList.classes).toContain(':hover');
      }
    });

    it('querySelectorAll querying id', () => {
      for (let query of ['#block1', '#block2', '#block3']) {
        expect(rrdom.querySelectorAll(query).length).toEqual(1);
        const targetElement = rrdom.querySelectorAll(query)[0] as RRElement;
        expect(targetElement.id).toEqual(query.substring(1, query.length));
      }
      for (let query of ['#block', '#blocks', '#block1#block2'])
        expect(rrdom.querySelectorAll(query).length).toEqual(0);
    });

    it('querySelectorAll', () => {
      expect(rrdom.querySelectorAll('link[rel="stylesheet"]').length).toEqual(
        1,
      );
      const targetLink = rrdom.querySelectorAll(
        'link[rel="stylesheet"]',
      )[0] as RRElement;
      expect(targetLink.tagName).toEqual('LINK');
      expect(targetLink.getAttribute('rel')).toEqual('stylesheet');

      expect(rrdom.querySelectorAll('.blocks#block1').length).toEqual(1);
      expect(rrdom.querySelectorAll('.blocks#block3').length).toEqual(0);
    });

    it('can get CSS style declaration', () => {
      const node = rrdom.createElement('div');
      const style = node.style;
      expect(style).toBeDefined();
      expect(style.setProperty).toBeDefined();
      expect(style.removeProperty).toBeDefined();

      node.attributes.style =
        'color: blue; background-color: red; width: 78%; height: 50vh !important;';
      expect(node.style.color).toBe('blue');
      expect(node.style.backgroundColor).toBe('red');
      expect(node.style.width).toBe('78%');
      expect(node.style.height).toBe('50vh');
    });

    it('can set CSS property', () => {
      const node = rrdom.createElement('div');
      const style = node.style;
      style.setProperty('color', 'red');
      expect(node.attributes.style).toEqual('color: red;');
      // camelCase style is unacceptable
      style.setProperty('backgroundColor', 'blue');
      expect(node.attributes.style).toEqual('color: red;');
      style.setProperty('height', '50vh', 'important');
      expect(node.attributes.style).toEqual(
        'color: red; height: 50vh !important;',
      );

      // kebab-case
      style.setProperty('background-color', 'red');
      expect(node.attributes.style).toEqual(
        'color: red; height: 50vh !important; background-color: red;',
      );

      // remove the property
      style.setProperty('background-color', null);
      expect(node.attributes.style).toEqual(
        'color: red; height: 50vh !important;',
      );
    });

    it('can remove CSS property', () => {
      const node = rrdom.createElement('div');
      node.attributes.style =
        'color: blue; background-color: red; width: 78%; height: 50vh;';
      const style = node.style;
      expect(style.removeProperty('color')).toEqual('blue');
      expect(node.attributes.style).toEqual(
        'background-color: red; width: 78%; height: 50vh;',
      );
      expect(style.removeProperty('height')).toEqual('50vh');
      expect(node.attributes.style).toEqual(
        'background-color: red; width: 78%;',
      );
      // kebab-case
      expect(style.removeProperty('background-color')).toEqual('red');
      expect(node.attributes.style).toEqual('width: 78%;');
      style.setProperty('background-color', 'red');
      expect(node.attributes.style).toEqual(
        'width: 78%; background-color: red;',
      );
      expect(style.removeProperty('backgroundColor')).toEqual('');
      expect(node.attributes.style).toEqual(
        'width: 78%; background-color: red;',
      );
      // remove a non-exist property
      expect(style.removeProperty('margin')).toEqual('');
    });

    it('can parse more inline styles correctly', () => {
      const node = rrdom.createElement('div');
      // general
      node.attributes.style =
        'display: inline-block;   margin:    0 auto; border: 5px solid #BADA55; font-size: .75em; position:absolute;width: 33.3%; z-index:1337; font-family: "Goudy Bookletter 1911", Gill Sans Extrabold, sans-serif;';

      const style = node.style;
      expect(style.display).toEqual('inline-block');
      expect(style.margin).toEqual('0px auto');
      expect(style.border).toEqual('5px solid #bada55');
      expect(style.fontSize).toEqual('.75em');
      expect(style.position).toEqual('absolute');
      expect(style.width).toEqual('33.3%');
      expect(style.zIndex).toEqual('1337');
      expect(style.fontFamily).toEqual(
        '"Goudy Bookletter 1911", Gill Sans Extrabold, sans-serif',
      );

      // multiple of same property
      node.attributes.style = 'color:rgba(0,0,0,1);color:white';
      expect(style.color).toEqual('white');

      // url
      node.attributes.style =
        'background-image: url("http://example.com/img.png")';
      expect(node.style.backgroundImage).toEqual(
        'url(http://example.com/img.png)',
      );

      // comment
      node.attributes.style = 'top: 0; /* comment */ bottom: 42rem;';
      expect(node.style.top).toEqual('0px');
      expect(node.style.bottom).toEqual('42rem');

      // incomplete
      node.attributes.style = 'overflow:';
      expect(node.style.overflow).toEqual('');
    });

    it('style element', () => {
      expect(rrdom.getElementsByTagName('style').length).not.toEqual(0);
      expect(rrdom.getElementsByTagName('style')[0].tagName).toEqual('STYLE');
      const styleElement = rrdom.getElementsByTagName(
        'style',
      )[0] as RRStyleElement;
      expect(styleElement.sheet).toBeDefined();
      expect(styleElement.sheet!.cssRules).toBeDefined();
      expect(styleElement.sheet!.cssRules.length).toEqual(5);
      const rules = styleElement.sheet!.cssRules;
      expect(rules[0].cssText).toEqual(`h1 {color: 'black';}`);
      expect(rules[1].cssText).toEqual(`.blocks {padding: 0;}`);
      expect(rules[2].cssText).toEqual(`.blocks1 {margin: 0;}`);
      expect(rules[3].cssText).toEqual(
        `#block1 {width: 100px; height: 200px;}`,
      );
      expect(rules[4].cssText).toEqual(`@import url(main.css);`);
      expect((rules[4] as CSSImportRule).href).toEqual('main.css');

      expect(styleElement.sheet!.insertRule).toBeDefined();
      const newRule = "p {color: 'black';}";
      styleElement.sheet!.insertRule(newRule, 5);
      expect(rules[5].cssText).toEqual(newRule);

      expect(styleElement.sheet!.deleteRule).toBeDefined();
      styleElement.sheet!.deleteRule(5);
      expect(rules[5]).toBeUndefined();
      expect(rules[4].cssText).toEqual(`@import url(main.css);`);
    });
  });
});

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
