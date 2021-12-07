/**
 * @jest-environment jsdom
 */

import { RRDocument, RRElement } from '../src/document';

describe('RRDocument', () => {
  describe('buildFromDom', () => {
    it('should create an RRDocument from a html document', () => {
      // setup document
      document.write('<html><body><button /></body></html>');

      // create RRDocument from document
      const rrdoc = new RRDocument();
      rrdoc.buildFromDom(document);

      // get children
      const html = rrdoc.children[0];
      const body = html.children[1];
      const button = body.children[0] as RRElement;

      expect(button.tagName).toBe('BUTTON');
    });
  });
});
