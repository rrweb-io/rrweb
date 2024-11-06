import { mediaSelectorPlugin, pseudoClassPlugin } from './css';
import {
  type serializedNodeWithId,
  type serializedElementNodeWithId,
  type serializedTextNodeWithId,
  NodeType,
  type tagMap,
  type elementNode,
  type BuildCache,
  type legacyAttributes,
} from './types';
import { isElement, Mirror, isNodeMetaEqual } from './utils';
import postcss from 'postcss';

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

export function adaptCssForReplay(
  cssText: string,
  cache: BuildCache,
  removeAnimationCss = false,
): string {
  const cachedStyle = cache?.stylesWithHoverClass.get(cssText);
  if (cachedStyle) return cachedStyle;

  const ast: { css: string } = postcss([
    mediaSelectorPlugin,
    pseudoClassPlugin,
  ]).process(cssText);
  let result = ast.css;
  if (removeAnimationCss) result = result.replace(/animation.+?;/g, '');
  cache?.stylesWithHoverClass.set(cssText, result);
  return result;
}

export function createCache(): BuildCache {
  const stylesWithHoverClass: Map<string, string> = new Map();
  return {
    stylesWithHoverClass,
  };
}

/**
 * undo splitCssText/markCssSplits
 * (would move to utils.ts but uses `adaptCssForReplay`)
 */
export function applyCssSplits(
  n: serializedElementNodeWithId,
  cssText: string,
  hackCss: boolean,
  cache: BuildCache,
  removeAnimationCss: boolean,
): void {
  const childTextNodes: serializedTextNodeWithId[] = [];
  for (const scn of n.childNodes) {
    if (scn.type === NodeType.Text) {
      childTextNodes.push(scn);
    }
  }
  const cssTextSplits = cssText.split('/* rr_split */');
  while (
    cssTextSplits.length > 1 &&
    cssTextSplits.length > childTextNodes.length
  ) {
    // unexpected: remerge the last two so that we don't discard any css
    cssTextSplits.splice(-2, 2, cssTextSplits.slice(-2).join(''));
  }
  for (let i = 0; i < childTextNodes.length; i++) {
    const childTextNode = childTextNodes[i];
    const cssTextSection = cssTextSplits[i];
    if (childTextNode && cssTextSection) {
      // id will be assigned when these child nodes are
      // iterated over in buildNodeWithSN
      childTextNode.textContent = hackCss
        ? adaptCssForReplay(cssTextSection, cache, removeAnimationCss)
        : cssTextSection;
    }
  }
}

/**
 * Normally a <style> element has a single textNode containing the rules.
 * During serialization, we bypass this (`styleEl.sheet`) to get the rules the
 * browser sees and serialize this to a special _cssText attribute, blanking
 * out any text nodes. This function reverses that and also handles cases where
 * there were no textNode children present (dynamic css/or a <link> element) as
 * well as multiple textNodes, which need to be repopulated (based on presence of
 * a special `rr_split` marker in case they are modified by subsequent mutations.
 */
export function buildStyleNode(
  n: serializedElementNodeWithId,
  styleEl: HTMLStyleElement, // when inlined, a <link type="stylesheet"> also gets rebuilt as a <style>
  cssText: string,
  options: {
    doc: Document;
    hackCss: boolean;
    cache: BuildCache;
    removeAnimationCss: boolean;
  },
) {
  const { doc, hackCss, cache, removeAnimationCss } = options;
  if (n.childNodes.length) {
    applyCssSplits(n, cssText, hackCss, cache, removeAnimationCss);
  } else {
    if (hackCss) {
      cssText = adaptCssForReplay(cssText, cache, removeAnimationCss);
    }
    /**
       <link> element or dynamic <style> are serialized without any child nodes
       we create the text node without an ID or presence in mirror as it can't
    */
    styleEl.appendChild(doc.createTextNode(cssText));
  }
}

function buildNode(
  n: serializedNodeWithId,
  options: {
    doc: Document;
    hackCss: boolean;
    cache: BuildCache;
    removeAnimationCss: boolean;
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
        if (
          // If the tag name is a custom element name
          n.isCustom &&
          // If the browser supports custom elements
          doc.defaultView?.customElements &&
          // If the custom element hasn't been defined yet
          !doc.defaultView.customElements.get(n.tagName)
        )
          doc.defaultView.customElements.define(
            n.tagName,
            class extends doc.defaultView.HTMLElement {},
          );
        node = doc.createElement(tagName);
      }
      /**
       * Attribute names start with `rr_` are internal attributes added by rrweb.
       * They often overwrite other attributes on the element.
       * We need to parse them last so they can overwrite conflicting attributes.
       */
      const specialAttributes: { [key: string]: string | number } = {};
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

        // null values mean the attribute was removed
        if (value === null) {
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

        if (typeof value !== 'string') {
          // pass
        } else if (tagName === 'style' && name === '_cssText') {
          buildStyleNode(n, node as HTMLStyleElement, value, options);
          continue; // no need to set _cssText as attribute
        } else if (tagName === 'textarea' && name === 'value') {
          // create without an ID or presence in mirror
          node.appendChild(doc.createTextNode(value));
          n.childNodes = []; // value overrides childNodes
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
            (n.attributes.rel === 'preload' ||
              n.attributes.rel === 'modulepreload') &&
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
          const image = doc.createElement('img');
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
          (node as HTMLElement).style.setProperty('width', value.toString());
        } else if (name === 'rr_height') {
          (node as HTMLElement).style.setProperty('height', value.toString());
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
        } else if (
          name === 'rr_mediaPlaybackRate' &&
          typeof value === 'number'
        ) {
          (node as HTMLMediaElement).playbackRate = value;
        } else if (name === 'rr_mediaMuted' && typeof value === 'boolean') {
          (node as HTMLMediaElement).muted = value;
        } else if (name === 'rr_mediaLoop' && typeof value === 'boolean') {
          (node as HTMLMediaElement).loop = value;
        } else if (name === 'rr_mediaVolume' && typeof value === 'number') {
          (node as HTMLMediaElement).volume = value;
        } else if (name === 'rr_open_mode') {
          (node as HTMLDialogElement).setAttribute(
            'rr_open_mode',
            value as string,
          ); // keep this attribute for rrweb to trigger showModal
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
      if (n.isStyle && hackCss) {
        // support legacy style
        return doc.createTextNode(adaptCssForReplay(n.textContent, cache));
      }
      return doc.createTextNode(n.textContent);
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
    removeAnimationCss: boolean;
  },
): Node | null {
  const {
    doc,
    mirror,
    skipChild = false,
    hackCss = true,
    afterAppend,
    cache,
    removeAnimationCss,
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
  let node = buildNode(n, { doc, hackCss, cache, removeAnimationCss });
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
        removeAnimationCss,
      });
      if (!childNode) {
        console.warn('Failed to rebuild', childN);
        continue;
      }

      if (childN.isShadow && isElement(node) && node.shadowRoot) {
        node.shadowRoot.appendChild(childNode);
      } else if (
        n.type === NodeType.Document &&
        childN.type == NodeType.Element
      ) {
        const htmlElement = childNode as HTMLElement;
        let body: HTMLBodyElement | null = null;
        htmlElement.childNodes.forEach((child) => {
          if (child.nodeName === 'BODY') body = child as HTMLBodyElement;
        });
        if (body) {
          // this branch solves a problem in Firefox where css transitions are incorrectly
          // being applied upon rebuild.  Presumably FF doesn't finished parsing the styles
          // in time, and applies e.g. a default margin:0 to elements which have a non-zero
          // margin set in CSS, along with a transition on them
          htmlElement.removeChild(body);
          // append <head> and <style>s
          node.appendChild(childNode);
          // now append <body>
          htmlElement.appendChild(body);
        } else {
          node.appendChild(childNode);
        }
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    removeAnimationCss: boolean;
  },
): Node | null {
  const {
    doc,
    onVisit,
    hackCss = true,
    afterAppend,
    cache,
    mirror = new Mirror(),
    removeAnimationCss,
  } = options;
  const node = buildNodeWithSN(n, {
    doc,
    mirror,
    skipChild: false,
    hackCss,
    afterAppend,
    cache,
    removeAnimationCss,
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
