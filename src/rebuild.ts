import {
  serializedNodeWithId,
  NodeType,
  tagMap,
  elementNode,
  idNodeMap,
  INode,
} from './types';

// TODO: need a more accurate list
const svgTags = [
  'altGlyph',
  'altGlyphDef',
  'altGlyphItem',
  'animate',
  'animateColor',
  'animateMotion',
  'animateTransform',
  'animation',
  'circle',
  'clipPath',
  'color-profile',
  'cursor',
  'defs',
  'desc',
  'discard',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'font',
  'font-face',
  'font-face-format',
  'font-face-name',
  'font-face-src',
  'font-face-uri',
  'foreignObject',
  'g',
  'glyph',
  'glyphRef',
  'handler',
  'hatch',
  'hatchpath',
  'hkern',
  'image',
  'line',
  'linearGradient',
  'listener',
  'marker',
  'mask',
  'mesh',
  'meshgradient',
  'meshpatch',
  'meshrow',
  'metadata',
  'missing-glyph',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'prefetch',
  'radialGradient',
  'rect',
  'set',
  'solidColor',
  'solidcolor',
  'stop',
  'svg',
  'switch',
  'symbol',
  'tbreak',
  'text',
  'textArea',
  'textPath',
  'tref',
  'tspan',
  'unknown',
  'use',
  'view',
  'vkern',
];

const tagMap: tagMap = {
  script: 'noscript',
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
      if (svgTags.indexOf(tagName) < 0) {
        node = doc.createElement(tagName);
      } else {
        node = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
      }
      for (const name in n.attributes) {
        if (n.attributes.hasOwnProperty(name)) {
          let value = n.attributes[name];
          value = typeof value === 'boolean' ? '' : value;
          const isTextarea = tagName === 'textarea' && name === 'value';
          const isRemoteCss = tagName === 'style' && name === '_cssText';
          if (isRemoteCss) {
            value = addHoverClass(value);
          }
          if (isTextarea || isRemoteCss) {
            const child = doc.createTextNode(value);
            node.appendChild(child);
          }
          try {
            node.setAttribute(name, value);
          } catch (error) {
            // skip invalid attribute
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
