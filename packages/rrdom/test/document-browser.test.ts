import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as rollup from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import * as typescript from 'rollup-plugin-typescript2';

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
  let browser: puppeteer.Browser;
  let code: string;
  beforeAll(async () => {
    browser = await puppeteer.launch();
    const bundle = await rollup.rollup({
      input: path.resolve(__dirname, '../src/document-browser.ts'),
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

  describe('create a RRDocument from a html document', () => {
    let page: puppeteer.Page;
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
        rrdom.buildFromDom(document,doc);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from an iframe html ', async () => {
      await page.setContent(getHtml('iframe.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document,doc);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });

    it('can build from a html containing nested shadow doms', async () => {
      await page.setContent(getHtml('shadow-dom.html'));
      const result = await page.evaluate(`
        const doc = new rrdom.RRDocument();
        rrdom.buildFromDom(document,doc);
        printRRDom(doc);
      `);
      expect(result).toMatchSnapshot();
    });
  });
});
function getHtml(fileName: string) {
  const filePath = path.resolve(__dirname, `./html/${fileName}`);
  return fs.readFileSync(filePath, 'utf8');
}
