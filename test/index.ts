import 'mocha';
import mochaDom = require('mocha-jsdom');
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { snapshot, rebuild } from '../src';

const htmlFolder = path.join(__dirname, 'html');
const htmls = fs.readdirSync(htmlFolder).map(filePath => {
  return {
    filePath,
    content: fs.readFileSync(path.resolve(htmlFolder, filePath), 'utf-8'),
  };
});

describe('integration tests', () => {
  mochaDom({ url: 'http://localhost' });

  it('will snapshot document type', () => {
    const raw = '<html></html>';
    const dom = new JSDOM(raw);
    const snap = snapshot(dom.window.document);
    expect(snap).to.deep.equal({
      type: 0,
      childNodes: [
        {
          type: 2,
          tagName: 'html',
          attributes: {},
          childNodes: [
            {
              type: 2,
              tagName: 'head',
              attributes: {},
              childNodes: [],
              id: 3,
            },
            {
              type: 2,
              tagName: 'body',
              attributes: {},
              childNodes: [],
              id: 4,
            },
          ],
          id: 2,
        },
      ],
      id: 1,
    });
  });

  it('will not throw error with invalid attribute', () => {
    const raw = `<html foo='bar' ''></html>`;
    const dom = new JSDOM(raw);
    expect(() => rebuild(snapshot(dom.window.document))).not.to.throw();
  });

  for (const html of htmls) {
    it('[html file]:' + html.filePath, () => {
      const dom = new JSDOM(html.content);
      const snap = snapshot(dom.window.document);
      const rebuildDom = rebuild(snap);
      expect((rebuildDom as Document).documentElement.outerHTML).to.equal(
        dom.window.document.documentElement.outerHTML,
      );
    });
  }
});
