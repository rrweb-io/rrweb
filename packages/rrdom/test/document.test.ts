/**
 * @jest-environment jsdom
 */
import { NodeType as RRNodeType } from '@saola.ai/rrweb-types';
import {
  BaseRRDocument,
  BaseRRDocumentType,
  BaseRRMediaElement,
  BaseRRNode,
  IRRDocumentType,
  IRRNode,
} from '../src/document';

describe('Basic RRDocument implementation', () => {
  const RRNode = class extends BaseRRNode {
    public textContent: string | null;
  };
  const RRDocument = BaseRRDocument;
  const RRDocumentType = BaseRRDocumentType;
  class RRMediaElement extends BaseRRMediaElement {}

  describe('Basic RRNode implementation', () => {
    it('should have basic properties', () => {
      const node = new RRNode();
      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBeUndefined();
      expect(node.textContent).toBeUndefined();
      expect(node.RRNodeType).toBeUndefined();
      expect(node.nodeType).toBeUndefined();
      expect(node.nodeName).toBeUndefined();
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.toString()).toEqual('RRNode');
    });

    it('can get and set first child node', () => {
      const parentNode = new RRNode();
      const childNode1 = new RRNode();
      expect(parentNode.firstChild).toBeNull();
      parentNode.firstChild = childNode1;
      expect(parentNode.firstChild).toBe(childNode1);
      parentNode.firstChild = null;
      expect(parentNode.firstChild).toBeNull();
    });

    it('can get and set last child node', () => {
      const parentNode = new RRNode();
      const childNode1 = new RRNode();
      expect(parentNode.lastChild).toBeNull();
      parentNode.lastChild = childNode1;
      expect(parentNode.lastChild).toBe(childNode1);
      parentNode.lastChild = null;
      expect(parentNode.lastChild).toBeNull();
    });

    it('can get and set preSibling', () => {
      const node1 = new RRNode();
      const node2 = new RRNode();
      expect(node1.previousSibling).toBeNull();
      node1.previousSibling = node2;
      expect(node1.previousSibling).toBe(node2);
      node1.previousSibling = null;
      expect(node1.previousSibling).toBeNull();
    });

    it('can get and set nextSibling', () => {
      const node1 = new RRNode();
      const node2 = new RRNode();
      expect(node1.nextSibling).toBeNull();
      node1.nextSibling = node2;
      expect(node1.nextSibling).toBe(node2);
      node1.nextSibling = null;
      expect(node1.nextSibling).toBeNull();
    });

    it('can get childNodes', () => {
      const parentNode = new RRNode();
      expect(parentNode.childNodes).toBeInstanceOf(Array);
      expect(parentNode.childNodes.length).toBe(0);

      const childNode1 = new RRNode();
      parentNode.firstChild = childNode1;
      parentNode.lastChild = childNode1;
      expect(parentNode.childNodes).toEqual([childNode1]);

      const childNode2 = new RRNode();
      parentNode.lastChild = childNode2;
      childNode1.nextSibling = childNode2;
      childNode2.previousSibling = childNode1;
      expect(parentNode.childNodes).toEqual([childNode1, childNode2]);

      const childNode3 = new RRNode();
      parentNode.lastChild = childNode3;
      childNode2.nextSibling = childNode3;
      childNode3.previousSibling = childNode2;
      expect(parentNode.childNodes).toEqual([
        childNode1,
        childNode2,
        childNode3,
      ]);
    });

    it('should return whether the node contains another node', () => {
      const parentNode = new RRNode();
      expect(parentNode.contains(parentNode)).toBeTruthy();
      expect(parentNode.contains(null as unknown as IRRNode)).toBeFalsy();
      expect(parentNode.contains(undefined as unknown as IRRNode)).toBeFalsy();
      expect(parentNode.contains({} as unknown as IRRNode)).toBeFalsy();
      expect(
        parentNode.contains(new RRDocument().createElement('div')),
      ).toBeFalsy();
      const childNode1 = new RRNode();
      const childNode2 = new RRNode();
      parentNode.firstChild = childNode1;
      parentNode.lastChild = childNode1;
      childNode1.parentNode = parentNode;
      expect(parentNode.contains(childNode1)).toBeTruthy();
      expect(parentNode.contains(childNode2)).toBeFalsy();

      parentNode.lastChild = childNode2;
      childNode1.nextSibling = childNode2;
      childNode2.previousSibling = childNode1;
      childNode2.parentNode = childNode1;
      expect(parentNode.contains(childNode1)).toBeTruthy();
      expect(parentNode.contains(childNode2)).toBeTruthy();

      const childNode3 = new RRNode();
      expect(parentNode.contains(childNode3)).toBeFalsy();
      childNode2.firstChild = childNode3;
      childNode2.lastChild = childNode3;
      childNode3.parentNode = childNode2;
      expect(parentNode.contains(childNode3)).toBeTruthy();
    });

    it('should not implement appendChild', () => {
      const parentNode = new RRNode();
      const childNode = new RRNode();
      expect(() => parentNode.appendChild(childNode)).toThrowError(
        `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
      );
    });

    it('should not implement insertBefore', () => {
      const parentNode = new RRNode();
      const childNode = new RRNode();
      expect(() => parentNode.insertBefore(childNode, null)).toThrowError(
        `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`,
      );
    });

    it('should not implement removeChild', () => {
      const parentNode = new RRNode();
      const childNode = new RRNode();
      expect(() => parentNode.removeChild(childNode)).toThrowError(
        `RRDomException: Failed to execute 'removeChild' on 'RRNode': This RRNode type does not support this method.`,
      );
    });
  });

  describe('Basic RRDocument implementation', () => {
    it('should have basic properties', () => {
      const node = new RRDocument();
      expect(node.toString()).toEqual('RRDocument');
      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBe(node);
      expect(node.textContent).toBeNull();
      expect(node.RRNodeType).toBe(RRNodeType.Document);
      expect(node.nodeType).toBe(document.nodeType);
      expect(node.nodeName).toBe('#document');
      expect(node.compatMode).toBe('CSS1Compat');
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.documentElement).toBeNull();
      expect(node.body).toBeNull();
      expect(node.head).toBeNull();
      expect(node.implementation).toBe(node);
      expect(node.firstElementChild).toBeNull();
      expect(node.createDocument).toBeDefined();
      expect(node.createDocumentType).toBeDefined();
      expect(node.createElement).toBeDefined();
      expect(node.createElementNS).toBeDefined();
      expect(node.createTextNode).toBeDefined();
      expect(node.createComment).toBeDefined();
      expect(node.createCDATASection).toBeDefined();
      expect(node.open).toBeDefined();
      expect(node.close).toBeDefined();
      expect(node.write).toBeDefined();
      expect(node.toString()).toEqual('RRDocument');
    });

    it('can get documentElement', () => {
      const node = new RRDocument();
      expect(node.documentElement).toBeNull();
      const element = node.createElement('html');
      node.appendChild(element);
      expect(node.documentElement).toBe(element);
    });

    it('can get head', () => {
      const node = new RRDocument();
      expect(node.head).toBeNull();
      const element = node.createElement('html');
      node.appendChild(element);
      expect(node.head).toBeNull();
      const head = node.createElement('head');
      element.appendChild(head);
      expect(node.head).toBe(head);
    });

    it('can get body', () => {
      const node = new RRDocument();
      expect(node.body).toBeNull();
      const element = node.createElement('html');
      node.appendChild(element);
      expect(node.body).toBeNull();
      const body = node.createElement('body');
      element.appendChild(body);
      expect(node.body).toBe(body);
      const head = node.createElement('head');
      element.appendChild(head);
      expect(node.body).toBe(body);
    });

    it('can get firstElementChild', () => {
      const node = new RRDocument();
      expect(node.firstElementChild).toBeNull();
      const element = node.createElement('html');
      node.appendChild(element);
      expect(node.firstElementChild).toBe(element);
    });

    it('can append child', () => {
      const node = new RRDocument();
      expect(node.firstElementChild).toBeNull();

      const documentType = node.createDocumentType('html', '', '');
      expect(node.appendChild(documentType)).toBe(documentType);
      expect(node.childNodes[0]).toEqual(documentType);
      expect(documentType.parentElement).toBeNull();
      expect(documentType.parentNode).toBe(node);
      expect(() => node.appendChild(documentType)).toThrowError(
        `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one RRDoctype on RRDocument allowed.`,
      );

      const element = node.createElement('html');
      expect(node.appendChild(element)).toBe(element);
      expect(node.childNodes[1]).toEqual(element);
      expect(element.parentElement).toBeNull();
      expect(element.parentNode).toBe(node);
      const div = node.createElement('div');
      expect(() => node.appendChild(div)).toThrowError(
        `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one RRElement on RRDocument allowed.`,
      );
    });

    it('can insert new child before an existing child', () => {
      const node = new RRDocument();
      const docType = node.createDocumentType('', '', '');
      expect(() => node.insertBefore(node, docType)).toThrowError(
        `Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.`,
      );
      expect(node.insertBefore(docType, null)).toBe(docType);
      expect(() => node.insertBefore(docType, null)).toThrowError(
        `RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one RRDoctype on RRDocument allowed.`,
      );
      node.removeChild(docType);

      const documentElement = node.createElement('html');
      expect(() => node.insertBefore(documentElement, docType)).toThrowError(
        `Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.`,
      );
      expect(node.insertBefore(documentElement, null)).toBe(documentElement);
      expect(() => node.insertBefore(documentElement, null)).toThrowError(
        `RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one RRElement on RRDocument allowed.`,
      );
      expect(node.insertBefore(docType, documentElement)).toBe(docType);
      expect(node.childNodes[0]).toBe(docType);
      expect(node.childNodes[1]).toBe(documentElement);
      expect(docType.parentElement).toBeNull();
      expect(documentElement.parentElement).toBeNull();
      expect(docType.parentNode).toBe(node);
      expect(documentElement.parentNode).toBe(node);
    });

    it('can remove an existing child', () => {
      const node = new RRDocument();
      const documentType = node.createDocumentType('html', '', '');
      const documentElement = node.createElement('html');
      node.appendChild(documentType);
      node.appendChild(documentElement);
      expect(documentType.parentNode).toBe(node);
      expect(documentElement.parentNode).toBe(node);

      expect(() =>
        node.removeChild(node.createElement('div')),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Failed to execute 'removeChild' on 'RRNode': The RRNode to be removed is not a child of this RRNode.]`,
      );
      expect(node.removeChild(documentType)).toBe(documentType);
      expect(documentType.parentNode).toBeNull();
      expect(node.removeChild(documentElement)).toBe(documentElement);
      expect(documentElement.parentNode).toBeNull();
    });

    it('should implement create node functions', () => {
      const node = new RRDocument();
      expect(node.createDocument(null, '', null).RRNodeType).toEqual(
        RRNodeType.Document,
      );
      expect(node.createDocumentType('', '', '').RRNodeType).toEqual(
        RRNodeType.DocumentType,
      );
      expect(node.createElement('html').RRNodeType).toEqual(RRNodeType.Element);
      expect(node.createElementNS('', 'html').RRNodeType).toEqual(
        RRNodeType.Element,
      );
      expect(node.createTextNode('text').RRNodeType).toEqual(RRNodeType.Text);
      expect(node.createComment('comment').RRNodeType).toEqual(
        RRNodeType.Comment,
      );
      expect(node.createCDATASection('data').RRNodeType).toEqual(
        RRNodeType.CDATA,
      );
    });

    it('can close and open a RRDocument', () => {
      const node = new RRDocument();
      const documentType = node.createDocumentType('html', '', '');
      node.appendChild(documentType);
      expect(node.childNodes[0]).toBe(documentType);
      expect(node.close());
      expect(node.open());
      expect(node.childNodes.length).toEqual(0);
    });

    it('can cover the usage of write() in rrweb-snapshot', () => {
      const node = new RRDocument();
      node.write(
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">',
      );
      expect(node.childNodes.length).toBe(1);
      let doctype = node.childNodes[0] as IRRDocumentType;
      expect(doctype.RRNodeType).toEqual(RRNodeType.DocumentType);
      expect(doctype.parentNode).toEqual(node);
      expect(doctype.name).toEqual('html');
      expect(doctype.publicId).toEqual(
        '-//W3C//DTD XHTML 1.0 Transitional//EN',
      );
      expect(doctype.systemId).toEqual('');

      node.write(
        '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">',
      );
      expect(node.childNodes.length).toBe(1);
      doctype = node.childNodes[0] as IRRDocumentType;
      expect(doctype.RRNodeType).toEqual(RRNodeType.DocumentType);
      expect(doctype.parentNode).toEqual(node);
      expect(doctype.name).toEqual('html');
      expect(doctype.publicId).toEqual('-//W3C//DTD HTML 4.0 Transitional//EN');
      expect(doctype.systemId).toEqual('');
    });
  });

  describe('Basic RRDocumentType implementation', () => {
    it('should have basic properties', () => {
      const name = 'name',
        publicId = 'publicId',
        systemId = 'systemId';
      const node = new RRDocumentType(name, publicId, systemId);

      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBeUndefined();
      expect(node.textContent).toBeNull();
      expect(node.RRNodeType).toBe(RRNodeType.DocumentType);
      expect(node.nodeType).toBe(document.DOCUMENT_TYPE_NODE);
      expect(node.nodeName).toBe(name);
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.name).toBe(name);
      expect(node.publicId).toBe(publicId);
      expect(node.systemId).toBe(systemId);
      expect(node.toString()).toEqual('RRDocumentType');
    });
  });

  describe('Basic RRElement implementation', () => {
    const document = new RRDocument();

    it('should have basic properties', () => {
      const node = document.createElement('div');

      node.scrollLeft = 100;
      node.scrollTop = 200;
      node.attributes.id = 'id';
      node.attributes.class = 'className';
      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBe(document);
      expect(node.textContent).toEqual('');
      expect(node.RRNodeType).toBe(RRNodeType.Element);
      expect(node.nodeType).toBe(document.ELEMENT_NODE);
      expect(node.nodeName).toBe('DIV');
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.tagName).toEqual('DIV');
      expect(node.attributes).toEqual({ id: 'id', class: 'className' });
      expect(node.shadowRoot).toBeNull();
      expect(node.scrollLeft).toEqual(100);
      expect(node.scrollTop).toEqual(200);
      expect(node.id).toEqual('id');
      expect(node.className).toEqual('className');
      expect(node.classList).toBeDefined();
      expect(node.style).toBeDefined();
      expect(node.getAttribute).toBeDefined();
      expect(node.setAttribute).toBeDefined();
      expect(node.setAttributeNS).toBeDefined();
      expect(node.removeAttribute).toBeDefined();
      expect(node.attachShadow).toBeDefined();
      expect(node.dispatchEvent).toBeDefined();
      expect(node.dispatchEvent(null as unknown as Event)).toBeTruthy();
      expect(node.toString()).toEqual('DIV id="id" class="className" ');
    });

    it('can get textContent', () => {
      const node = document.createElement('div');
      node.appendChild(document.createTextNode('text1 '));
      node.appendChild(document.createTextNode('text2'));
      expect(node.textContent).toEqual('text1 text2');
    });

    it('can set textContent', () => {
      const node = document.createElement('div');
      node.appendChild(document.createTextNode('text1 '));
      node.appendChild(document.createTextNode('text2'));
      expect(node.textContent).toEqual('text1 text2');
      node.textContent = 'new text';
      expect(node.textContent).toEqual('new text');
    });

    it('can get id', () => {
      const node = document.createElement('div');
      expect(node.id).toEqual('');
      node.attributes.id = 'idName';
      expect(node.id).toEqual('idName');
    });

    it('can get className', () => {
      const node = document.createElement('div');
      expect(node.className).toEqual('');
      node.attributes.class = 'className';
      expect(node.className).toEqual('className');
    });

    it('can get classList', () => {
      const node = document.createElement('div');
      const classList = node.classList;
      expect(classList.add).toBeDefined();
      expect(classList.remove).toBeDefined();
    });

    it('classList can add class name', () => {
      const node = document.createElement('div');
      expect(node.className).toEqual('');
      const classList = node.classList;
      classList.add('c1');
      expect(node.className).toEqual('c1');
      classList.add('c2');
      expect(node.className).toEqual('c1 c2');
      classList.add('c2');
      expect(node.className).toEqual('c1 c2');
    });

    it('classList can remove class name', () => {
      const node = document.createElement('div');
      expect(node.className).toEqual('');
      const classList = node.classList;
      classList.add('c1', 'c2', 'c3');
      expect(node.className).toEqual('c1 c2 c3');
      classList.remove('c2');
      expect(node.className).toEqual('c1 c3');
      classList.remove('c3');
      expect(node.className).toEqual('c1');
      classList.remove('c1');
      expect(node.className).toEqual('');
      classList.remove('c1');
      expect(node.className).toEqual('');
    });

    it('classList can remove duplicate class names', () => {
      const node = document.createElement('div');
      expect(node.className).toEqual('');
      node.setAttribute('class', 'c1 c1 c1');
      expect(node.className).toEqual('c1 c1 c1');
      const classList = node.classList;
      classList.remove('c1');
      expect(node.className).toEqual('');
    });

    it('can get CSS style declaration', () => {
      const node = document.createElement('div');
      const style = node.style;
      expect(style).toBeDefined();
      expect(style.setProperty).toBeDefined();
      expect(style.removeProperty).toBeDefined();

      node.attributes.style =
        'color: blue; background-color: red; width: 78%; height: 50vh !important;';
      expect(node.style.color).toBe('blue');
      expect(node.style.backgroundColor).toBe('red');
      expect(node.style.width).toBe('78%');
      expect(node.style.height).toBe('50vh !important');
    });

    it('can set CSS property', () => {
      const node = document.createElement('div');
      const style = node.style;
      style.setProperty('color', 'red');
      expect(node.attributes.style).toEqual('color: red;');
      // camelCase style is unacceptable
      style.setProperty('backgroundColor', 'blue');
      expect(node.attributes.style).toEqual('color: red;');
      style.setProperty('height', '50vh', 'important');
      expect(node.attributes.style).toEqual(
        'color: red; height: 50vh !important;',
      );

      // kebab-case
      style.setProperty('background-color', 'red');
      expect(node.attributes.style).toEqual(
        'color: red; height: 50vh !important; background-color: red;',
      );

      // remove the property
      style.setProperty('background-color', null);
      expect(node.attributes.style).toEqual(
        'color: red; height: 50vh !important;',
      );
    });

    it('can remove CSS property', () => {
      const node = document.createElement('div');
      node.attributes.style =
        'color: blue; background-color: red; width: 78%; height: 50vh !important;';
      const style = node.style;
      expect(style.removeProperty('color')).toEqual('blue');
      expect(node.attributes.style).toEqual(
        'background-color: red; width: 78%; height: 50vh !important;',
      );
      expect(style.removeProperty('height')).toEqual('50vh !important');
      expect(node.attributes.style).toEqual(
        'background-color: red; width: 78%;',
      );
      // kebab-case
      expect(style.removeProperty('background-color')).toEqual('red');
      expect(node.attributes.style).toEqual('width: 78%;');
      style.setProperty('background-color', 'red');
      expect(node.attributes.style).toEqual(
        'width: 78%; background-color: red;',
      );
      expect(style.removeProperty('backgroundColor')).toEqual('');
      expect(node.attributes.style).toEqual(
        'width: 78%; background-color: red;',
      );
      // remove a non-exist property
      expect(style.removeProperty('margin')).toEqual('');
    });

    it('can parse more inline styles correctly', () => {
      const node = document.createElement('div');
      // general
      node.attributes.style =
        'display: inline-block;   margin:    0 auto; border: 5px solid #BADA55; font-size: .75em; position:absolute;width: 33.3%; z-index:1337; font-family: "Goudy Bookletter 1911", Gill Sans Extrabold, sans-serif;';

      let style = node.style;
      expect(style.display).toEqual('inline-block');
      expect(style.margin).toEqual('0 auto');
      expect(style.border).toEqual('5px solid #BADA55');
      expect(style.fontSize).toEqual('.75em');
      expect(style.position).toEqual('absolute');
      expect(style.width).toEqual('33.3%');
      expect(style.zIndex).toEqual('1337');
      expect(style.fontFamily).toEqual(
        '"Goudy Bookletter 1911", Gill Sans Extrabold, sans-serif',
      );

      // multiple of same property
      node.attributes.style = 'color: rgba(0,0,0,1);color:white';
      style = node.style;
      expect(style.color).toEqual('white');

      // url
      node.attributes.style =
        'background-image: url("http://example.com/img.png")';
      expect(node.style.backgroundImage).toEqual(
        'url("http://example.com/img.png")',
      );

      // vendor prefixes
      node.attributes.style = `
        -moz-border-radius: 10px 5px;
        -webkit-border-top-left-radius: 10px;        
        -webkit-border-bottom-left-radius: 5px;
        border-radius: 10px 5px;
      `;
      style = node.style;
      expect(style.MozBorderRadius).toEqual('10px 5px');
      expect(style.WebkitBorderTopLeftRadius).toEqual('10px');
      expect(style.WebkitBorderBottomLeftRadius).toEqual('5px');
      expect(style.borderRadius).toEqual('10px 5px');

      // comment
      node.attributes.style =
        'top: 0; /* comment1 */ bottom: /* comment2 */42rem;';
      expect(node.style.top).toEqual('0');
      expect(node.style.bottom).toEqual('42rem');
      // empty comment
      node.attributes.style = 'top: /**/0;';
      expect(node.style.top).toEqual('0');

      // custom property (variable)
      node.attributes.style = '--custom-property: value';
      expect(node.style['--custom-property']).toEqual('value');

      // incomplete
      node.attributes.style = 'overflow:';
      expect(node.style.overflow).toBeUndefined();
    });

    it('can get attribute', () => {
      const node = document.createElement('div');
      node.attributes.class = 'className';
      expect(node.getAttribute('class')).toEqual('className');
      expect(node.getAttribute('id')).toEqual(null);
      node.attributes.id = 'id';
      expect(node.getAttribute('id')).toEqual('id');
    });

    it('can set attribute', () => {
      const node = document.createElement('div');
      expect(node.getAttribute('class')).toEqual(null);
      node.setAttribute('class', 'className');
      expect(node.getAttribute('class')).toEqual('className');
      expect(node.getAttribute('id')).toEqual(null);
      node.setAttribute('id', 'id');
      expect(node.getAttribute('id')).toEqual('id');
    });

    it('can setAttributeNS', () => {
      const node = document.createElement('div');
      expect(node.getAttribute('class')).toEqual(null);
      node.setAttributeNS('namespace', 'class', 'className');
      expect(node.getAttribute('class')).toEqual('className');
      expect(node.getAttribute('id')).toEqual(null);
      node.setAttributeNS('namespace', 'id', 'id');
      expect(node.getAttribute('id')).toEqual('id');
    });

    it('can remove attribute', () => {
      const node = document.createElement('div');
      node.setAttribute('class', 'className');
      expect(node.getAttribute('class')).toEqual('className');
      node.removeAttribute('class');
      expect(node.getAttribute('class')).toEqual(null);
      node.removeAttribute('id');
      expect(node.getAttribute('id')).toEqual(null);
    });

    it('can attach shadow dom', () => {
      const node = document.createElement('div');
      expect(node.shadowRoot).toBeNull();
      node.attachShadow({ mode: 'open' });
      expect(node.shadowRoot).not.toBeNull();
      expect(node.shadowRoot!.RRNodeType).toBe(RRNodeType.Element);
      expect(node.shadowRoot!.tagName).toBe('SHADOWROOT');
      expect(node.parentNode).toBeNull();
    });

    it('can append child', () => {
      const node = document.createElement('div');
      expect(node.childNodes.length).toBe(0);

      const child1 = document.createElement('span');
      expect(node.appendChild(child1)).toBe(child1);
      expect(node.childNodes[0]).toBe(child1);
      expect(node.firstChild).toBe(child1);
      expect(node.lastChild).toBe(child1);
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBeNull();
      expect(child1.parentElement).toBe(node);
      expect(child1.parentNode).toBe(node);
      expect(child1.ownerDocument).toBe(document);
      expect(node.contains(child1)).toBeTruthy();

      const child2 = document.createElement('p');
      expect(node.appendChild(child2)).toBe(child2);
      expect(node.childNodes[1]).toBe(child2);
      expect(node.firstChild).toBe(child1);
      expect(node.lastChild).toBe(child2);
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBe(child2);
      expect(child2.previousSibling).toBe(child1);
      expect(child2.nextSibling).toBeNull();
      expect(child2.parentElement).toBe(node);
      expect(child2.parentNode).toBe(node);
      expect(child2.ownerDocument).toBe(document);
      expect(node.contains(child1)).toBeTruthy();
      expect(node.contains(child2)).toBeTruthy();
    });

    it('can append a child with parent node', () => {
      const node = document.createElement('div');
      const child = document.createElement('span');
      expect(node.appendChild(child)).toBe(child);
      expect(node.childNodes).toEqual([child]);
      expect(node.appendChild(child)).toBe(child);
      expect(node.childNodes).toEqual([child]);
      expect(child.parentNode).toBe(node);

      const node1 = document.createElement('div');
      expect(node1.appendChild(child)).toBe(child);
      expect(node1.childNodes).toEqual([child]);
      expect(child.parentNode).toBe(node1);
      expect(node.childNodes).toEqual([]);
    });

    it('can insert new child before an existing child', () => {
      const node = document.createElement('div');
      const child1 = document.createElement('h1');
      const child2 = document.createElement('h2');
      const child3 = document.createElement('h3');
      expect(() =>
        node.insertBefore(node, child1),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.]`,
      );
      expect(node.insertBefore(child1, null)).toBe(child1);
      expect(node.childNodes[0]).toBe(child1);
      expect(node.childNodes.length).toBe(1);
      expect(node.firstChild).toBe(child1);
      expect(node.lastChild).toBe(child1);
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBeNull();
      expect(child1.parentNode).toBe(node);
      expect(child1.parentElement).toBe(node);
      expect(child1.ownerDocument).toBe(document);
      expect(node.contains(child1)).toBeTruthy();

      expect(node.insertBefore(child2, child1)).toBe(child2);
      expect(node.childNodes).toEqual([child2, child1]);
      expect(node.firstChild).toBe(child2);
      expect(node.lastChild).toBe(child1);
      expect(child1.previousSibling).toBe(child2);
      expect(child1.nextSibling).toBeNull();
      expect(child2.previousSibling).toBeNull();
      expect(child2.nextSibling).toBe(child1);
      expect(child2.parentNode).toBe(node);
      expect(child2.parentElement).toBe(node);
      expect(child2.ownerDocument).toBe(document);
      expect(node.contains(child2)).toBeTruthy();
      expect(node.contains(child1)).toBeTruthy();

      expect(node.insertBefore(child3, child1)).toBe(child3);
      expect(node.childNodes).toEqual([child2, child3, child1]);
      expect(node.firstChild).toBe(child2);
      expect(node.lastChild).toBe(child1);
      expect(child1.previousSibling).toBe(child3);
      expect(child1.nextSibling).toBeNull();
      expect(child3.previousSibling).toBe(child2);
      expect(child3.nextSibling).toBe(child1);
      expect(child2.previousSibling).toBeNull();
      expect(child2.nextSibling).toBe(child3);
      expect(child3.parentNode).toBe(node);
      expect(child3.parentElement).toBe(node);
      expect(child3.ownerDocument).toBe(document);
      expect(node.contains(child2)).toBeTruthy();
      expect(node.contains(child3)).toBeTruthy();
      expect(node.contains(child1)).toBeTruthy();
    });

    it('can insert a child with parent node', () => {
      const node = document.createElement('div');
      const child1 = document.createElement('h1');
      expect(node.insertBefore(child1, null)).toBe(child1);
      expect(node.childNodes).toEqual([child1]);
      expect(node.insertBefore(child1, child1)).toBe(child1);
      expect(node.childNodes).toEqual([child1]);
      expect(child1.parentNode).toEqual(node);

      const node2 = document.createElement('div');
      const child2 = document.createElement('h2');
      expect(node2.insertBefore(child2, null)).toBe(child2);
      expect(node2.childNodes).toEqual([child2]);
      expect(node2.insertBefore(child1, child2)).toBe(child1);
      expect(node2.childNodes).toEqual([child1, child2]);
      expect(child1.parentNode).toEqual(node2);
      expect(node.childNodes).toEqual([]);
    });

    it('can remove an existing child', () => {
      const node = document.createElement('div');
      const child1 = document.createElement('h1');
      const child2 = document.createElement('h2');
      const child3 = document.createElement('h3');
      node.appendChild(child1);
      node.appendChild(child2);
      node.appendChild(child3);
      expect(node.childNodes).toEqual([child1, child2, child3]);

      expect(() =>
        node.removeChild(document.createElement('div')),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Failed to execute 'removeChild' on 'RRNode': The RRNode to be removed is not a child of this RRNode.]`,
      );
      // Remove the middle child.
      expect(node.removeChild(child2)).toBe(child2);
      expect(node.childNodes).toEqual([child1, child3]);
      expect(node.contains(child2)).toBeFalsy();
      expect(node.firstChild).toBe(child1);
      expect(node.lastChild).toBe(child3);
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBe(child3);
      expect(child3.previousSibling).toBe(child1);
      expect(child3.nextSibling).toBeNull();
      expect(child2.previousSibling).toBeNull();
      expect(child2.nextSibling).toBeNull();
      expect(child2.parentNode).toBeNull();
      expect(child2.parentElement).toBeNull();

      // Remove the previous child.
      expect(node.removeChild(child1)).toBe(child1);
      expect(node.childNodes).toEqual([child3]);
      expect(node.contains(child1)).toBeFalsy();
      expect(node.firstChild).toBe(child3);
      expect(node.lastChild).toBe(child3);
      expect(child3.previousSibling).toBeNull();
      expect(child3.nextSibling).toBeNull();
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBeNull();
      expect(child1.parentNode).toBeNull();
      expect(child1.parentElement).toBeNull();

      node.insertBefore(child1, child3);
      expect(node.childNodes).toEqual([child1, child3]);
      // Remove the next child.
      expect(node.removeChild(child3)).toBe(child3);
      expect(node.childNodes).toEqual([child1]);
      expect(node.contains(child3)).toBeFalsy();
      expect(node.contains(child1)).toBeTruthy();
      expect(node.firstChild).toBe(child1);
      expect(node.lastChild).toBe(child1);
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBeNull();
      expect(child3.previousSibling).toBeNull();
      expect(child3.nextSibling).toBeNull();
      expect(child3.parentNode).toBeNull();
      expect(child3.parentElement).toBeNull();

      // Remove all children.
      expect(node.removeChild(child1)).toBe(child1);
      expect(node.childNodes).toEqual([]);
      expect(node.contains(child1)).toBeFalsy();
      expect(node.contains(child2)).toBeFalsy();
      expect(node.contains(child3)).toBeFalsy();
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(child1.previousSibling).toBeNull();
      expect(child1.nextSibling).toBeNull();
      expect(child1.parentNode).toBeNull();
      expect(child1.parentElement).toBeNull();
    });
  });

  describe('Basic RRText implementation', () => {
    const dom = new RRDocument();

    it('should have basic properties', () => {
      const node = dom.createTextNode('text');

      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBe(dom);
      expect(node.textContent).toEqual('text');
      expect(node.RRNodeType).toBe(RRNodeType.Text);
      expect(node.nodeType).toBe(document.TEXT_NODE);
      expect(node.nodeName).toBe('#text');
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.toString()).toEqual('RRText text="text"');
    });

    it('can set textContent', () => {
      const node = dom.createTextNode('text');
      expect(node.textContent).toEqual('text');
      node.textContent = 'new text';
      expect(node.textContent).toEqual('new text');
    });
  });

  describe('Basic RRComment implementation', () => {
    const dom = new RRDocument();

    it('should have basic properties', () => {
      const node = dom.createComment('comment');

      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBe(dom);
      expect(node.textContent).toEqual('comment');
      expect(node.RRNodeType).toBe(RRNodeType.Comment);
      expect(node.nodeType).toBe(document.COMMENT_NODE);
      expect(node.nodeName).toBe('#comment');
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.toString()).toEqual('RRComment text="comment"');
    });

    it('can set textContent', () => {
      const node = dom.createComment('comment');
      expect(node.textContent).toEqual('comment');
      node.textContent = 'new comment';
      expect(node.textContent).toEqual('new comment');
    });
  });

  describe('Basic RRCDATASection implementation', () => {
    const dom = new RRDocument();

    it('should have basic properties', () => {
      const node = dom.createCDATASection('data');

      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBe(dom);
      expect(node.textContent).toEqual('data');
      expect(node.RRNodeType).toBe(RRNodeType.CDATA);
      expect(node.nodeType).toBe(document.CDATA_SECTION_NODE);
      expect(node.nodeName).toBe('#cdata-section');
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.lastChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.toString()).toEqual('RRCDATASection data="data"');
    });

    it('can set textContent', () => {
      const node = dom.createCDATASection('data');
      expect(node.textContent).toEqual('data');
      node.textContent = 'new data';
      expect(node.textContent).toEqual('new data');
    });
  });

  describe('Basic RRMediaElement implementation', () => {
    it('should have basic properties', () => {
      const node = new RRMediaElement('video');
      node.scrollLeft = 100;
      node.scrollTop = 200;
      expect(node.parentNode).toEqual(null);
      expect(node.parentElement).toEqual(null);
      expect(node.childNodes).toBeInstanceOf(Array);
      expect(node.childNodes.length).toBe(0);
      expect(node.ownerDocument).toBeUndefined();
      expect(node.textContent).toEqual('');
      expect(node.RRNodeType).toBe(RRNodeType.Element);
      expect(node.nodeType).toBe(document.ELEMENT_NODE);
      expect(node.ELEMENT_NODE).toBe(document.ELEMENT_NODE);
      expect(node.TEXT_NODE).toBe(document.TEXT_NODE);
      expect(node.firstChild).toBeNull();
      expect(node.previousSibling).toBeNull();
      expect(node.nextSibling).toBeNull();
      expect(node.contains).toBeDefined();
      expect(node.appendChild).toBeDefined();
      expect(node.insertBefore).toBeDefined();
      expect(node.removeChild).toBeDefined();
      expect(node.tagName).toEqual('VIDEO');
      expect(node.attributes).toEqual({});
      expect(node.shadowRoot).toBeNull();
      expect(node.scrollLeft).toEqual(100);
      expect(node.scrollTop).toEqual(200);
      expect(node.id).toEqual('');
      expect(node.className).toEqual('');
      expect(node.classList).toBeDefined();
      expect(node.style).toBeDefined();
      expect(node.getAttribute).toBeDefined();
      expect(node.setAttribute).toBeDefined();
      expect(node.setAttributeNS).toBeDefined();
      expect(node.removeAttribute).toBeDefined();
      expect(node.attachShadow).toBeDefined();
      expect(node.dispatchEvent).toBeDefined();
      expect(node.currentTime).toBeUndefined();
      expect(node.volume).toBeUndefined();
      expect(node.paused).toBeUndefined();
      expect(node.muted).toBeUndefined();
      expect(node.playbackRate).toBeUndefined();
      expect(node.loop).toBeUndefined();
      expect(node.play).toBeDefined();
      expect(node.pause).toBeDefined();
      expect(node.toString()).toEqual('VIDEO ');
    });

    it('can play and pause the media', () => {
      const node = new RRMediaElement('video');
      expect(node.paused).toBeUndefined();
      node.play();
      expect(node.paused).toBeFalsy();
      node.pause();
      expect(node.paused).toBeTruthy();
      node.play();
      expect(node.paused).toBeFalsy();
    });

    it('should not support attachShadow function', () => {
      const node = new RRMediaElement('video');
      expect(() => node.attachShadow({ mode: 'open' })).toThrowError(
        `RRDomException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow`,
      );
    });
  });
});
