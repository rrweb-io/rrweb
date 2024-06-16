/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NodeType as RRNodeType } from '@saola.ai/rrweb-snapshot';
import {
  RRCanvasElement,
  RRCDATASection,
  RRComment,
  RRDocument,
  RRElement,
  RRIFrameElement,
  RRImageElement,
  RRMediaElement,
  RRStyleElement,
  RRText,
} from '../src/document-nodejs';
import { buildFromDom } from '@saola.ai/rrdom';

describe('RRDocument for nodejs environment', () => {
  describe('RRDocument API', () => {
    let rrdom: RRDocument;
    beforeAll(() => {
      // initialize rrdom
      document.write(getHtml('main.html'));
      rrdom = new RRDocument();
      buildFromDom(document, undefined, rrdom);
    });

    it('can create different type of RRNodes', () => {
      const document = rrdom.createDocument('', '');
      expect(document).toBeInstanceOf(RRDocument);
      const audio = rrdom.createElement('audio');
      expect(audio).toBeInstanceOf(RRMediaElement);
      const video = rrdom.createElement('video');
      expect(video).toBeInstanceOf(RRMediaElement);
      const iframe = rrdom.createElement('iframe');
      expect(iframe).toBeInstanceOf(RRIFrameElement);
      const image = rrdom.createElement('img');
      expect(image).toBeInstanceOf(RRImageElement);
      const canvas = rrdom.createElement('canvas');
      expect(canvas).toBeInstanceOf(RRCanvasElement);
      const style = rrdom.createElement('style');
      expect(style).toBeInstanceOf(RRStyleElement);
      const elementNS = rrdom.createElementNS(
        'http://www.w3.org/2000/svg',
        'div',
      );
      expect(elementNS).toBeInstanceOf(RRElement);
      expect(elementNS.tagName).toEqual('DIV');
      const text = rrdom.createTextNode('text');
      expect(text).toBeInstanceOf(RRText);
      expect(text.textContent).toEqual('text');
      const comment = rrdom.createComment('comment');
      expect(comment).toBeInstanceOf(RRComment);
      expect(comment.textContent).toEqual('comment');
      const CDATA = rrdom.createCDATASection('data');
      expect(CDATA).toBeInstanceOf(RRCDATASection);
      expect(CDATA.data).toEqual('data');
    });

    it('can get head element', () => {
      expect(rrdom.head).toBeDefined();
      expect(rrdom.head!.tagName).toBe('HEAD');
      expect(rrdom.head!.parentElement).toBe(rrdom.documentElement);
    });

    it('can get body element', () => {
      expect(rrdom.body).toBeDefined();
      expect(rrdom.body!.tagName).toBe('BODY');
      expect(rrdom.body!.parentElement).toBe(rrdom.documentElement);
    });

    it('can get implementation', () => {
      expect(rrdom.implementation).toBeDefined();
      expect(rrdom.implementation).toBe(rrdom);
    });

    it('can insert elements', () => {
      expect(() =>
        rrdom.insertBefore(rrdom.createDocumentType('', '', ''), null),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one RRDoctype on RRDocument allowed.]`,
      );
      expect(() =>
        rrdom.insertBefore(rrdom.createElement('div'), null),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one RRElement on RRDocument allowed.]`,
      );
      const node = new RRDocument();
      const doctype = rrdom.createDocumentType('', '', '');
      const documentElement = node.createElement('html');
      node.insertBefore(documentElement, null);
      node.insertBefore(doctype, documentElement);
      expect(node.childNodes.length).toEqual(2);
      expect(node.childNodes[0]).toBe(doctype);
      expect(node.childNodes[1]).toBe(documentElement);
      expect(node.documentElement).toBe(documentElement);
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
        'FORM',
        'INPUT',
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
      const node = new RRDocument();
      expect(node.getElementsByTagName('h2').length).toEqual(0);
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
      const node = new RRDocument();
      expect(node.getElementsByClassName('block').length).toEqual(0);
    });

    it('getElementById', () => {
      for (let elementId of ['block1', 'block2', 'block3']) {
        expect(rrdom.getElementById(elementId)).not.toBeNull();
        expect(rrdom.getElementById(elementId)!.id).toEqual(elementId);
      }
      for (let elementId of ['block', 'blocks', 'blocks1'])
        expect(rrdom.getElementById(elementId)).toBeNull();
      const node = new RRDocument();
      expect(node.getElementById('id')).toBeNull();
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
  });

  describe('RRElement API', () => {
    let rrdom: RRDocument;
    beforeAll(() => {
      // initialize rrdom
      document.write(getHtml('main.html'));
      rrdom = new RRDocument();
      buildFromDom(document, undefined, rrdom);
    });

    it('can get attribute', () => {
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

    it('can set attribute', () => {
      const node = rrdom.createElement('div');
      expect(node.getAttribute('class')).toEqual(null);
      node.setAttribute('class', 'className');
      expect(node.getAttribute('cLass')).toEqual('className');
      expect(node.getAttribute('iD')).toEqual(null);
      node.setAttribute('iD', 'id');
      expect(node.getAttribute('id')).toEqual('id');
    });

    it('can remove attribute', () => {
      const node = rrdom.createElement('div');
      node.setAttribute('Class', 'className');
      expect(node.getAttribute('class')).toEqual('className');
      node.removeAttribute('clAss');
      expect(node.getAttribute('class')).toEqual(null);
      node.removeAttribute('Id');
      expect(node.getAttribute('id')).toEqual(null);
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

      const node = rrdom.createElement('div');
      expect(node.nextElementSibling).toBeNull();
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
      node.attributes.style =
        'top: 0; /* comment1 */ bottom: /* comment2 */42rem;';
      expect(node.style.top).toEqual('0px');
      expect(node.style.bottom).toEqual('42rem');
      // empty comment
      node.attributes.style = 'top: /**/0;';
      expect(node.style.top).toEqual('0px');

      // incomplete
      node.attributes.style = 'overflow:';
      expect(node.style.overflow).toEqual('');
    });

    it('querySelectorAll', () => {
      const element = rrdom.getElementById('block2')!;
      expect(element).toBeDefined();
      expect(element.id).toEqual('block2');

      const result = element.querySelectorAll('div');
      expect(result.length).toBe(1);
      expect((result[0]! as RRElement).tagName).toEqual('DIV');
      expect(element.querySelectorAll('.blocks').length).toEqual(0);

      const element2 = rrdom.getElementById('block1')!;
      expect(element2).toBeDefined();
      expect(element2.id).toEqual('block1');
      expect(element2.querySelectorAll('div').length).toEqual(2);
      expect(element2.querySelectorAll('.blocks').length).toEqual(1);
    });

    it('can attach shadow dom', () => {
      const node = rrdom.createElement('div');
      expect(node.shadowRoot).toBeNull();
      node.attachShadow({ mode: 'open' });
      expect(node.shadowRoot).not.toBeNull();
      expect(node.shadowRoot!.RRNodeType).toBe(RRNodeType.Element);
      expect(node.shadowRoot!.tagName).toBe('SHADOWROOT');
      expect(node.parentNode).toBeNull();
    });

    it('can insert new child before an existing child', () => {
      const node = rrdom.createElement('div');
      const child1 = rrdom.createElement('h1');
      const child2 = rrdom.createElement('h2');
      expect(() =>
        node.insertBefore(node, child1),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.]`,
      );
      expect(node.insertBefore(child1, null)).toBe(child1);
      expect(node.childNodes[0]).toBe(child1);
      expect(child1.parentNode).toBe(node);
      expect(child1.parentElement).toBe(node);

      expect(node.insertBefore(child2, child1)).toBe(child2);
      expect(node.childNodes.length).toBe(2);
      expect(node.childNodes[0]).toBe(child2);
      expect(node.childNodes[1]).toBe(child1);
      expect(child2.parentNode).toBe(node);
      expect(child2.parentElement).toBe(node);
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

    it('can create an RRIframeElement', () => {
      const iframe = rrdom.createElement('iframe');
      expect(iframe.tagName).toEqual('IFRAME');
      expect(iframe.width).toEqual('');
      expect(iframe.height).toEqual('');
      expect(iframe.contentDocument).toBeDefined();
      expect(iframe.contentDocument!.childNodes.length).toBe(1);
      expect(iframe.contentDocument!.documentElement).toBeDefined();
      expect(iframe.contentDocument!.head).toBeDefined();
      expect(iframe.contentDocument!.body).toBeDefined();
      expect(iframe.contentWindow).toBeDefined();
      expect(iframe.contentWindow!.scrollTop).toEqual(0);
      expect(iframe.contentWindow!.scrollLeft).toEqual(0);
      expect(iframe.contentWindow!.scrollTo).toBeDefined();

      // empty parameter and did nothing
      iframe.contentWindow!.scrollTo();
      expect(iframe.contentWindow!.scrollTop).toEqual(0);
      expect(iframe.contentWindow!.scrollLeft).toEqual(0);

      iframe.contentWindow!.scrollTo({ top: 10, left: 20 });
      expect(iframe.contentWindow!.scrollTop).toEqual(10);
      expect(iframe.contentWindow!.scrollLeft).toEqual(20);
    });

    it('should have a RRCanvasElement', () => {
      const canvas = rrdom.createElement('canvas');
      expect(canvas.getContext()).toBeNull();
    });
  });
});

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `../../rrdom/test/html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
