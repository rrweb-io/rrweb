import {
  serializedNode,
  serializedNodeWithId,
  NodeType,
  attributes,
  INode,
  idNodeMap,
  MaskInputOptions,
  SlimDOMOptions,
} from './types';

let _id = 1;
const tagNameRegex = RegExp('[^a-z1-6-_]');

export const IGNORED_NODE = -2;

function genId(): number {
  return _id++;
}

function getValidTagName(element: HTMLElement): string {
  if (element instanceof HTMLFormElement) {
    return 'form';
  }

  const processedTagName = element.tagName.toLowerCase().trim();

  if (tagNameRegex.test(processedTagName)) {
    // if the tag name is odd and we cannot extract
    // anything from the string, then we return a
    // generic div
    return 'div';
  }

  return processedTagName;
}

function getCssRulesString(s: CSSStyleSheet): string | null {
  try {
    const rules = s.rules || s.cssRules;
    return rules ? Array.from(rules).map(getCssRuleString).join('') : null;
  } catch (error) {
    return null;
  }
}

function getCssRuleString(rule: CSSRule): string {
  return isCSSImportRule(rule)
    ? getCssRulesString(rule.styleSheet) || ''
    : rule.cssText;
}

function isCSSImportRule(rule: CSSRule): rule is CSSImportRule {
  return 'styleSheet' in rule;
}

function extractOrigin(url: string): string {
  let origin;
  if (url.indexOf('//') > -1) {
    origin = url.split('/').slice(0, 3).join('/');
  } else {
    origin = url.split('/')[0];
  }
  origin = origin.split('?')[0];
  return origin;
}

const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")([^"]*)"|([^)]*))\)/gm;
const RELATIVE_PATH = /^(?!www\.|(?:http|ftp)s?:\/\/|[A-Za-z]:\\|\/\/|#).*/;
const DATA_URI = /^(data:)([^,]*),(.*)/i;
export function absoluteToStylesheet(
  cssText: string | null,
  href: string,
): string {
  return (cssText || '').replace(
    URL_IN_CSS_REF,
    (origin, quote1, path1, quote2, path2, path3) => {
      const filePath = path1 || path2 || path3;
      const maybeQuote = quote1 || quote2 || '';
      if (!filePath) {
        return origin;
      }
      if (!RELATIVE_PATH.test(filePath)) {
        return `url(${maybeQuote}${filePath}${maybeQuote})`;
      }
      if (DATA_URI.test(filePath)) {
        return `url(${maybeQuote}${filePath}${maybeQuote})`;
      }
      if (filePath[0] === '/') {
        return `url(${maybeQuote}${
          extractOrigin(href) + filePath
        }${maybeQuote})`;
      }
      const stack = href.split('/');
      const parts = filePath.split('/');
      stack.pop();
      for (const part of parts) {
        if (part === '.') {
          continue;
        } else if (part === '..') {
          stack.pop();
        } else {
          stack.push(part);
        }
      }
      return `url(${maybeQuote}${stack.join('/')}${maybeQuote})`;
    },
  );
}

function getAbsoluteSrcsetString(doc: Document, attributeValue: string) {
  if (attributeValue.trim() === '') {
    return attributeValue;
  }

  const srcsetValues = attributeValue.split(',');
  // srcset attributes is defined as such:
  // srcset = "url size,url1 size1"
  const resultingSrcsetString = srcsetValues
    .map((srcItem) => {
      // removing all but middle spaces
      const trimmedSrcItem = srcItem.trimLeft().trimRight();
      const urlAndSize = trimmedSrcItem.split(' ');
      // this means we have both 0:url and 1:size
      if (urlAndSize.length === 2) {
        const absUrl = absoluteToDoc(doc, urlAndSize[0]);
        return `${absUrl} ${urlAndSize[1]}`;
      } else if (urlAndSize.length === 1) {
        const absUrl = absoluteToDoc(doc, urlAndSize[0]);
        return `${absUrl}`;
      }
      return '';
    })
    .join(', ');

  return resultingSrcsetString;
}

export function absoluteToDoc(doc: Document, attributeValue: string): string {
  if (!attributeValue || attributeValue.trim() === '') {
    return attributeValue;
  }
  const a: HTMLAnchorElement = doc.createElement('a');
  a.href = attributeValue;
  return a.href;
}

function isSVGElement(el: Element): boolean {
  return el.tagName === 'svg' || el instanceof SVGElement;
}

function getHref() {
  // return a href without hash
  const a = document.createElement('a');
  a.href = '';
  return a.href;
}

export function transformAttribute(
  doc: Document,
  name: string,
  value: string,
): string {
  // relative path in attribute
  if (name === 'src' || ((name === 'href' || name === 'xlink:href') && value)) {
    return absoluteToDoc(doc, value);
  } else if (name === 'srcset' && value) {
    return getAbsoluteSrcsetString(doc, value);
  } else if (name === 'style' && value) {
    return absoluteToStylesheet(value, getHref());
  } else {
    return value;
  }
}

export function _isBlockedElement(
  element: HTMLElement,
  blockClass: string | RegExp,
  blockSelector: string | null,
): boolean {
  if (typeof blockClass === 'string') {
    if (element.classList.contains(blockClass)) {
      return true;
    }
  } else {
    element.classList.forEach((className) => {
      if (blockClass.test(className)) {
        return true;
      }
    });
  }
  if (blockSelector) {
    return element.matches(blockSelector);
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
    listener();
    return;
  }
  // use default listener
  iframeEl.addEventListener('load', listener);
}

function serializeNode(
  n: Node,
  options: {
    doc: Document;
    blockClass: string | RegExp;
    blockSelector: string | null;
    inlineStylesheet: boolean;
    maskInputOptions: MaskInputOptions;
    recordCanvas: boolean;
  },
): serializedNode | false {
  const {
    doc,
    blockClass,
    blockSelector,
    inlineStylesheet,
    maskInputOptions = {},
    recordCanvas,
  } = options;
  // Only record root id when document object is not the base document
  let rootId: number | undefined;
  if (((doc as unknown) as INode).__sn) {
    const docId = ((doc as unknown) as INode).__sn.id;
    rootId = docId === 1 ? undefined : docId;
  }
  switch (n.nodeType) {
    case n.DOCUMENT_NODE:
      return {
        type: NodeType.Document,
        childNodes: [],
        rootId,
      };
    case n.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType.DocumentType,
        name: (n as DocumentType).name,
        publicId: (n as DocumentType).publicId,
        systemId: (n as DocumentType).systemId,
        rootId,
      };
    case n.ELEMENT_NODE:
      const needBlock = _isBlockedElement(
        n as HTMLElement,
        blockClass,
        blockSelector,
      );
      const tagName = getValidTagName(n as HTMLElement);
      let attributes: attributes = {};
      for (const { name, value } of Array.from((n as HTMLElement).attributes)) {
        attributes[name] = transformAttribute(doc, name, value);
      }
      // remote css
      if (tagName === 'link' && inlineStylesheet) {
        const stylesheet = Array.from(doc.styleSheets).find((s) => {
          return s.href === (n as HTMLLinkElement).href;
        });
        const cssText = getCssRulesString(stylesheet as CSSStyleSheet);
        if (cssText) {
          delete attributes.rel;
          delete attributes.href;
          attributes._cssText = absoluteToStylesheet(
            cssText,
            stylesheet!.href!,
          );
        }
      }
      // dynamic stylesheet
      if (
        tagName === 'style' &&
        (n as HTMLStyleElement).sheet &&
        // TODO: Currently we only try to get dynamic stylesheet when it is an empty style element
        !(
          (n as HTMLElement).innerText ||
          (n as HTMLElement).textContent ||
          ''
        ).trim().length
      ) {
        const cssText = getCssRulesString(
          (n as HTMLStyleElement).sheet as CSSStyleSheet,
        );
        if (cssText) {
          attributes._cssText = absoluteToStylesheet(cssText, getHref());
        }
      }
      // form fields
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
      ) {
        const value = (n as HTMLInputElement | HTMLTextAreaElement).value;
        if (
          attributes.type !== 'radio' &&
          attributes.type !== 'checkbox' &&
          attributes.type !== 'submit' &&
          attributes.type !== 'button' &&
          value
        ) {
          attributes.value =
            maskInputOptions[attributes.type as keyof MaskInputOptions] ||
            maskInputOptions[tagName as keyof MaskInputOptions]
              ? '*'.repeat(value.length)
              : value;
        } else if ((n as HTMLInputElement).checked) {
          attributes.checked = (n as HTMLInputElement).checked;
        }
      }
      if (tagName === 'option') {
        const selectValue = (n as HTMLOptionElement).parentElement;
        if (attributes.value === (selectValue as HTMLSelectElement).value) {
          attributes.selected = (n as HTMLOptionElement).selected;
        }
      }
      // canvas image data
      if (tagName === 'canvas' && recordCanvas) {
        attributes.rr_dataURL = (n as HTMLCanvasElement).toDataURL();
      }
      // media elements
      if (tagName === 'audio' || tagName === 'video') {
        attributes.rr_mediaState = (n as HTMLMediaElement).paused
          ? 'paused'
          : 'played';
      }
      // scroll
      if ((n as HTMLElement).scrollLeft) {
        attributes.rr_scrollLeft = (n as HTMLElement).scrollLeft;
      }
      if ((n as HTMLElement).scrollTop) {
        attributes.rr_scrollTop = (n as HTMLElement).scrollTop;
      }
      // block element
      if (needBlock) {
        const { width, height } = (n as HTMLElement).getBoundingClientRect();
        attributes = {
          class: attributes.class,
          rr_width: `${width}px`,
          rr_height: `${height}px`,
        };
      }
      // iframe
      if (tagName === 'iframe') {
        delete attributes.src;
      }
      return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG: isSVGElement(n as Element) || undefined,
        needBlock,
        rootId,
      };
    case n.TEXT_NODE:
      // The parent node may not be a html element which has a tagName attribute.
      // So just let it be undefined which is ok in this use case.
      const parentTagName =
        n.parentNode && (n.parentNode as HTMLElement).tagName;
      let textContent = (n as Text).textContent;
      const isStyle = parentTagName === 'STYLE' ? true : undefined;
      if (isStyle && textContent) {
        textContent = absoluteToStylesheet(textContent, getHref());
      }
      if (parentTagName === 'SCRIPT') {
        textContent = 'SCRIPT_PLACEHOLDER';
      }
      return {
        type: NodeType.Text,
        textContent: textContent || '',
        isStyle,
        rootId,
      };
    case n.CDATA_SECTION_NODE:
      return {
        type: NodeType.CDATA,
        textContent: '',
        rootId,
      };
    case n.COMMENT_NODE:
      return {
        type: NodeType.Comment,
        textContent: (n as Comment).textContent || '',
        rootId,
      };
    default:
      return false;
  }
}

function lowerIfExists(maybeAttr: string | number | boolean): string {
  if (maybeAttr === undefined) {
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
      (sn.tagName === 'script' ||
        (sn.tagName === 'link' &&
          sn.attributes.rel === 'preload' &&
          sn.attributes.as === 'script'))
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
  n: Node | INode,
  options: {
    doc: Document;
    map: idNodeMap;
    blockClass: string | RegExp;
    blockSelector: string | null;
    skipChild: boolean;
    inlineStylesheet: boolean;
    maskInputOptions?: MaskInputOptions;
    slimDOMOptions: SlimDOMOptions;
    recordCanvas?: boolean;
    preserveWhiteSpace?: boolean;
    onSerialize?: (n: INode) => unknown;
    onIframeLoad?: (iframeINode: INode, node: serializedNodeWithId) => unknown;
    iframeLoadTimeout?: number;
  },
): serializedNodeWithId | null {
  const {
    doc,
    map,
    blockClass,
    blockSelector,
    skipChild = false,
    inlineStylesheet = true,
    maskInputOptions = {},
    slimDOMOptions,
    recordCanvas = false,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout = 5000,
  } = options;
  let { preserveWhiteSpace = true } = options;
  const _serializedNode = serializeNode(n, {
    doc,
    blockClass,
    blockSelector,
    inlineStylesheet,
    maskInputOptions,
    recordCanvas,
  });
  if (!_serializedNode) {
    // TODO: dev only
    console.warn(n, 'not serialized');
    return null;
  }

  let id;
  // Try to reuse the previous id
  if ('__sn' in n) {
    id = n.__sn.id;
  } else if (
    slimDOMExcluded(_serializedNode, slimDOMOptions) ||
    (!preserveWhiteSpace &&
      _serializedNode.type === NodeType.Text &&
      !_serializedNode.isStyle &&
      !_serializedNode.textContent.replace(/^\s+|\s+$/gm, '').length)
  ) {
    id = IGNORED_NODE;
  } else {
    id = genId();
  }
  const serializedNode = Object.assign(_serializedNode, { id });
  (n as INode).__sn = serializedNode;
  if (id === IGNORED_NODE) {
    return null; // slimDOM
  }
  map[id] = n as INode;
  if (onSerialize) {
    onSerialize(n as INode);
  }
  let recordChild = !skipChild;
  if (serializedNode.type === NodeType.Element) {
    recordChild = recordChild && !serializedNode.needBlock;
    // this property was not needed in replay side
    delete serializedNode.needBlock;
  }
  if (
    (serializedNode.type === NodeType.Document ||
      serializedNode.type === NodeType.Element) &&
    recordChild
  ) {
    if (
      slimDOMOptions.headWhitespace &&
      _serializedNode.type === NodeType.Element &&
      _serializedNode.tagName === 'head'
      // would impede performance: || getComputedStyle(n)['white-space'] === 'normal'
    ) {
      preserveWhiteSpace = false;
    }
    for (const childN of Array.from(n.childNodes)) {
      const serializedChildNode = serializeNodeWithId(childN, {
        doc,
        map,
        blockClass,
        blockSelector,
        skipChild,
        inlineStylesheet,
        maskInputOptions,
        slimDOMOptions,
        recordCanvas,
        preserveWhiteSpace,
        onSerialize,
        onIframeLoad,
        iframeLoadTimeout,
      });
      if (serializedChildNode) {
        serializedNode.childNodes.push(serializedChildNode);
      }
    }
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
            map,
            blockClass,
            blockSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            slimDOMOptions,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
          });

          if (serializedIframeNode) {
            onIframeLoad(n as INode, serializedIframeNode);
          }
        }
      },
      iframeLoadTimeout,
    );
  }

  return serializedNode;
}

function snapshot(
  n: Document,
  options?: {
    blockClass?: string | RegExp;
    inlineStylesheet?: boolean;
    maskAllInputs?: boolean | MaskInputOptions;
    slimDOM?: boolean | SlimDOMOptions;
    recordCanvas?: boolean;
    blockSelector?: string | null;
    preserveWhiteSpace?: boolean;
    onSerialize?: (n: INode) => unknown;
    onIframeLoad?: (iframeINode: INode, node: serializedNodeWithId) => unknown;
    iframeLoadTimeout?: number;
  },
): [serializedNodeWithId | null, idNodeMap] {
  const {
    blockClass = 'rr-block',
    inlineStylesheet = true,
    recordCanvas = false,
    blockSelector = null,
    maskAllInputs = false,
    slimDOM = false,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
  } = options || {};
  const idNodeMap: idNodeMap = {};
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
        }
      : maskAllInputs === false
      ? {}
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
  return [
    serializeNodeWithId(n, {
      doc: n,
      map: idNodeMap,
      blockClass,
      blockSelector,
      skipChild: false,
      inlineStylesheet,
      maskInputOptions,
      slimDOMOptions,
      recordCanvas,
      preserveWhiteSpace,
      onSerialize,
      onIframeLoad,
      iframeLoadTimeout,
    }),
    idNodeMap,
  ];
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
