/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import { RRDocument, RRElement, RRNode } from '../src/document';
import { printRRDom } from './util';

describe('RRDocument', () => {
  describe('buildFromDom', () => {
    it('should create an RRDocument from a html document', () => {
      // setup document
      document.write(getHtml('main.html'));

      // create RRDocument from document
      const rrdoc = new RRDocument();
      rrdoc.buildFromDom(document);
      expect(printRRDom(rrdoc)).toMatchSnapshot();
    });
  });

  describe('RRDocument API', () => {
    let rrdom: RRDocument;
    beforeAll(() => {
      // initialize rrdom
      document.write(getHtml('main.html'));
      rrdom = new RRDocument();
      rrdom.buildFromDom(document);
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
      expect(rrdom.firstElementChild.tagName).toEqual('HTML');

      const div1 = rrdom.getElementById('block1');
      expect(div1).toBeDefined();
      expect(div1!.firstElementChild).toBeDefined();
      expect(div1!.firstElementChild!.id).toEqual('block2');
      const div2 = div1!.firstElementChild;
      expect(div2!.firstElementChild!.id).toEqual('block3');
    });

    it('get nextElementSibling', () => {
      expect(rrdom.documentElement.firstElementChild).not.toBeNull();
      expect(rrdom.documentElement.firstElementChild!.tagName).toEqual('HEAD');
      expect(
        rrdom.documentElement.firstElementChild!.nextElementSibling,
      ).not.toBeNull();
      expect(
        rrdom.documentElement.firstElementChild!.nextElementSibling!.tagName,
      ).toEqual('BODY');
      expect(
        rrdom.documentElement.firstElementChild!.nextElementSibling!
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
        expect((element as RRElement).classList).toContain(':hover');
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
});

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
