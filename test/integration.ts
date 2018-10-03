import 'mocha';
import mochaDom = require('mocha-jsdom');
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
import { snapshot, rebuild } from '../src';

const htmlFolder = path.join(__dirname, 'html');
const htmls = fs.readdirSync(htmlFolder).map(filePath => {
  const raw = fs.readFileSync(path.resolve(htmlFolder, filePath), 'utf-8');
  if (/<!-- TEST_DIVIDER -->/.test(raw)) {
    const [src, dest] = raw.split('<!-- TEST_DIVIDER -->');
    return {
      filePath,
      src,
      dest,
    };
  }
  return {
    filePath,
    src: raw,
    dest: raw,
  };
});

describe('integration tests', () => {
  mochaDom({ url: 'http://localhost' });

  for (const html of htmls) {
    it('[html file]: ' + html.filePath, done => {
      const srcDom = new JSDOM(html.src, { runScripts: 'dangerously' });
      const destDom = new JSDOM(html.dest);
      srcDom.window.document.addEventListener('DOMContentLoaded', () => {
        const snap = snapshot(srcDom.window.document);
        const rebuildDom = rebuild(snap);
        const htmlStr = destDom.window.document.documentElement.outerHTML.replace(
          /\n\n/g,
          '',
        );
        const rebuildStr = (rebuildDom as Document).documentElement.outerHTML.replace(
          /\n\n/g,
          '',
        );
        try {
          expect(rebuildStr).to.equal(htmlStr);
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  }

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
});
