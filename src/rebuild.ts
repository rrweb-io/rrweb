import {
  serializedNodeWithId,
  NodeType,
  tagMap,
  elementNode,
  idNodeMap,
  INode,
} from './types';

const tagMap: tagMap = {
  script: 'noscript',
  // camel case svg element tag names
  altglyph: 'altGlyph',
  altglyphdef: 'altGlyphDef',
  altglyphitem: 'altGlyphItem',
  animatecolor: 'animateColor',
  animatemotion: 'animateMotion',
  animatetransform: 'animateTransform',
  clippath: 'clipPath',
  feblend: 'feBlend',
  fecolormatrix: 'feColorMatrix',
  fecomponenttransfer: 'feComponentTransfer',
  fecomposite: 'feComposite',
  feconvolvematrix: 'feConvolveMatrix',
  fediffuselighting: 'feDiffuseLighting',
  fedisplacementmap: 'feDisplacementMap',
  fedistantlight: 'feDistantLight',
  fedropshadow: 'feDropShadow',
  feflood: 'feFlood',
  fefunca: 'feFuncA',
  fefuncb: 'feFuncB',
  fefuncg: 'feFuncG',
  fefuncr: 'feFuncR',
  fegaussianblur: 'feGaussianBlur',
  feimage: 'feImage',
  femerge: 'feMerge',
  femergenode: 'feMergeNode',
  femorphology: 'feMorphology',
  feoffset: 'feOffset',
  fepointlight: 'fePointLight',
  fespecularlighting: 'feSpecularLighting',
  fespotlight: 'feSpotLight',
  fetile: 'feTile',
  feturbulence: 'feTurbulence',
  foreignobject: 'foreignObject',
  glyphref: 'glyphRef',
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient',
};
function getTagName(n: elementNode): string {
  let tagName = tagMap[n.tagName] ? tagMap[n.tagName] : n.tagName;
  if (tagName === 'link' && n.attributes._cssText) {
    tagName = 'style';
  }
  return tagName;
}

const CSS_SELECTOR = /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g;
const HOVER_SELECTOR = /([^\\]):hover/g;
export function addHoverClass(cssText: string): string {
  return cssText.replace(CSS_SELECTOR, (match, p1: string, p2: string) => {
    if (HOVER_SELECTOR.test(p1)) {
      const newSelector = p1.replace(HOVER_SELECTOR, '$1.\\:hover');
      return `${p1.replace(/\s*$/, '')}, ${newSelector.replace(
        /^\s*/,
        '',
      )}${p2}`;
    } else {
      return match;
    }
  });
}

function buildNode(n: serializedNodeWithId, doc: Document): Node | null {
  switch (n.type) {
    case NodeType.Document:
      return doc.implementation.createDocument(null, '', null);
    case NodeType.DocumentType:
      return doc.implementation.createDocumentType(
        n.name,
        n.publicId,
        n.systemId,
      );
    case NodeType.Element:
      const tagName = getTagName(n);
      let node: Element;
      if (n.isSVG) {
        node = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
      } else {
        node = doc.createElement(tagName);
      }
      for (const name in n.attributes) {
        // attribute names start with rr_ are internal attributes added by rrweb
        if (n.attributes.hasOwnProperty(name) && !name.startsWith('rr_')) {
          let value = n.attributes[name];
          value = typeof value === 'boolean' ? '' : value;
          const isTextarea = tagName === 'textarea' && name === 'value';
          const isRemoteOrDynamicCss =
            tagName === 'style' && name === '_cssText';
          if (isRemoteOrDynamicCss) {
            value = addHoverClass(value);
          }
          if (isTextarea || isRemoteOrDynamicCss) {
            const child = doc.createTextNode(value);
            node.appendChild(child);
            continue;
          }
          if (tagName === 'iframe' && name === 'src') {
            continue;
          }
          try {
            node.setAttribute(name, value);
          } catch (error) {
            // skip invalid attribute
          }
        } else {
          // handle internal attributes
          if (n.attributes.rr_width) {
            (node as HTMLElement).style.width = n.attributes.rr_width as string;
          }
          if (n.attributes.rr_height) {
            (node as HTMLElement).style.height = n.attributes
              .rr_height as string;
          }
        }
      }
      return node;
    case NodeType.Text:
      return doc.createTextNode(
        n.isStyle ? addHoverClass(n.textContent) : n.textContent,
      );
    case NodeType.CDATA:
      return doc.createCDATASection(n.textContent);
    case NodeType.Comment:
      return doc.createComment(n.textContent);
    default:
      return null;
  }
}

export function buildNodeWithSN(
  n: serializedNodeWithId,
  doc: Document,
  map: idNodeMap,
  skipChild = false,
): INode | null {
  let node = buildNode(n, doc);
  if (!node) {
    return null;
  }
  // use target document as root document
  if (n.type === NodeType.Document) {
    // close before open to make sure document was closed
    doc.close();
    doc.open();
    node = doc;
  }

  (node as INode).__sn = n;
  map[n.id] = node as INode;
  if (
    (n.type === NodeType.Document || n.type === NodeType.Element) &&
    !skipChild
  ) {
    for (const childN of n.childNodes) {
      const childNode = buildNodeWithSN(childN, doc, map);
      if (!childNode) {
        console.warn('Failed to rebuild', childN);
      } else {
        node.appendChild(childNode);
      }
    }
  }
  return node as INode;
}

function rebuild(
  n: serializedNodeWithId,
  doc: Document,
): [Node | null, idNodeMap] {
  const idNodeMap: idNodeMap = {};
  return [buildNodeWithSN(n, doc, idNodeMap), idNodeMap];
}

export default rebuild;
