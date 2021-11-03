/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import { RRDocument, RRElement } from '../src/document';
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
});

function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
