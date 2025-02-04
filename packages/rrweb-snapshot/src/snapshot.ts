import type {
  MaskInputOptions,
  SlimDOMOptions,
  MaskTextFn,
  MaskInputFn,
  KeepIframeSrcFn,
  ICanvas,
  DialogAttributes,
} from './types';
import { NodeType } from '@rrweb/types';
import type {
  serializedNode,
  serializedNodeWithId,
  serializedElementNodeWithId,
  elementNode,
  attributes,
  mediaAttributes,
  DataURLOptions,
} from '@rrweb/types';
import {
  Mirror,
  is2DCanvasBlank,
  isElement,
  isShadowRoot,
  maskInputValue,
  isNativeShadowDom,
  stringifyStylesheet,
  getInputType,
  toLowerCase,
  extractFileExtension,
  absolutifyURLs,
  markCssSplits,
} from './utils';
import dom from '@rrweb/utils';

let _id = 1;
const tagNameRegex = new RegExp('[^a-z0-9-_:]');

export const IGNORED_NODE = -2;

export function genId(): number {
  return _id++;
}

function getValidTagName(element: HTMLElement): Lowercase<string> {
  if (element instanceof HTMLFormElement) {
    return 'form';
  }

  const processedTagName = toLowerCase(element.tagName);

  if (tagNameRegex.test(processedTagName)) {
    // if the tag name is odd and we cannot extract
    // anything from the string, then we return a
    // generic div
    return 'div';
  }

  return processedTagName;
}

let canvasService: HTMLCanvasElement | null;
let canvasCtx: CanvasRenderingContext2D | null;

// eslint-disable-next-line no-control-regex
const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/; // Don't use \s, to avoid matching non-breaking space
// eslint-disable-next-line no-control-regex
const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc: Document, attributeValue: string) {
  /*
    run absoluteToDoc over every url in the srcset

    this is adapted from https://github.com/albell/parse-srcset/
    without the parsing of the descriptors (we return these as-is)
    parce-srcset is in turn based on
    https://html.spec.whatwg.org/multipage/embedded-content.html#parse-a-srcset-attribute
  */
  if (attributeValue.trim() === '') {
    return attributeValue;
  }

  let pos = 0;

  function collectCharacters(regEx: RegExp) {
    let chars: string;
    const match = regEx.exec(attributeValue.substring(pos));
    if (match) {
      chars = match[0];
      pos += chars.length;
      return chars;
    }
    return '';
  }

  const output = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    collectCharacters(SRCSET_COMMAS_OR_SPACES);
    if (pos >= attributeValue.length) {
      break;
    }
    // don't split on commas within urls
    let url = collectCharacters(SRCSET_NOT_SPACES);
    if (url.slice(-1) === ',') {
      // aside: according to spec more than one comma at the end is a parse error, but we ignore that
      url = absoluteToDoc(doc, url.substring(0, url.length - 1));
      // the trailing comma splits the srcset, so the interpretion is that
      // another url will follow, and the descriptor is empty
      output.push(url);
    } else {
      let descriptorsStr = '';
      url = absoluteToDoc(doc, url);
      let inParens = false;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const c = attributeValue.charAt(pos);
        if (c === '') {
          output.push((url + descriptorsStr).trim());
          break;
        } else if (!inParens) {
          if (c === ',') {
            pos += 1;
            output.push((url + descriptorsStr).trim());
            break; // parse the next url
          } else if (c === '(') {
            inParens = true;
          }
        } else {
          // in parenthesis; ignore commas
          // (parenthesis may be supported by future additions to spec)
          if (c === ')') {
            inParens = false;
          }
        }
        descriptorsStr += c;
        pos += 1;
      }
    }
  }
  return output.join(', ');
}

const cachedDocument = new WeakMap<Document, HTMLAnchorElement>();

export function absoluteToDoc(doc: Document, attributeValue: string): string {
  if (!attributeValue || attributeValue.trim() === '') {
    return attributeValue;
  }

  return getHref(doc, attributeValue);
}

function isSVGElement(el: Element): boolean {
  return Boolean(el.tagName === 'svg' || (el as SVGElement).ownerSVGElement);
}

function getHref(doc: Document, customHref?: string) {
  let a = cachedDocument.get(doc);
  if (!a) {
    a = doc.createElement('a');
    cachedDocument.set(doc, a);
  }
  if (!customHref) {
    customHref = '';
  } else if (customHref.startsWith('blob:') || customHref.startsWith('data:')) {
    return customHref;
  }
  // note: using `new URL` is slower. See #1434 or https://jsbench.me/uqlud17rxo/1
  a.setAttribute('href', customHref);
  return a.href;
}

export function transformAttribute(
  doc: Document,
  tagName: Lowercase<string>,
  name: Lowercase<string>,
  value: string | null,
): string | null {
  if (!value) {
    return value;
  }

  // relative path in attribute
  if (
    name === 'src' ||
    (name === 'href' && !(tagName === 'use' && value[0] === '#'))
  ) {
    // href starts with a # is an id pointer for svg
    return absoluteToDoc(doc, value);
  } else if (name === 'xlink:href' && value[0] !== '#') {
    // xlink:href starts with # is an id pointer
    return absoluteToDoc(doc, value);
  } else if (
    name === 'background' &&
    (tagName === 'table' || tagName === 'td' || tagName === 'th')
  ) {
    return absoluteToDoc(doc, value);
  } else if (name === 'srcset') {
    return getAbsoluteSrcsetString(doc, value);
  } else if (name === 'style') {
    return absolutifyURLs(value, getHref(doc));
  } else if (tagName === 'object' && name === 'data') {
    return absoluteToDoc(doc, value);
  }

  return value;
}

export function ignoreAttribute(
  tagName: string,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _value: unknown,
): boolean {
  return (tagName === 'video' || tagName === 'audio') && name === 'autoplay';
}

export function _isBlockedElement(
  element: HTMLElement,
  blockClass: string | RegExp,
  blockSelector: string | null,
): boolean {
  try {
    if (typeof blockClass === 'string') {
      if (element.classList.contains(blockClass)) {
        return true;
      }
    } else {
      for (let eIndex = element.classList.length; eIndex--; ) {
        const className = element.classList[eIndex];
        if (blockClass.test(className)) {
          return true;
        }
      }
    }
    if (blockSelector) {
      return element.matches(blockSelector);
    }
  } catch (e) {
    //
  }

  return false;
}

export function classMatchesRegex(
  node: Node | null,
  regex: RegExp,
  checkAncestors: boolean,
): boolean {
  if (!node) return false;
  if (node.nodeType !== node.ELEMENT_NODE) {
    if (!checkAncestors) return false;
    return classMatchesRegex(dom.parentNode(node), regex, checkAncestors);
  }

  for (let eIndex = (node as HTMLElement).classList.length; eIndex--; ) {
    const className = (node as HTMLElement).classList[eIndex];
    if (regex.test(className)) {
      return true;
    }
  }
  if (!checkAncestors) return false;
  return classMatchesRegex(dom.parentNode(node), regex, checkAncestors);
}

export function needMaskingText(
  node: Node,
  maskTextClass: string | RegExp,
  maskTextSelector: string | null,
  checkAncestors: boolean,
): boolean {
  let el: Element;
  if (isElement(node)) {
    el = node;
    if (!dom.childNodes(el).length) {
      // optimisation: we can avoid any of the below checks on leaf elements
      // as masking is applied to child text nodes only
      return false;
    }
  } else if (dom.parentElement(node) === null) {
    // should warn? maybe a text node isn't attached to a parent node yet?
    return false;
  } else {
    el = dom.parentElement(node)!;
  }
  try {
    if (typeof maskTextClass === 'string') {
      if (checkAncestors) {
        if (el.closest(`.${maskTextClass}`)) return true;
      } else {
        if (el.classList.contains(maskTextClass)) return true;
      }
    } else {
      if (classMatchesRegex(el, maskTextClass, checkAncestors)) return true;
    }
    if (maskTextSelector) {
      if (checkAncestors) {
        if (el.closest(maskTextSelector)) return true;
      } else {
        if (el.matches(maskTextSelector)) return true;
      }
    }
  } catch (e) {
    //
  }
  return false;
}

// https://stackoverflow.com/a/36155560
function onceIframeLoaded(
  iframeEl: HTMLIFrameElement,
  listener: () => unknown,
  iframeLoadTimeout: number,
) {
  const win = iframeEl.contentWindow;
  if (!win) {
    return;
  }
  // document is loading
  let fired = false;

  let readyState: DocumentReadyState;
  try {
    readyState = win.document.readyState;
  } catch (error) {
    return;
  }
  if (readyState !== 'complete') {
    const timer = setTimeout(() => {
      if (!fired) {
        listener();
        fired = true;
      }
    }, iframeLoadTimeout);
    iframeEl.addEventListener('load', () => {
      clearTimeout(timer);
      fired = true;
      listener();
    });
    return;
  }
  // check blank frame for Chrome
  const blankUrl = 'about:blank';
  if (
    win.location.href !== blankUrl ||
    iframeEl.src === blankUrl ||
    iframeEl.src === ''
  ) {
    // iframe was already loaded, make sure we wait to trigger the listener
    // till _after_ the mutation that found this iframe has had time to process
    setTimeout(listener, 0);

    return iframeEl.addEventListener('load', listener); // keep listing for future loads
  }
  // use default listener
  iframeEl.addEventListener('load', listener);
}

function onceStylesheetLoaded(
  link: HTMLLinkElement,
  listener: () => unknown,
  styleSheetLoadTimeout: number,
) {
  let fired = false;
  let styleSheetLoaded: StyleSheet | null;
  try {
    styleSheetLoaded = link.sheet;
  } catch (error) {
    return;
  }

  if (styleSheetLoaded) return;

  const timer = setTimeout(() => {
    if (!fired) {
      listener();
      fired = true;
    }
  }, styleSheetLoadTimeout);

  link.addEventListener('load', () => {
    clearTimeout(timer);
    fired = true;
    listener();
  });
}

function serializeNode(
  n: Node,
  options: {
    doc: Document;
    mirror: Mirror;
    blockClass: string | RegExp;
    blockSelector: string | null;
    needsMask: boolean;
    inlineStylesheet: boolean;
    maskInputOptions: MaskInputOptions;
    maskTextFn: MaskTextFn | undefined;
    maskInputFn: MaskInputFn | undefined;
    dataURLOptions?: DataURLOptions;
    inlineImages: boolean;
    recordCanvas: boolean;
    keepIframeSrcFn: KeepIframeSrcFn;
    /**
     * `newlyAddedElement: true` skips scrollTop and scrollLeft check
     */
    newlyAddedElement?: boolean;
    cssCaptured?: boolean;
  },
): serializedNode | false {
  const {
    doc,
    mirror,
    blockClass,
    blockSelector,
    needsMask,
    inlineStylesheet,
    maskInputOptions = {},
    maskTextFn,
    maskInputFn,
    dataURLOptions = {},
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement = false,
    cssCaptured = false,
  } = options;
  // Only record root id when document object is not the base document
  const rootId = getRootId(doc, mirror);
  switch (n.nodeType) {
    case n.DOCUMENT_NODE:
      if ((n as Document).compatMode !== 'CSS1Compat') {
        return {
          type: NodeType.Document,
          childNodes: [],
          compatMode: (n as Document).compatMode, // probably "BackCompat"
        };
      } else {
        return {
          type: NodeType.Document,
          childNodes: [],
        };
      }
    case n.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType.DocumentType,
        name: (n as DocumentType).name,
        publicId: (n as DocumentType).publicId,
        systemId: (n as DocumentType).systemId,
        rootId,
      };
    case n.ELEMENT_NODE:
      return serializeElementNode(n as HTMLElement, {
        doc,
        blockClass,
        blockSelector,
        inlineStylesheet,
        maskInputOptions,
        maskInputFn,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        keepIframeSrcFn,
        newlyAddedElement,
        rootId,
      });
    case n.TEXT_NODE:
      return serializeTextNode(n as Text, {
        doc,
        needsMask,
        maskTextFn,
        rootId,
        cssCaptured,
      });
    case n.CDATA_SECTION_NODE:
      return {
        type: NodeType.CDATA,
        textContent: '',
        rootId,
      };
    case n.COMMENT_NODE:
      return {
        type: NodeType.Comment,
        textContent: dom.textContent(n as Comment) || '',
        rootId,
      };
    default:
      return false;
  }
}

function getRootId(doc: Document, mirror: Mirror): number | undefined {
  if (!mirror.hasNode(doc)) return undefined;
  const docId = mirror.getId(doc);
  return docId === 1 ? undefined : docId;
}

function serializeTextNode(
  n: Text,
  options: {
    doc: Document;
    needsMask: boolean;
    maskTextFn: MaskTextFn | undefined;
    rootId: number | undefined;
    cssCaptured?: boolean;
  },
): serializedNode {
  const { needsMask, maskTextFn, rootId, cssCaptured } = options;
  // The parent node may not be a html element which has a tagName attribute.
  // So just let it be undefined which is ok in this use case.
  const parent = dom.parentNode(n);
  const parentTagName = parent && (parent as HTMLElement).tagName;
  let textContent: string | null = '';
  const isStyle = parentTagName === 'STYLE' ? true : undefined;
  const isScript = parentTagName === 'SCRIPT' ? true : undefined;
  if (isScript) {
    textContent = 'SCRIPT_PLACEHOLDER';
  } else if (!cssCaptured) {
    textContent = dom.textContent(n);
    if (isStyle && textContent) {
      // mutation only: we don't need to use stringifyStylesheet
      // as a <style> text node mutation obliterates any previous
      // programmatic rule manipulation (.insertRule etc.)
      // so the current textContent represents the most up to date state
      textContent = absolutifyURLs(textContent, getHref(options.doc));
    }
  }
  if (!isStyle && !isScript && textContent && needsMask) {
    textContent = maskTextFn
      ? maskTextFn(textContent, dom.parentElement(n))
      : textContent.replace(/[\S]/g, '*');
  }

  return {
    type: NodeType.Text,
    textContent: textContent || '',
    rootId,
  };
}

function serializeElementNode(
  n: HTMLElement,
  options: {
    doc: Document;
    blockClass: string | RegExp;
    blockSelector: string | null;
    inlineStylesheet: boolean;
    maskInputOptions: MaskInputOptions;
    maskInputFn: MaskInputFn | undefined;
    dataURLOptions?: DataURLOptions;
    inlineImages: boolean;
    recordCanvas: boolean;
    keepIframeSrcFn: KeepIframeSrcFn;
    /**
     * `newlyAddedElement: true` skips scrollTop and scrollLeft check
     */
    newlyAddedElement?: boolean;
    rootId: number | undefined;
  },
): serializedNode | false {
  const {
    doc,
    blockClass,
    blockSelector,
    inlineStylesheet,
    maskInputOptions = {},
    maskInputFn,
    dataURLOptions = {},
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement = false,
    rootId,
  } = options;
  const needBlock = _isBlockedElement(n, blockClass, blockSelector);
  const tagName = getValidTagName(n);
  let attributes: attributes = {};
  const len = n.attributes.length;
  for (let i = 0; i < len; i++) {
    const attr = n.attributes[i];
    if (!ignoreAttribute(tagName, attr.name, attr.value)) {
      attributes[attr.name] = transformAttribute(
        doc,
        tagName,
        toLowerCase(attr.name),
        attr.value,
      );
    }
  }
  // remote css
  if (tagName === 'link' && inlineStylesheet) {
    //TODO: maybe replace this `.styleSheets` with original one
    const stylesheet = Array.from(doc.styleSheets).find((s) => {
      return s.href === (n as HTMLLinkElement).href;
    });
    let cssText: string | null = null;
    if (stylesheet) {
      cssText = stringifyStylesheet(stylesheet);
    }
    if (cssText) {
      delete attributes.rel;
      delete attributes.href;
      attributes._cssText = cssText;
    }
  }
  if (tagName === 'style' && (n as HTMLStyleElement).sheet) {
    let cssText = stringifyStylesheet(
      (n as HTMLStyleElement).sheet as CSSStyleSheet,
    );
    if (cssText) {
      if (n.childNodes.length > 1) {
        cssText = markCssSplits(cssText, n as HTMLStyleElement);
      }
      attributes._cssText = cssText;
    }
  }
  // form fields
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    const value = (n as HTMLInputElement | HTMLTextAreaElement).value;
    const checked = (n as HTMLInputElement).checked;
    if (
      attributes.type !== 'radio' &&
      attributes.type !== 'checkbox' &&
      attributes.type !== 'submit' &&
      attributes.type !== 'button' &&
      value
    ) {
      attributes.value = maskInputValue({
        element: n,
        type: getInputType(n),
        tagName,
        value,
        maskInputOptions,
        maskInputFn,
      });
    } else if (checked) {
      attributes.checked = checked;
    }
  }
  if (tagName === 'option') {
    if ((n as HTMLOptionElement).selected && !maskInputOptions['select']) {
      attributes.selected = true;
    } else {
      // ignore the html attribute (which corresponds to DOM (n as HTMLOptionElement).defaultSelected)
      // if it's already been changed
      delete attributes.selected;
    }
  }

  if (tagName === 'dialog' && (n as HTMLDialogElement).open) {
    // register what type of dialog is this
    // `modal` or `non-modal`
    // this is used to trigger `showModal()` or `show()` on replay (outside of rrweb-snapshot, in rrweb)
    (attributes as DialogAttributes).rr_open_mode = n.matches('dialog:modal')
      ? 'modal'
      : 'non-modal';
  }

  // canvas image data
  if (tagName === 'canvas' && recordCanvas) {
    if ((n as ICanvas).__context === '2d') {
      // only record this on 2d canvas
      if (!is2DCanvasBlank(n as HTMLCanvasElement)) {
        attributes.rr_dataURL = (n as HTMLCanvasElement).toDataURL(
          dataURLOptions.type,
          dataURLOptions.quality,
        );
      }
    } else if (!('__context' in n)) {
      // context is unknown, better not call getContext to trigger it
      const canvasDataURL = (n as HTMLCanvasElement).toDataURL(
        dataURLOptions.type,
        dataURLOptions.quality,
      );

      // create blank canvas of same dimensions
      const blankCanvas = doc.createElement('canvas');
      blankCanvas.width = (n as HTMLCanvasElement).width;
      blankCanvas.height = (n as HTMLCanvasElement).height;
      const blankCanvasDataURL = blankCanvas.toDataURL(
        dataURLOptions.type,
        dataURLOptions.quality,
      );

      // no need to save dataURL if it's the same as blank canvas
      if (canvasDataURL !== blankCanvasDataURL) {
        attributes.rr_dataURL = canvasDataURL;
      }
    }
  }
  // Save image offline
  if (tagName === 'img' && inlineImages) {
    if (!canvasService) {
      canvasService = doc.createElement('canvas');
      canvasCtx = canvasService.getContext('2d');
    }
    const image = n as HTMLImageElement;
    const imageSrc: string =
      image.currentSrc || image.getAttribute('src') || '<unknown-src>';
    const priorCrossOrigin = image.crossOrigin;
    let retryingWithAnonymous = false;
    const recordInlineImage = () => {
      image.removeEventListener('load', recordInlineImage);
      try {
        canvasService!.width = image.naturalWidth;
        canvasService!.height = image.naturalHeight;
        canvasCtx!.drawImage(image, 0, 0);
        attributes.rr_dataURL = canvasService!.toDataURL(
          dataURLOptions.type,
          dataURLOptions.quality,
        );
      } catch (err) {
        if (!retryingWithAnonymous && image.crossOrigin !== 'anonymous') {
          console.warn(
            `Retrying with crossOrigin='anonymous' for img src=${imageSrc}`,
          );
          retryingWithAnonymous = true; // Prevent infinite loop
          image.crossOrigin = 'anonymous';
          image.addEventListener('load', recordInlineImage, { once: true });
          image.src = imageSrc; // Reload image
        } else {
          console.warn(
            `Cannot inline img src=${imageSrc}! Error: ${err as string}`,
          );
        }
      }
      if (image.crossOrigin === 'anonymous') {
        priorCrossOrigin
          ? (attributes.crossOrigin = priorCrossOrigin)
          : image.removeAttribute('crossorigin');
        try {
          if (!attributes.rr_dataURL) {
            const convertImageToDataURL = (
              img: HTMLImageElement,
            ): Promise<string | null> => {
              return new Promise((resolve, reject) => {
                const fetchImage = (mode: RequestMode) => {
                  fetch(img.src, { mode })
                    .then((response) => {
                      if (!response.ok && mode !== 'no-cors') {
                        throw new Error(
                          `Failed to fetch image: ${response.status}`,
                        );
                      }
                      return response.blob();
                    })
                    .then((blob) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.onerror = () =>
                        reject(new Error('Failed to read image as Data URL'));
                      reader.readAsDataURL(blob);
                    })
                    .catch((err) => {
                      if (mode === 'no-cors') {
                        console.warn(
                          'Both normal fetch and no-cors fetch failed:',
                          err,
                        );
                        reject(new Error('Network error while fetching image'));
                      } else {
                        console.warn(
                          'Fetch failed, retrying with no-cors:',
                          err,
                        );
                        fetchImage('no-cors'); // Retry with 'no-cors'
                      }
                    });
                };
                fetchImage('cors');
              });
            };
            convertImageToDataURL(image)
              .then((dataURL) => {
                attributes.rr_dataURL = dataURL;
              })
              .catch((err) => {
                console.warn(
                  `Failed to generate rr_dataURL for ${image.src}:`,
                  err,
                );
                attributes.rr_dataURL = null; // Ensure it doesn't remain undefined
              });
          }
        } catch (err) {
          console.warn(`Failed to generate rr_dataURL for ${imageSrc}:`, err);
          attributes.rr_dataURL = null; // Ensure it doesn't remain undefined
        }
        image.src = imageSrc; // Force reload with new crossOrigin
      }
    };
    // Handle already loaded images
    if (image.complete && image.naturalWidth !== 0) {
      recordInlineImage();
    } else {
      image.addEventListener('load', recordInlineImage, { once: true });
    }
  }
  // media elements
  if (tagName === 'audio' || tagName === 'video') {
    const mediaAttributes = attributes as mediaAttributes;
    mediaAttributes.rr_mediaState = (n as HTMLMediaElement).paused
      ? 'paused'
      : 'played';
    mediaAttributes.rr_mediaCurrentTime = (n as HTMLMediaElement).currentTime;
    mediaAttributes.rr_mediaPlaybackRate = (n as HTMLMediaElement).playbackRate;
    mediaAttributes.rr_mediaMuted = (n as HTMLMediaElement).muted;
    mediaAttributes.rr_mediaLoop = (n as HTMLMediaElement).loop;
    mediaAttributes.rr_mediaVolume = (n as HTMLMediaElement).volume;
  }
  // Scroll
  if (!newlyAddedElement) {
    // `scrollTop` and `scrollLeft` are expensive calls because they trigger reflow.
    // Since `scrollTop` & `scrollLeft` are always 0 when an element is added to the DOM.
    // And scrolls also get picked up by rrweb's ScrollObserver
    // So we can safely skip the `scrollTop/Left` calls for newly added elements
    if (n.scrollLeft) {
      attributes.rr_scrollLeft = n.scrollLeft;
    }
    if (n.scrollTop) {
      attributes.rr_scrollTop = n.scrollTop;
    }
  }
  // block element
  if (needBlock) {
    const { width, height } = n.getBoundingClientRect();
    attributes = {
      class: attributes.class,
      rr_width: `${width}px`,
      rr_height: `${height}px`,
    };
  }
  // iframe
  if (tagName === 'iframe' && !keepIframeSrcFn(attributes.src as string)) {
    if (!(n as HTMLIFrameElement).contentDocument) {
      // we can't record it directly as we can't see into it
      // preserve the src attribute so a decision can be taken at replay time
      attributes.rr_src = attributes.src;
    }
    delete attributes.src; // prevent auto loading
  }

  let isCustomElement: true | undefined;
  try {
    if (customElements.get(tagName)) isCustomElement = true;
  } catch (e) {
    // In case old browsers don't support customElements
  }

  return {
    type: NodeType.Element,
    tagName,
    attributes,
    childNodes: [],
    isSVG: isSVGElement(n as Element) || undefined,
    needBlock,
    rootId,
    isCustom: isCustomElement,
  };
}

function lowerIfExists(
  maybeAttr: string | number | boolean | undefined | null,
): string {
  if (maybeAttr === undefined || maybeAttr === null) {
    return '';
  } else {
    return (maybeAttr as string).toLowerCase();
  }
}

function slimDOMExcluded(
  sn: serializedNode,
  slimDOMOptions: SlimDOMOptions,
): boolean {
  if (slimDOMOptions.comment && sn.type === NodeType.Comment) {
    // TODO: convert IE conditional comments to real nodes
    return true;
  } else if (sn.type === NodeType.Element) {
    if (
      slimDOMOptions.script &&
      // script tag
      (sn.tagName === 'script' ||
        // (module)preload link
        (sn.tagName === 'link' &&
          (sn.attributes.rel === 'preload' ||
            sn.attributes.rel === 'modulepreload') &&
          sn.attributes.as === 'script') ||
        // prefetch link
        (sn.tagName === 'link' &&
          sn.attributes.rel === 'prefetch' &&
          typeof sn.attributes.href === 'string' &&
          extractFileExtension(sn.attributes.href) === 'js'))
    ) {
      return true;
    } else if (
      slimDOMOptions.headFavicon &&
      ((sn.tagName === 'link' && sn.attributes.rel === 'shortcut icon') ||
        (sn.tagName === 'meta' &&
          (lowerIfExists(sn.attributes.name).match(
            /^msapplication-tile(image|color)$/,
          ) ||
            lowerIfExists(sn.attributes.name) === 'application-name' ||
            lowerIfExists(sn.attributes.rel) === 'icon' ||
            lowerIfExists(sn.attributes.rel) === 'apple-touch-icon' ||
            lowerIfExists(sn.attributes.rel) === 'shortcut icon')))
    ) {
      return true;
    } else if (sn.tagName === 'meta') {
      if (
        slimDOMOptions.headMetaDescKeywords &&
        lowerIfExists(sn.attributes.name).match(/^description|keywords$/)
      ) {
        return true;
      } else if (
        slimDOMOptions.headMetaSocial &&
        (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) || // og = opengraph (facebook)
          lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) ||
          lowerIfExists(sn.attributes.name) === 'pinterest')
      ) {
        return true;
      } else if (
        slimDOMOptions.headMetaRobots &&
        (lowerIfExists(sn.attributes.name) === 'robots' ||
          lowerIfExists(sn.attributes.name) === 'googlebot' ||
          lowerIfExists(sn.attributes.name) === 'bingbot')
      ) {
        return true;
      } else if (
        slimDOMOptions.headMetaHttpEquiv &&
        sn.attributes['http-equiv'] !== undefined
      ) {
        // e.g. X-UA-Compatible, Content-Type, Content-Language,
        // cache-control, X-Translated-By
        return true;
      } else if (
        slimDOMOptions.headMetaAuthorship &&
        (lowerIfExists(sn.attributes.name) === 'author' ||
          lowerIfExists(sn.attributes.name) === 'generator' ||
          lowerIfExists(sn.attributes.name) === 'framework' ||
          lowerIfExists(sn.attributes.name) === 'publisher' ||
          lowerIfExists(sn.attributes.name) === 'progid' ||
          lowerIfExists(sn.attributes.property).match(/^article:/) ||
          lowerIfExists(sn.attributes.property).match(/^product:/))
      ) {
        return true;
      } else if (
        slimDOMOptions.headMetaVerification &&
        (lowerIfExists(sn.attributes.name) === 'google-site-verification' ||
          lowerIfExists(sn.attributes.name) === 'yandex-verification' ||
          lowerIfExists(sn.attributes.name) === 'csrf-token' ||
          lowerIfExists(sn.attributes.name) === 'p:domain_verify' ||
          lowerIfExists(sn.attributes.name) === 'verify-v1' ||
          lowerIfExists(sn.attributes.name) === 'verification' ||
          lowerIfExists(sn.attributes.name) === 'shopify-checkout-api-token')
      ) {
        return true;
      }
    }
  }
  return false;
}

export function serializeNodeWithId(
  n: Node,
  options: {
    doc: Document;
    mirror: Mirror;
    blockClass: string | RegExp;
    blockSelector: string | null;
    maskTextClass: string | RegExp;
    maskTextSelector: string | null;
    skipChild: boolean;
    inlineStylesheet: boolean;
    newlyAddedElement?: boolean;
    maskInputOptions?: MaskInputOptions;
    needsMask?: boolean;
    maskTextFn: MaskTextFn | undefined;
    maskInputFn: MaskInputFn | undefined;
    slimDOMOptions: SlimDOMOptions;
    dataURLOptions?: DataURLOptions;
    keepIframeSrcFn?: KeepIframeSrcFn;
    inlineImages?: boolean;
    recordCanvas?: boolean;
    preserveWhiteSpace?: boolean;
    onSerialize?: (n: Node) => unknown;
    onIframeLoad?: (
      iframeNode: HTMLIFrameElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    iframeLoadTimeout?: number;
    onStylesheetLoad?: (
      linkNode: HTMLLinkElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    stylesheetLoadTimeout?: number;
    cssCaptured?: boolean;
  },
): serializedNodeWithId | null {
  const {
    doc,
    mirror,
    blockClass,
    blockSelector,
    maskTextClass,
    maskTextSelector,
    skipChild = false,
    inlineStylesheet = true,
    maskInputOptions = {},
    maskTextFn,
    maskInputFn,
    slimDOMOptions,
    dataURLOptions = {},
    inlineImages = false,
    recordCanvas = false,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout = 5000,
    onStylesheetLoad,
    stylesheetLoadTimeout = 5000,
    keepIframeSrcFn = () => false,
    newlyAddedElement = false,
    cssCaptured = false,
  } = options;
  let { needsMask } = options;
  let { preserveWhiteSpace = true } = options;

  if (!needsMask) {
    // perf: if needsMask = true, children won't also need to check
    const checkAncestors = needsMask === undefined; // if false, we've already checked ancestors
    needsMask = needMaskingText(
      n as Element,
      maskTextClass,
      maskTextSelector,
      checkAncestors,
    );
  }

  const _serializedNode = serializeNode(n, {
    doc,
    mirror,
    blockClass,
    blockSelector,
    needsMask,
    inlineStylesheet,
    maskInputOptions,
    maskTextFn,
    maskInputFn,
    dataURLOptions,
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement,
    cssCaptured,
  });
  if (!_serializedNode) {
    // TODO: dev only
    console.warn(n, 'not serialized');
    return null;
  }

  let id: number | undefined;
  if (mirror.hasNode(n)) {
    // Reuse the previous id
    id = mirror.getId(n);
  } else if (
    slimDOMExcluded(_serializedNode, slimDOMOptions) ||
    (!preserveWhiteSpace &&
      _serializedNode.type === NodeType.Text &&
      !_serializedNode.textContent.replace(/^\s+|\s+$/gm, '').length)
  ) {
    id = IGNORED_NODE;
  } else {
    id = genId();
  }

  const serializedNode = Object.assign(_serializedNode, { id });
  // add IGNORED_NODE to mirror to track nextSiblings
  mirror.add(n, serializedNode);

  if (id === IGNORED_NODE) {
    return null; // slimDOM
  }

  if (onSerialize) {
    onSerialize(n);
  }
  let recordChild = !skipChild;
  if (serializedNode.type === NodeType.Element) {
    recordChild = recordChild && !serializedNode.needBlock;
    // this property was not needed in replay side
    delete serializedNode.needBlock;
    const shadowRootEl = dom.shadowRoot(n);
    if (shadowRootEl && isNativeShadowDom(shadowRootEl))
      serializedNode.isShadowHost = true;
  }
  if (
    (serializedNode.type === NodeType.Document ||
      serializedNode.type === NodeType.Element) &&
    recordChild
  ) {
    if (
      slimDOMOptions.headWhitespace &&
      serializedNode.type === NodeType.Element &&
      serializedNode.tagName === 'head'
      // would impede performance: || getComputedStyle(n)['white-space'] === 'normal'
    ) {
      preserveWhiteSpace = false;
    }
    const bypassOptions = {
      doc,
      mirror,
      blockClass,
      blockSelector,
      needsMask,
      maskTextClass,
      maskTextSelector,
      skipChild,
      inlineStylesheet,
      maskInputOptions,
      maskTextFn,
      maskInputFn,
      slimDOMOptions,
      dataURLOptions,
      inlineImages,
      recordCanvas,
      preserveWhiteSpace,
      onSerialize,
      onIframeLoad,
      iframeLoadTimeout,
      onStylesheetLoad,
      stylesheetLoadTimeout,
      keepIframeSrcFn,
      cssCaptured: false,
    };

    if (
      serializedNode.type === NodeType.Element &&
      serializedNode.tagName === 'textarea' &&
      (serializedNode as elementNode).attributes.value !== undefined
    ) {
      // value parameter in DOM reflects the correct value, so ignore childNode
    } else {
      if (
        serializedNode.type === NodeType.Element &&
        (serializedNode as elementNode).attributes._cssText !== undefined &&
        typeof serializedNode.attributes._cssText === 'string'
      ) {
        bypassOptions.cssCaptured = true;
      }
      for (const childN of Array.from(dom.childNodes(n))) {
        const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
        if (serializedChildNode) {
          serializedNode.childNodes.push(serializedChildNode);
        }
      }
    }

    let shadowRootEl: ShadowRoot | null = null;
    if (isElement(n) && (shadowRootEl = dom.shadowRoot(n))) {
      for (const childN of Array.from(dom.childNodes(shadowRootEl))) {
        const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
        if (serializedChildNode) {
          isNativeShadowDom(shadowRootEl) &&
            (serializedChildNode.isShadow = true);
          serializedNode.childNodes.push(serializedChildNode);
        }
      }
    }
  }

  const parent = dom.parentNode(n);
  if (parent && isShadowRoot(parent) && isNativeShadowDom(parent)) {
    serializedNode.isShadow = true;
  }

  if (
    serializedNode.type === NodeType.Element &&
    serializedNode.tagName === 'iframe'
  ) {
    onceIframeLoaded(
      n as HTMLIFrameElement,
      () => {
        const iframeDoc = (n as HTMLIFrameElement).contentDocument;
        if (iframeDoc && onIframeLoad) {
          const serializedIframeNode = serializeNodeWithId(iframeDoc, {
            doc: iframeDoc,
            mirror,
            blockClass,
            blockSelector,
            needsMask,
            maskTextClass,
            maskTextSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn,
          });

          if (serializedIframeNode) {
            onIframeLoad(
              n as HTMLIFrameElement,
              serializedIframeNode as serializedElementNodeWithId,
            );
          }
        }
      },
      iframeLoadTimeout,
    );
  }

  // <link rel=stylesheet href=...>
  if (
    serializedNode.type === NodeType.Element &&
    serializedNode.tagName === 'link' &&
    typeof serializedNode.attributes.rel === 'string' &&
    (serializedNode.attributes.rel === 'stylesheet' ||
      (serializedNode.attributes.rel === 'preload' &&
        typeof serializedNode.attributes.href === 'string' &&
        extractFileExtension(serializedNode.attributes.href) === 'css'))
  ) {
    onceStylesheetLoaded(
      n as HTMLLinkElement,
      () => {
        if (onStylesheetLoad) {
          const serializedLinkNode = serializeNodeWithId(n, {
            doc,
            mirror,
            blockClass,
            blockSelector,
            needsMask,
            maskTextClass,
            maskTextSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn,
          });

          if (serializedLinkNode) {
            onStylesheetLoad(
              n as HTMLLinkElement,
              serializedLinkNode as serializedElementNodeWithId,
            );
          }
        }
      },
      stylesheetLoadTimeout,
    );
  }

  return serializedNode;
}

function snapshot(
  n: Document,
  options?: {
    mirror?: Mirror;
    blockClass?: string | RegExp;
    blockSelector?: string | null;
    maskTextClass?: string | RegExp;
    maskTextSelector?: string | null;
    inlineStylesheet?: boolean;
    maskAllInputs?: boolean | MaskInputOptions;
    maskTextFn?: MaskTextFn;
    maskInputFn?: MaskInputFn;
    slimDOM?: 'all' | boolean | SlimDOMOptions;
    dataURLOptions?: DataURLOptions;
    inlineImages?: boolean;
    recordCanvas?: boolean;
    preserveWhiteSpace?: boolean;
    onSerialize?: (n: Node) => unknown;
    onIframeLoad?: (
      iframeNode: HTMLIFrameElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    iframeLoadTimeout?: number;
    onStylesheetLoad?: (
      linkNode: HTMLLinkElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    stylesheetLoadTimeout?: number;
    keepIframeSrcFn?: KeepIframeSrcFn;
  },
): serializedNodeWithId | null {
  const {
    mirror = new Mirror(),
    blockClass = 'rr-block',
    blockSelector = null,
    maskTextClass = 'rr-mask',
    maskTextSelector = null,
    inlineStylesheet = true,
    inlineImages = false,
    recordCanvas = false,
    maskAllInputs = false,
    maskTextFn,
    maskInputFn,
    slimDOM = false,
    dataURLOptions,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
    onStylesheetLoad,
    stylesheetLoadTimeout,
    keepIframeSrcFn = () => false,
  } = options || {};
  const maskInputOptions: MaskInputOptions =
    maskAllInputs === true
      ? {
          color: true,
          date: true,
          'datetime-local': true,
          email: true,
          month: true,
          number: true,
          range: true,
          search: true,
          tel: true,
          text: true,
          time: true,
          url: true,
          week: true,
          textarea: true,
          select: true,
          password: true,
        }
      : maskAllInputs === false
      ? {
          password: true,
        }
      : maskAllInputs;
  const slimDOMOptions: SlimDOMOptions =
    slimDOM === true || slimDOM === 'all'
      ? // if true: set of sensible options that should not throw away any information
        {
          script: true,
          comment: true,
          headFavicon: true,
          headWhitespace: true,
          headMetaDescKeywords: slimDOM === 'all', // destructive
          headMetaSocial: true,
          headMetaRobots: true,
          headMetaHttpEquiv: true,
          headMetaAuthorship: true,
          headMetaVerification: true,
        }
      : slimDOM === false
      ? {}
      : slimDOM;
  return serializeNodeWithId(n, {
    doc: n,
    mirror,
    blockClass,
    blockSelector,
    maskTextClass,
    maskTextSelector,
    skipChild: false,
    inlineStylesheet,
    maskInputOptions,
    maskTextFn,
    maskInputFn,
    slimDOMOptions,
    dataURLOptions,
    inlineImages,
    recordCanvas,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
    onStylesheetLoad,
    stylesheetLoadTimeout,
    keepIframeSrcFn,
    newlyAddedElement: false,
  });
}

export function visitSnapshot(
  node: serializedNodeWithId,
  onVisit: (node: serializedNodeWithId) => unknown,
) {
  function walk(current: serializedNodeWithId) {
    onVisit(current);
    if (
      current.type === NodeType.Document ||
      current.type === NodeType.Element
    ) {
      current.childNodes.forEach(walk);
    }
  }

  walk(node);
}

export function cleanupSnapshot() {
  // allow a new recording to start numbering nodes from scratch
  _id = 1;
}

export default snapshot;
