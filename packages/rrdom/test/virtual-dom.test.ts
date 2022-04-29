/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as rollup from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import * as typescript from 'rollup-plugin-typescript2';
import { JSDOM } from 'jsdom';
import { Mirror, NodeType, NodeType as RRNodeType } from 'rrweb-snapshot';
import {
  buildFromDom,
  buildFromNode,
  RRCanvasElement,
  RRDocument,
  RRElement,
  RRNode,
} from '../src/virtual-dom';
import { setDefaultSN } from '../src/document';

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
  let mirror: Mirror;
  beforeEach(() => {
    mirror = new Mirror();
  });

  describe('create a RRNode from a real Node', () => {
    it('should support quicksmode documents', () => {
      // seperate jsdom document as changes to the document would otherwise bleed into other tests
      const dom = new JSDOM();
      const document = dom.window.document;

      expect(document.doctype).toBeNull(); // confirm compatMode is 'BackCompat' in JSDOM

      const rrdom = new RRDocument();
      let rrNode = buildFromNode(document, rrdom, mirror)!;

      expect((rrNode as RRDocument).compatMode).toBe('BackCompat');
    });

    it('can patch serialized ID for an unserialized node', () => {
      // build from document
      expect(mirror.getMeta(document)).toBeNull();
      const rrdom = new RRDocument();
      let rrNode = buildFromNode(document, rrdom, mirror)!;
      expect(mirror.getMeta(document)).toBeDefined();
      expect(mirror.getId(document)).toEqual(-1);
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.Document);
      expect(rrNode.__sn.id).toEqual(-1);
      expect(rrNode).toBe(rrdom);

      // build from document type
      expect(mirror.getMeta(document.doctype!)).toBeNull();
      rrNode = buildFromNode(document.doctype!, rrdom, mirror)!;
      expect(mirror.getMeta(document.doctype!)).toBeDefined();
      expect(mirror.getId(document.doctype)).toEqual(-1);
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.DocumentType);
      expect(rrNode.__sn.id).toEqual(-2);

      // build from element
      expect(mirror.getMeta(document.documentElement)).toBeNull();
      rrNode = buildFromNode(
        (document.documentElement as unknown) as Node,
        rrdom,
        mirror,
      )!;
      expect(mirror.getMeta(document.documentElement)).toBeDefined();
      expect(mirror.getId(document.documentElement)).toEqual(-1);
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.Element);
      expect(rrNode.__sn.id).toEqual(-3);

      // build from text
      const text = document.createTextNode('text');
      expect(mirror.getMeta(text)).toBeNull();
      rrNode = buildFromNode(text, rrdom, mirror)!;
      expect(mirror.getMeta(text)).toBeDefined();
      expect(mirror.getId(text)).toEqual(-1);
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.Text);
      expect(rrNode.__sn.id).toEqual(-4);

      // build from comment
      const comment = document.createComment('comment');
      expect(mirror.getMeta(comment)).toBeNull();
      rrNode = buildFromNode(comment, rrdom, mirror)!;
      expect(mirror.getMeta(comment)).toBeDefined();
      expect(mirror.getId(comment)).toEqual(-1);
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.Comment);
      expect(rrNode.__sn.id).toEqual(-5);

      // build from CDATASection
      const xmlDoc = new DOMParser().parseFromString(
        '<xml></xml>',
        'application/xml',
      );
      const cdata = 'Some <CDATA> data & then some';
      var cdataSection = xmlDoc.createCDATASection(cdata);
      expect(mirror.getMeta(cdataSection)).toBeNull();
      expect(mirror.getMeta(cdataSection)).toBeNull();
      rrNode = buildFromNode(cdataSection, rrdom, mirror)!;
      expect(mirror.getMeta(cdataSection)).toBeDefined();
      expect(mirror.getId(cdataSection)).toEqual(-1);
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.CDATA);
      expect(rrNode.textContent).toEqual(cdata);
      expect(rrNode.__sn.id).toEqual(-6);
    });

    it('can record scroll position from HTMLElements', () => {
      expect(document.body.scrollLeft).toEqual(0);
      expect(document.body.scrollTop).toEqual(0);
      const rrdom = new RRDocument();
      let rrNode = buildFromNode(document.body, rrdom, mirror)!;
      expect((rrNode as RRElement).scrollLeft).toBeUndefined();
      expect((rrNode as RRElement).scrollTop).toBeUndefined();

      document.body.scrollLeft = 100;
      document.body.scrollTop = 200;
      expect(document.body.scrollLeft).toEqual(100);
      expect(document.body.scrollTop).toEqual(200);
      rrNode = buildFromNode(document.body, rrdom, mirror)!;
      expect((rrNode as RRElement).scrollLeft).toEqual(100);
      expect((rrNode as RRElement).scrollTop).toEqual(200);
    });

    it('can build contentDocument from an iframe element', () => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      expect(iframe.contentDocument).not.toBeNull();
      const rrdom = new RRDocument();
      const RRIFrame = rrdom.createElement('iframe');
      const rrNode = buildFromNode(
        iframe.contentDocument!,
        rrdom,
        mirror,
        RRIFrame,
      )!;
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.type).toEqual(RRNodeType.Document);
      expect(rrNode.__sn.id).toEqual(-1);
      expect(mirror.getId(iframe.contentDocument)).toEqual(-1);
      expect(rrNode).toBe(RRIFrame.contentDocument);
    });

    it('can build from a shadow dom', () => {
      const div = document.createElement('div');
      div.attachShadow({ mode: 'open' });
      expect(div.shadowRoot).toBeDefined();
      const rrdom = new RRDocument();
      const parentRRNode = rrdom.createElement('div');
      const rrNode = buildFromNode(
        div.shadowRoot!,
        rrdom,
        mirror,
        parentRRNode,
      )!;
      expect(rrNode).not.toBeNull();
      expect(rrNode.__sn).toBeDefined();
      expect(rrNode.__sn.id).toEqual(-1);
      expect(mirror.getId(div.shadowRoot)).toEqual(-1);
      expect(rrNode.RRNodeType).toEqual(RRNodeType.Element);
      expect((rrNode as RRElement).tagName).toEqual('SHADOWROOT');
      expect(rrNode).toBe(parentRRNode.shadowRoot);
    });
  });

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
        rrdom.buildFromDom(document, undefined, doc);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from an iframe html ', async () => {
      await page.setContent(getHtml('iframe.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document, undefined, doc);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from a html containing nested shadow doms', async () => {
      await page.setContent(getHtml('shadow-dom.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document, undefined, doc);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from a xml page', async () => {
      const result = await page.evaluate(`
      var docu = new DOMParser().parseFromString('<xml></xml>', 'application/xml');
      var cdata = docu.createCDATASection('Some <CDATA> data & then some');
      docu.getElementsByTagName('xml')[0].appendChild(cdata);
      // Displays: <xml><![CDATA[Some <CDATA> data & then some]]></xml>

      const doc = new rrdom.RRDocument();
      rrdom.buildFromDom(docu, undefined, doc);
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
      const result = buildFromDom(document, mirror);
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
      dom.mirror.add(node1, {
        id: 0,
        type: NodeType.DocumentType,
        name: '',
        publicId: '',
        systemId: '',
      });
      const node2 = dom.createElement('html');
      dom.appendChild(node2);
      dom.mirror.add(node1, {
        id: 1,
        type: NodeType.Document,
        childNodes: [],
      });

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
      it('should have a mirror to store id and node', () => {
        const dom = new RRDocument();
        expect(dom.mirror).toBeDefined();
        const node1 = dom.createElement('div');
        dom.mirror.add(node1, node1.getDefaultSN(0));

        const node2 = dom.createTextNode('text');
        dom.mirror.add(node2, node2.getDefaultSN(1));

        expect(dom.mirror.getNode(0)).toBe(node1);
        expect(dom.mirror.getNode(1)).toBe(node2);
        expect(dom.mirror.getNode(2)).toBeNull();
        expect(dom.mirror.getNode(-1)).toBeNull();
      });

      it('can get node id', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        setDefaultSN(node1, 0, dom.mirror);

        expect(dom.mirror.getId(node1)).toEqual(0);
        const node2 = dom.createTextNode('text');
        expect(dom.mirror.getId(node2)).toEqual(-1);
        expect(dom.mirror.getId((null as unknown) as RRNode)).toEqual(-1);
      });

      it('has() should return whether the mirror has a node', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        dom.mirror.add(node1, node1.getDefaultSN(0));
        const node2 = dom.createTextNode('text');
        dom.mirror.add(node2, node2.getDefaultSN(1));
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeTruthy();
        expect(dom.mirror.has(2)).toBeFalsy();
        expect(dom.mirror.has(-1)).toBeFalsy();
      });

      it('can remove node from the mirror', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        setDefaultSN(node1, 0, dom.mirror);
        const node2 = dom.createTextNode('text');
        node2.setDefaultSN(1);
        node1.appendChild(node2);
        dom.mirror.add(node2, node2.getDefaultSN(1));
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeTruthy();
        dom.mirror.removeNodeFromMap(node2);
        expect(dom.mirror.has(0)).toBeTruthy();
        expect(dom.mirror.has(1)).toBeFalsy();

        dom.mirror.add(node2, node2.getDefaultSN(1));
        expect(dom.mirror.has(1)).toBeTruthy();
        // To remove node1 and its child node2 from the mirror.
        dom.mirror.removeNodeFromMap(node1);
        expect(dom.mirror.has(0)).toBeFalsy();
        expect(dom.mirror.has(1)).toBeFalsy();
      });

      it('can reset the mirror', () => {
        const dom = new RRDocument();
        const node1 = dom.createElement('div');
        dom.mirror.add(node1, node1.getDefaultSN(0));
        const node2 = dom.createTextNode('text');
        dom.mirror.add(node2, node2.getDefaultSN(1));
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
