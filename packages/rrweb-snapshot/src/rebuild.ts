import { parse } from './css';
import {
  serializedNodeWithId,
  NodeType,
  tagMap,
  elementNode,
  BuildCache,
  attributes,
  legacyAttributes,
} from './types';
import { isElement, Mirror, isNodeMetaEqual } from './utils';

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
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const HOVER_SELECTOR = /([^\\]):hover/;
const HOVER_SELECTOR_GLOBAL = new RegExp(HOVER_SELECTOR.source, 'g');
export function addHoverClass(cssText: string, cache: BuildCache): string {
  const cachedStyle = cache?.stylesWithHoverClass.get(cssText);
  if (cachedStyle) return cachedStyle;

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

  if (selectors.length === 0) {
    return cssText;
  }

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

  const result = cssText.replace(selectorMatcher, (selector) => {
    const newSelector = selector.replace(HOVER_SELECTOR_GLOBAL, '$1.\\:hover');
    return `${selector}, ${newSelector}`;
  });
  cache?.stylesWithHoverClass.set(cssText, result);
  return result;
}

export function createCache(): BuildCache {
  const stylesWithHoverClass: Map<string, string> = new Map();
  return {
    stylesWithHoverClass,
  };
}

function buildNode(
  n: serializedNodeWithId,
  options: {
    doc: Document;
    hackCss: boolean;
    cache: BuildCache;
  },
): Node | null {
  const { doc, hackCss, cache } = options;
  switch (n.type) {
    case NodeType.Document:
      return doc.implementation.createDocument(null, '', null);
    case NodeType.DocumentType:
      return doc.implementation.createDocumentType(
        n.name || 'html',
        n.publicId,
        n.systemId,
      );
    case NodeType.Element: {
      const tagName = getTagName(n);
      let node: Element;
      if (n.isSVG) {
        node = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
      } else {
        node = doc.createElement(tagName);
      }
      /**
       * Attribute names start with `rr_` are internal attributes added by rrweb.
       * They often overwrite other attributes on the element.
       * We need to parse them last so they can overwrite conflicting attributes.
       */
      const specialAttributes: attributes = {};
      for (const name in n.attributes) {
        if (!Object.prototype.hasOwnProperty.call(n.attributes, name)) {
          continue;
        }
        let value = n.attributes[name];
        if (
          tagName === 'option' &&
          name === 'selected' &&
          (value as legacyAttributes[typeof name]) === false
        ) {
          // legacy fix (TODO: if `value === false` can be generated for other attrs,
          // should we also omit those other attrs from build ?)
          continue;
        }

        /**
         * Boolean attributes are considered to be true if they're present on the element at all.
         * We should set value to the empty string ("") or the attribute's name, with no leading or trailing whitespace.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute#parameters
         */
        if (value === true) value = '';

        if (name.startsWith('rr_')) {
          specialAttributes[name] = value;
          continue;
        }

        const isTextarea = tagName === 'textarea' && name === 'value';
        const isRemoteOrDynamicCss = tagName === 'style' && name === '_cssText';
        if (isRemoteOrDynamicCss && hackCss && typeof value === 'string') {
          value = addHoverClass(value, cache);
        }
        if ((isTextarea || isRemoteOrDynamicCss) && typeof value === 'string') {
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

        try {
          if (n.isSVG && name === 'xlink:href') {
            node.setAttributeNS(
              'http://www.w3.org/1999/xlink',
              name,
              value.toString(),
            );
          } else if (
            name === 'onload' ||
            name === 'onclick' ||
            name.substring(0, 7) === 'onmouse'
          ) {
            // Rename some of the more common atttributes from https://www.w3schools.com/tags/ref_eventattributes.asp
            // as setting them triggers a console.error (which shows up despite the try/catch)
            // Assumption: these attributes are not used to css
            node.setAttribute('_' + name, value.toString());
          } else if (
            tagName === 'meta' &&
            n.attributes['http-equiv'] === 'Content-Security-Policy' &&
            name === 'content'
          ) {
            // If CSP contains style-src and inline-style is disabled, there will be an error "Refused to apply inline style because it violates the following Content Security Policy directive: style-src '*'".
            // And the function insertStyleRules in rrweb replayer will throw an error "Uncaught TypeError: Cannot read property 'insertRule' of null".
            node.setAttribute('csp-content', value.toString());
            continue;
          } else if (
            tagName === 'link' &&
            n.attributes.rel === 'preload' &&
            n.attributes.as === 'script'
          ) {
            // ignore
          } else if (
            tagName === 'link' &&
            n.attributes.rel === 'prefetch' &&
            typeof n.attributes.href === 'string' &&
            n.attributes.href.endsWith('.js')
          ) {
            // ignore
          } else if (
            tagName === 'img' &&
            n.attributes.srcset &&
            n.attributes.rr_dataURL
          ) {
            // backup original img srcset
            node.setAttribute(
              'rrweb-original-srcset',
              n.attributes.srcset as string,
            );
          } else {
            node.setAttribute(name, value.toString());
          }
        } catch (error) {
          // skip invalid attribute
        }
      }

      for (const name in specialAttributes) {
        const value = specialAttributes[name];
        // handle internal attributes
        if (tagName === 'canvas' && name === 'rr_dataURL') {
          const image = document.createElement('img');
          image.onload = () => {
            const ctx = (node as HTMLCanvasElement).getContext('2d');
            if (ctx) {
              ctx.drawImage(image, 0, 0, image.width, image.height);
            }
          };
          image.src = value.toString();
          type RRCanvasElement = {
            RRNodeType: NodeType;
            rr_dataURL: string;
          };
          // If the canvas element is created in RRDom runtime (seeking to a time point), the canvas context isn't supported. So the data has to be stored and not handled until diff process. https://github.com/rrweb-io/rrweb/pull/944
          if ((node as unknown as RRCanvasElement).RRNodeType)
            (node as unknown as RRCanvasElement).rr_dataURL = value.toString();
        } else if (tagName === 'img' && name === 'rr_dataURL') {
          const image = node as HTMLImageElement;
          if (!image.currentSrc.startsWith('data:')) {
            // Backup original img src. It may not have been set yet.
            image.setAttribute(
              'rrweb-original-src',
              n.attributes.src as string,
            );
            image.src = value.toString();
          }
        }

        if (name === 'rr_width') {
          (node as HTMLElement).style.width = value.toString();
        } else if (name === 'rr_height') {
          (node as HTMLElement).style.height = value.toString();
        } else if (
          name === 'rr_mediaCurrentTime' &&
          typeof value === 'number'
        ) {
          (node as HTMLMediaElement).currentTime = value;
        } else if (name === 'rr_mediaState') {
          switch (value) {
            case 'played':
              (node as HTMLMediaElement)
                .play()
                .catch((e) => console.warn('media playback error', e));
              break;
            case 'paused':
              (node as HTMLMediaElement).pause();
              break;
            default:
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
    }
    case NodeType.Text:
      return doc.createTextNode(
        n.isStyle && hackCss
          ? addHoverClass(n.textContent, cache)
          : n.textContent,
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
    mirror: Mirror;
    skipChild?: boolean;
    hackCss: boolean;
    /**
     * This callback will be called for each of this nodes' `.childNodes` after they are appended to _this_ node.
     * Caveat: This callback _doesn't_ get called when this node is appended to the DOM.
     */
    afterAppend?: (n: Node, id: number) => unknown;
    cache: BuildCache;
  },
): Node | null {
  const {
    doc,
    mirror,
    skipChild = false,
    hackCss = true,
    afterAppend,
    cache,
  } = options;
  /**
   * Add a check to see if the node is already in the mirror. If it is, we can skip the whole process.
   * This situation (duplicated nodes) can happen when recorder has some unfixed bugs and the same node is recorded twice. Or something goes wrong when saving or transferring event data.
   * Duplicated node creation may cause unexpected errors in replayer. This check tries best effort to prevent the errors.
   */
  if (mirror.has(n.id)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nodeInMirror = mirror.getNode(n.id)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const meta = mirror.getMeta(nodeInMirror)!;
    // For safety concern, check if the node in mirror is the same as the node we are trying to build
    if (isNodeMetaEqual(meta, n)) return mirror.getNode(n.id);
  }
  let node = buildNode(n, { doc, hackCss, cache });
  if (!node) {
    return null;
  }
  // If the snapshot is created by checkout, the rootId doesn't change but the iframe's document can be changed automatically when a new iframe element is created.
  if (n.rootId && (mirror.getNode(n.rootId) as Document) !== doc) {
    mirror.replace(n.rootId, doc);
  }
  // use target document as root document
  if (n.type === NodeType.Document) {
    // close before open to make sure document was closed
    doc.close();
    doc.open();
    if (
      n.compatMode === 'BackCompat' &&
      n.childNodes &&
      n.childNodes[0].type !== NodeType.DocumentType // there isn't one already defined
    ) {
      // Trigger compatMode in the iframe
      // this is needed as document.createElement('iframe') otherwise inherits a CSS1Compat mode from the parent replayer environment
      if (
        n.childNodes[0].type === NodeType.Element &&
        'xmlns' in n.childNodes[0].attributes &&
        n.childNodes[0].attributes.xmlns === 'http://www.w3.org/1999/xhtml'
      ) {
        // might as well use an xhtml doctype if we've got an xhtml namespace
        doc.write(
          '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">',
        );
      } else {
        doc.write(
          '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">',
        );
      }
    }
    node = doc;
  }

  mirror.add(node, n);

  if (
    (n.type === NodeType.Document || n.type === NodeType.Element) &&
    !skipChild
  ) {
    for (const childN of n.childNodes) {
      const childNode = buildNodeWithSN(childN, {
        doc,
        mirror,
        skipChild: false,
        hackCss,
        afterAppend,
        cache,
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
        afterAppend(childNode, childN.id);
      }
    }
  }

  return node;
}

function visit(mirror: Mirror, onVisit: (node: Node) => void) {
  function walk(node: Node) {
    onVisit(node);
  }

  for (const id of mirror.getIds()) {
    if (mirror.has(id)) {
      walk(mirror.getNode(id)!);
    }
  }
}

function handleScroll(node: Node, mirror: Mirror) {
  const n = mirror.getMeta(node);
  if (n?.type !== NodeType.Element) {
    return;
  }
  const el = node as HTMLElement;
  for (const name in n.attributes) {
    if (
      !(
        Object.prototype.hasOwnProperty.call(n.attributes, name) &&
        name.startsWith('rr_')
      )
    ) {
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
    onVisit?: (node: Node) => unknown;
    hackCss?: boolean;
    afterAppend?: (n: Node, id: number) => unknown;
    cache: BuildCache;
    mirror: Mirror;
  },
): Node | null {
  const {
    doc,
    onVisit,
    hackCss = true,
    afterAppend,
    cache,
    mirror = new Mirror(),
  } = options;
  const node = buildNodeWithSN(n, {
    doc,
    mirror,
    skipChild: false,
    hackCss,
    afterAppend,
    cache,
  });
  visit(mirror, (visitedNode) => {
    if (onVisit) {
      onVisit(visitedNode);
    }
    handleScroll(visitedNode, mirror);
  });
  return node;
}

export default rebuild;
