/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as rollup from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import * as typescript from 'rollup-plugin-typescript2';
import { NodeType } from 'rrweb-snapshot';
import {
  buildFromDom,
  RRCanvasElement,
  RRDocument,
  RRNode,
} from '../src/virtual-dom';

const _typescript = (typescript as unknown) as typeof typescript.default;
const printRRDomCode = `
/**
 * Print the RRDom as a string.
 * @param rootNode the root node of the RRDom tree
 * @returns printed string
 */
function printRRDom(rootNode) {
  return walk(rootNode, '');
}
function walk(node, blankSpace) {
  let printText = \`\${blankSpace}\${node.toString()}\n\`;
  if(node instanceof rrdom.RRElement && node.shadowRoot)
    printText += walk(node.shadowRoot, blankSpace + '  ');
  for (const child of node.childNodes)
    printText += walk(child, blankSpace + '  ');
  if (node instanceof rrdom.RRIFrameElement)
    printText += walk(node.contentDocument, blankSpace + '  ');
  return printText;
}
`;

describe('RRDocument for browser environment', () => {
  describe('create a RRDocument from a html document', () => {
    let browser: puppeteer.Browser;
    let code: string;
    let page: puppeteer.Page;

    beforeAll(async () => {
      browser = await puppeteer.launch();
      const bundle = await rollup.rollup({
        input: path.resolve(__dirname, '../src/virtual-dom.ts'),
        plugins: [
          resolve(),
          _typescript({
            tsconfigOverride: { compilerOptions: { module: 'ESNext' } },
          }),
        ],
      });
      const {
        output: [{ code: _code }],
      } = await bundle.generate({
        name: 'rrdom',
        format: 'iife',
      });
      code = _code;
    });
    afterAll(async () => {
      await browser.close();
    });

    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto('about:blank');
      await page.evaluate(code + printRRDomCode);
    });

    afterEach(async () => {
      await page.close();
    });
    it('can build from a common html', async () => {
      await page.setContent(getHtml('main.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document, doc, doc.mirror);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from an iframe html ', async () => {
      await page.setContent(getHtml('iframe.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document, doc, doc.mirror);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from a html containing nested shadow doms', async () => {
      await page.setContent(getHtml('shadow-dom.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document, doc, doc.mirror);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });
  });

  describe('RRDocument build for virtual dom', () => {
    it('can create a new RRDocument', () => {
      const dom = new RRDocument();
      const newDom = dom.createDocument('', '');
      expect(newDom).toBeInstanceOf(RRDocument);
    });

    it('can build a RRDocument from a real Dom', () => {
      const result = buildFromDom(document);
      expect(result.childNodes.length).toBe(2);
      expect(result.documentElement).toBeDefined();
      expect(result.head).toBeDefined();
      expect(result.head!.tagName).toBe('HEAD');
      expect(result.body).toBeDefined();
      expect(result.body!.tagName).toBe('BODY');
    });

    it('can destroy a RRDocument tree', () => {
      const dom = new RRDocument();
      const node1 = dom.createDocumentType('', '', '');
      dom.appendChild(node1);
      dom.mirror.map[0] = node1;
      const node2 = dom.createElement('html');
      dom.appendChild(node2);
      dom.mirror.map[1] = node2;
      expect(dom.childNodes.length).toEqual(2);
      expect(dom.mirror.has(0)).toBeTruthy();
      expect(dom.mirror.has(1)).toBeTruthy();

      dom.destroyTree();
      expect(dom.childNodes.length).toEqual(0);
      expect(dom.mirror.has(0)).toBeFalsy();
      expect(dom.mirror.has(1)).toBeFalsy();
    });

    it('can execute a dummy getContext function in RRCanvasElement', () => {
      const canvas = new RRCanvasElement('CANVAS');
      expect(canvas.getContext).toBeDefined();
      expect(canvas.getContext()).toBeNull();
    });

    describe('Mirror in the RRDocument', () => {
      it('should have a map to store id and node', () => {
        const dom = new RRDocument();
        expect(dom.mirror.map).toBeDefined();
        const node1 = dom.createElement('div');
        dom.mirror.map[0] = node1;
        const node2 = dom.createTextNode('text');
        dom.mirror.map[1] = node2;
        expect(dom.mirror.map[0]).toBe(node1);
        expect(dom.mirror.map[1]).toBe(node2);
        expect(dom.mirror.getNode(0)).toBe(node1);
        expect(dom.mirror.getNode(1)).toBe(node2);
        expect(dom.mirror.getNode(2)).toBeNull();
        expect(dom.mirror.getNode(-1)).toBeNull();
      });

      it('can get node id', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        node1.__sn = {
          type: NodeType.Element,
          tagName: 'div',
          childNodes: [],
          attributes: {},
          id: 0,
        };
        dom.mirror.map[0] = node1;
        expect(dom.mirror.getId(node1)).toEqual(0);
        const node2 = dom.createTextNode('text');
        expect(dom.mirror.getId(node2)).toEqual(-1);
        expect(dom.mirror.getId((null as unknown) as RRNode)).toEqual(-1);
      });

      it('has() should return whether the mirror has a node', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        dom.mirror.map[0] = node1;
        const node2 = dom.createTextNode('text');
        dom.mirror.map[1] = node2;
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeTruthy();
        expect(dom.mirror.has(2)).toBeFalsy();
        expect(dom.mirror.has(-1)).toBeFalsy();
      });

      it('can remove node from the mirror', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        dom.mirror.map[0] = node1;
        node1.__sn = {
          type: NodeType.Element,
          tagName: 'div',
          childNodes: [],
          attributes: {},
          id: 0,
        };
        const node2 = dom.createTextNode('text');
        node2.__sn = {
          type: NodeType.Text,
          textContent: 'text',
          id: 1,
        };
        node1.appendChild(node2);
        dom.mirror.map[1] = node2;
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeTruthy();
        dom.mirror.removeNodeFromMap(node2);
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeFalsy();

        dom.mirror.map[1] = node2;
        expect(dom.mirror.has(1)).toBeTruthy();
        // To remove node1 and its child node2 from the mirror.
        dom.mirror.removeNodeFromMap(node1);
        expect(dom.mirror.has(0)).toBeFalsy();
        expect(dom.mirror.has(1)).toBeFalsy();
      });

      it('can reset the mirror', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        dom.mirror.map[0] = node1;
        const node2 = dom.createTextNode('text');
        dom.mirror.map[1] = node2;
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeTruthy();

        dom.mirror.reset();
        expect(dom.mirror.has(0)).toBeFalsy();
        expect(dom.mirror.has(1)).toBeFalsy();
      });
    });
  });
});
function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
