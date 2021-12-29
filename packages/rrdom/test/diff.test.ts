/**
 * @jest-environment jsdom
 */
import { RRDocument } from '../src/document-browser';
import { diff } from '../src/diff';
import { INode, NodeType, serializedNodeWithId } from 'rrweb-snapshot/';

describe('diff algorithm for rrdom', () => {
  it('diff a node', () => {
    const tagName = 'DIV';
    const node = (document.createElement(tagName) as unknown) as INode;
    let sn = {
      type: NodeType.Element,
      tagName: tagName,
      attributes: {},
      childNodes: [],
      id: 1,
    } as serializedNodeWithId;
    node.__sn = sn;
    const rrDocument = new RRDocument();
    const rrNode = rrDocument.createElement(tagName);
    rrNode.__sn = sn;
    diff(node, rrNode);
    expect(node).toBeInstanceOf(HTMLElement);
    expect(((node as unknown) as HTMLElement).tagName).toBe(tagName);
  });

  it('diff properties (add new properties)', () => {
    const tagName = 'DIV';
    const node = (document.createElement(tagName) as unknown) as INode;
    let sn = {
      type: NodeType.Element,
      tagName: tagName,
      attributes: {},
      childNodes: [],
      id: 1,
    } as serializedNodeWithId;
    node.__sn = sn;
    const rrDocument = new RRDocument();
    const rrNode = rrDocument.createElement(tagName);
    rrNode.__sn = sn;
    rrNode.attributes = { id: 'node1', class: 'node' };
    diff(node, rrNode);
    expect(((node as unknown) as HTMLElement).id).toBe('node1');
    expect(((node as unknown) as HTMLElement).className).toBe('node');
  });

  it('diff properties (update exist properties)', () => {
    const tagName = 'DIV';
    const node = (document.createElement(tagName) as unknown) as INode;
    let sn = {
      type: NodeType.Element,
      tagName: tagName,
      attributes: {},
      childNodes: [],
      id: 1,
    } as serializedNodeWithId;
    node.__sn = sn;
    ((node as unknown) as HTMLElement).id = 'element1';
    ((node as unknown) as HTMLElement).className = 'element';
    ((node as unknown) as HTMLElement).setAttribute('style', 'color: black');
    const rrDocument = new RRDocument();
    const rrNode = rrDocument.createElement(tagName);
    rrNode.__sn = sn;
    rrNode.attributes = { id: 'node1', class: 'node', style: 'color: white' };
    diff(node, rrNode);
    expect(((node as unknown) as HTMLElement).id).toBe('node1');
    expect(((node as unknown) as HTMLElement).className).toBe('node');
    expect(((node as unknown) as HTMLElement).getAttribute('style')).toBe(
      'color: white',
    );

    rrNode.attributes = { id: 'node2' };
    diff(node, rrNode);
    expect(((node as unknown) as HTMLElement).id).toBe('node2');
    expect(((node as unknown) as HTMLElement).className).toBe('undefined');
    expect(((node as unknown) as HTMLElement).getAttribute('style')).toBe(
      'undefined',
    );
  });

  it('diff properties (delete old properties)', () => {
    const tagName = 'DIV';
    const node = (document.createElement(tagName) as unknown) as INode;
    let sn = {
      type: NodeType.Element,
      tagName: tagName,
      attributes: {},
      childNodes: [],
      id: 1,
    } as serializedNodeWithId;
    node.__sn = sn;
    ((node as unknown) as HTMLElement).id = 'element1';
    ((node as unknown) as HTMLElement).className = 'element';
    ((node as unknown) as HTMLElement).setAttribute('style', 'color: black');
    const rrDocument = new RRDocument();
    const rrNode = rrDocument.createElement(tagName);
    rrNode.__sn = sn;
    rrNode.attributes = { id: 'node1' };
    diff(node, rrNode);
    expect(((node as unknown) as HTMLElement).id).toBe('node1');
    expect(((node as unknown) as HTMLElement).className).toBe('undefined');
    expect(((node as unknown) as HTMLElement).getAttribute('style')).toBe(
      'undefined',
    );

    rrNode.attributes = { src: 'link' };
    diff(node, rrNode);
    expect(((node as unknown) as HTMLElement).id).toBe('undefined');
    expect(((node as unknown) as HTMLElement).getAttribute('src')).toBe('link');
  });
});
