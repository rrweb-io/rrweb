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
    });

    it('get attribute name', () => {
      expect(
        rrdom.getElementsByTagName('DIV')[0].getAttribute('class'),
      ).toEqual('blocks blocks1');
      expect(rrdom.getElementsByTagName('DIV')[0].getAttribute('id')).toEqual(
        'block1',
      );
    });

    it('querySelectorAll', () => {
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
  });
});

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
