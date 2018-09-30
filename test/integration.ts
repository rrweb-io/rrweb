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

  for (const html of htmls) {
    it('[html file]:' + html.filePath, () => {
      const dom = new JSDOM(html.content);
      const snap = snapshot(dom.window.document);
      const rebuildDom = rebuild(snap);
      const htmlStr = dom.window.document.documentElement.outerHTML
        .replace(/<script>(.|\n)*?<\/script>/g, '<script></script>')
        .replace(/<script(.*?)>/g, '<noscript$1>')
        .replace(/<\/script>/g, '</noscript>');
      expect((rebuildDom as Document).documentElement.outerHTML).to.equal(
        htmlStr,
      );
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

  it('will not throw error with invalid attribute', () => {
    const raw = `<html foo='bar' ''></html>`;
    const dom = new JSDOM(raw);
    expect(() => rebuild(snapshot(dom.window.document))).not.to.throw();
  });

  it('will inline text input value', () => {
    const raw = '<input type="text">';
    const dom = new JSDOM(raw);
    dom.window.document.querySelector('input').value = '1';
    const rebuildDom = rebuild(snapshot(dom.window.document));
    expect((rebuildDom as Document).querySelector('input').outerHTML).to.equal(
      '<input type="text" value="1">',
    );
  });

  it('will inline radio input value', () => {
    const raw = '<input type="radio">';
    const dom = new JSDOM(raw);
    dom.window.document.querySelector('input').checked = true;
    const rebuildDom = rebuild(snapshot(dom.window.document));
    expect((rebuildDom as Document).querySelector('input').outerHTML).to.equal(
      '<input type="radio" checked="">',
    );
  });

  it('will inline checkbox input value', () => {
    const raw = '<input type="checkbox">';
    const dom = new JSDOM(raw);
    dom.window.document.querySelector('input').checked = true;
    const rebuildDom = rebuild(snapshot(dom.window.document));
    expect((rebuildDom as Document).querySelector('input').outerHTML).to.equal(
      '<input type="checkbox" checked="">',
    );
  });

  it('will inline textarea value into text node', () => {
    const raw = '<textarea name="" id="" cols="30" rows="10"></textarea>';
    const dom = new JSDOM(raw);
    dom.window.document.querySelector('textarea').value = '1234';
    const rebuildDom = rebuild(snapshot(dom.window.document));
    expect(
      (rebuildDom as Document).querySelector('textarea').outerHTML,
    ).to.equal('<textarea name="" id="" cols="30" rows="10">1234</textarea>');
  });

  it('will inline options state', () => {
    const raw = `
<select name="" id="">
  <option value="1">1</option>
  <option value="2">2</option>
</select>
    `;
    const dom = new JSDOM(raw);
    dom.window.document.querySelector('select').value = '2';
    const rebuildDom = rebuild(snapshot(dom.window.document));
    expect((rebuildDom as Document).querySelector('select').outerHTML).to.equal(
      `<select name="" id="" value="2">
  <option value="1">1</option>
  <option value="2" selected="">2</option>
</select>`,
    );
  });
});
