import { parse } from './css';
import {
  serializedNodeWithId,
  NodeType,
  tagMap,
  elementNode,
  idNodeMap,
  INode,
} from './types';
import { isElement } from './utils';

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

// based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const HOVER_SELECTOR = /([^\\]):hover/;
const HOVER_SELECTOR_GLOBAL = new RegExp(HOVER_SELECTOR, 'g');
export function addHoverClass(cssText: string): string {
  const ast = parse(cssText, {
    silent: true,
  });

  if (!ast.stylesheet) {
    return cssText;
  }

  const selectors: string[] = [];
  ast.stylesheet.rules.forEach((rule) => {
    if ('selectors' in rule) {
      (rule.selectors || []).forEach((selector: string) => {
        if (HOVER_SELECTOR.test(selector)) {
          selectors.push(selector);
        }
      });
    }
  });

  if (selectors.length === 0) return cssText;

  const selectorMatcher = new RegExp(
    selectors
      .filter((selector, index) => selectors.indexOf(selector) === index)
      .sort((a, b) => b.length - a.length)
      .map((selector) => {
        return escapeRegExp(selector);
      })
      .join('|'),
    'g',
  );

  return cssText.replace(selectorMatcher, (selector) => {
    const newSelector = selector.replace(HOVER_SELECTOR_GLOBAL, '$1.\\:hover');
    return `${selector}, ${newSelector}`;
  });
}

function buildNode(
  n: serializedNodeWithId,
  options: {
    doc: Document;
    hackCss: boolean;
  },
): Node | null {
  const { doc, hackCss } = options;
  switch (n.type) {
    case NodeType.Document:
      return doc.implementation.createDocument(null, '', null);
    case NodeType.DocumentType:
      return doc.implementation.createDocumentType(
        n.name || 'html',
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
        if (!n.attributes.hasOwnProperty(name)) {
          continue;
        }
        let value = n.attributes[name];
        value =
          typeof value === 'boolean' || typeof value === 'number' ? '' : value;
        // attribute names start with rr_ are internal attributes added by rrweb
        if (!name.startsWith('rr_')) {
          const isTextarea = tagName === 'textarea' && name === 'value';
          const isRemoteOrDynamicCss =
            tagName === 'style' && name === '_cssText';
          if (isRemoteOrDynamicCss && hackCss) {
            value = addHoverClass(value);
          }
          if (isTextarea || isRemoteOrDynamicCss) {
            const child = doc.createTextNode(value);
            // https://github.com/rrweb-io/rrweb/issues/112
            for (const c of Array.from(node.childNodes)) {
              if (c.nodeType === node.TEXT_NODE) {
                node.removeChild(c);
              }
            }
            node.appendChild(child);
            continue;
          }
          if (tagName === 'iframe' && name === 'src') {
            continue;
          }
          try {
            if (n.isSVG && name === 'xlink:href') {
              node.setAttributeNS('http://www.w3.org/1999/xlink', name, value);
            } else if (
              name === 'onload' ||
              name === 'onclick' ||
              name.substring(0, 7) === 'onmouse'
            ) {
              // Rename some of the more common atttributes from https://www.w3schools.com/tags/ref_eventattributes.asp
              // as setting them triggers a console.error (which shows up despite the try/catch)
              // Assumption: these attributes are not used to css
              node.setAttribute('_' + name, value);
            } else if (
              tagName === 'meta' &&
              n.attributes['http-equiv'] === 'Content-Security-Policy' &&
              name == 'content'
            ) {
              // If CSP contains style-src and inline-style is disabled, there will be an error "Refused to apply inline style because it violates the following Content Security Policy directive: style-src '*'".
              // And the function insertStyleRules in rrweb replayer will throw an error "Uncaught TypeError: Cannot read property 'insertRule' of null".
              node.setAttribute('csp-content', value);
              continue;
            } else {
              node.setAttribute(name, value);
            }
          } catch (error) {
            // skip invalid attribute
          }
        } else {
          // handle internal attributes
          if (tagName === 'canvas' && name === 'rr_dataURL') {
            const image = document.createElement('img');
            image.src = value;
            image.onload = () => {
              const ctx = (node as HTMLCanvasElement).getContext('2d');
              if (ctx) {
                ctx.drawImage(image, 0, 0, image.width, image.height);
              }
            };
          }
          if (name === 'rr_width') {
            (node as HTMLElement).style.width = value;
          }
          if (name === 'rr_height') {
            (node as HTMLElement).style.height = value;
          }
          if (name === 'rr_mediaState') {
            switch (value) {
              case 'played':
                (node as HTMLMediaElement).play();
              case 'paused':
                (node as HTMLMediaElement).pause();
                break;
              default:
            }
          }
        }
      }
      if (n.isShadowHost) {
        /**
         * Since node is newly rebuilt, it should be a normal element
         * without shadowRoot.
         * But if there are some weird situations that has defined
         * custom element in the scope before we rebuild node, it may
         * register the shadowRoot earlier.
         * The logic in the 'else' block is just a try-my-best solution
         * for the corner case, please let we know if it is wrong and
         * we can remove it.
         */
        if (!node.shadowRoot) {
          node.attachShadow({ mode: 'open' });
        } else {
          while (node.shadowRoot.firstChild) {
            node.shadowRoot.removeChild(node.shadowRoot.firstChild);
          }
        }
      }
      return node;
    case NodeType.Text:
      return doc.createTextNode(
        n.isStyle && hackCss ? addHoverClass(n.textContent) : n.textContent,
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
  options: {
    doc: Document;
    map: idNodeMap;
    skipChild?: boolean;
    hackCss: boolean;
    afterAppend?: (n: INode) => unknown;
  },
): INode | null {
  const { doc, map, skipChild = false, hackCss = true, afterAppend } = options;
  let node = buildNode(n, { doc, hackCss });
  if (!node) {
    return null;
  }
  if (n.rootId) {
    console.assert(
      (map[n.rootId] as unknown as Document) === doc,
      'Target document should has the same root id.',
    );
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
      const childNode = buildNodeWithSN(childN, {
        doc,
        map,
        skipChild: false,
        hackCss,
        afterAppend,
      });
      if (!childNode) {
        console.warn('Failed to rebuild', childN);
        continue;
      }

      if (childN.isShadow && isElement(node) && node.shadowRoot) {
        node.shadowRoot.appendChild(childNode);
      } else {
        node.appendChild(childNode);
      }
      if (afterAppend) {
        afterAppend(childNode);
      }
    }
  }

  return node as INode;
}

function visit(idNodeMap: idNodeMap, onVisit: (node: INode) => void) {
  function walk(node: INode) {
    onVisit(node);
  }

  for (const key in idNodeMap) {
    if (idNodeMap[key]) {
      walk(idNodeMap[key]);
    }
  }
}

function handleScroll(node: INode) {
  const n = node.__sn;
  if (n.type !== NodeType.Element) {
    return;
  }
  const el = node as Node as HTMLElement;
  for (const name in n.attributes) {
    if (!(n.attributes.hasOwnProperty(name) && name.startsWith('rr_'))) {
      continue;
    }
    const value = n.attributes[name];
    if (name === 'rr_scrollLeft') {
      el.scrollLeft = value as number;
    }
    if (name === 'rr_scrollTop') {
      el.scrollTop = value as number;
    }
  }
}

function rebuild(
  n: serializedNodeWithId,
  options: {
    doc: Document;
    onVisit?: (node: INode) => unknown;
    hackCss?: boolean;
    afterAppend?: (n: INode) => unknown;
  },
): [Node | null, idNodeMap] {
  const { doc, onVisit, hackCss = true, afterAppend } = options;
  const idNodeMap: idNodeMap = {};
  const node = buildNodeWithSN(n, {
    doc,
    map: idNodeMap,
    skipChild: false,
    hackCss,
    afterAppend,
  });
  visit(idNodeMap, (visitedNode) => {
    if (onVisit) {
      onVisit(visitedNode);
    }
    handleScroll(visitedNode);
  });
  return [node, idNodeMap];
}

export default rebuild;
