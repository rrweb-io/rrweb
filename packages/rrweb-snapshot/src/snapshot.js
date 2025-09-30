import { NodeType } from '@rrweb/types';
import { Mirror, is2DCanvasBlank, isElement, isShadowRoot, maskInputValue, isNativeShadowDom, stringifyStylesheet, getInputType, toLowerCase, extractFileExtension, absolutifyURLs, markCssSplits, } from './utils';
import dom from '@newrelic/rrweb-utils';
let _id = 1;
const tagNameRegex = new RegExp('[^a-z0-9-_:]');
export const IGNORED_NODE = -2;
export function genId() {
    return _id++;
}
function getValidTagName(element) {
    if (element instanceof HTMLFormElement) {
        return 'form';
    }
    const processedTagName = toLowerCase(element.tagName);
    if (tagNameRegex.test(processedTagName)) {
        return 'div';
    }
    return processedTagName;
}
let canvasService;
let canvasCtx;
const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc, attributeValue) {
    if (attributeValue.trim() === '') {
        return attributeValue;
    }
    let pos = 0;
    function collectCharacters(regEx) {
        let chars;
        const match = regEx.exec(attributeValue.substring(pos));
        if (match) {
            chars = match[0];
            pos += chars.length;
            return chars;
        }
        return '';
    }
    const output = [];
    while (true) {
        collectCharacters(SRCSET_COMMAS_OR_SPACES);
        if (pos >= attributeValue.length) {
            break;
        }
        let url = collectCharacters(SRCSET_NOT_SPACES);
        if (url.slice(-1) === ',') {
            url = absoluteToDoc(doc, url.substring(0, url.length - 1));
            output.push(url);
        }
        else {
            let descriptorsStr = '';
            url = absoluteToDoc(doc, url);
            let inParens = false;
            while (true) {
                const c = attributeValue.charAt(pos);
                if (c === '') {
                    output.push((url + descriptorsStr).trim());
                    break;
                }
                else if (!inParens) {
                    if (c === ',') {
                        pos += 1;
                        output.push((url + descriptorsStr).trim());
                        break;
                    }
                    else if (c === '(') {
                        inParens = true;
                    }
                }
                else {
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
const cachedDocument = new WeakMap();
export function absoluteToDoc(doc, attributeValue) {
    if (!attributeValue || attributeValue.trim() === '') {
        return attributeValue;
    }
    return getHref(doc, attributeValue);
}
function isSVGElement(el) {
    return Boolean(el.tagName === 'svg' || el.ownerSVGElement);
}
function getHref(doc, customHref) {
    let a = cachedDocument.get(doc);
    if (!a) {
        a = doc.createElement('a');
        cachedDocument.set(doc, a);
    }
    if (!customHref) {
        customHref = '';
    }
    else if (customHref.startsWith('blob:') || customHref.startsWith('data:')) {
        return customHref;
    }
    a.setAttribute('href', customHref);
    return a.href;
}
export function transformAttribute(doc, tagName, name, value) {
    if (!value) {
        return value;
    }
    if (name === 'src' ||
        (name === 'href' && !(tagName === 'use' && value[0] === '#'))) {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'xlink:href' && value[0] !== '#') {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'background' &&
        (tagName === 'table' || tagName === 'td' || tagName === 'th')) {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'srcset') {
        return getAbsoluteSrcsetString(doc, value);
    }
    else if (name === 'style') {
        return absolutifyURLs(value, getHref(doc));
    }
    else if (tagName === 'object' && name === 'data') {
        return absoluteToDoc(doc, value);
    }
    return value;
}
export function ignoreAttribute(tagName, name, _value) {
    return (tagName === 'video' || tagName === 'audio') && name === 'autoplay';
}
export function _isBlockedElement(element, blockClass, blockSelector) {
    try {
        if (typeof blockClass === 'string') {
            if (element.classList.contains(blockClass)) {
                return true;
            }
        }
        else {
            for (let eIndex = element.classList.length; eIndex--;) {
                const className = element.classList[eIndex];
                if (blockClass.test(className)) {
                    return true;
                }
            }
        }
        if (blockSelector) {
            return element.matches(blockSelector);
        }
    }
    catch (e) {
    }
    return false;
}
export function classMatchesRegex(node, regex, checkAncestors) {
    if (!node)
        return false;
    if (node.nodeType !== node.ELEMENT_NODE) {
        if (!checkAncestors)
            return false;
        return classMatchesRegex(dom.parentNode(node), regex, checkAncestors);
    }
    for (let eIndex = node.classList.length; eIndex--;) {
        const className = node.classList[eIndex];
        if (regex.test(className)) {
            return true;
        }
    }
    if (!checkAncestors)
        return false;
    return classMatchesRegex(dom.parentNode(node), regex, checkAncestors);
}
export function needMaskingText(node, maskTextClass, maskTextSelector, checkAncestors) {
    let el;
    if (isElement(node)) {
        el = node;
        if (!dom.childNodes(el).length) {
            return false;
        }
    }
    else if (dom.parentElement(node) === null) {
        return false;
    }
    else {
        el = dom.parentElement(node);
    }
    try {
        if (typeof maskTextClass === 'string') {
            if (checkAncestors) {
                if (el.closest(`.${maskTextClass}`))
                    return true;
            }
            else {
                if (el.classList.contains(maskTextClass))
                    return true;
            }
        }
        else {
            if (classMatchesRegex(el, maskTextClass, checkAncestors))
                return true;
        }
        if (maskTextSelector) {
            if (checkAncestors) {
                if (el.closest(maskTextSelector))
                    return true;
            }
            else {
                if (el.matches(maskTextSelector))
                    return true;
            }
        }
    }
    catch (e) {
    }
    return false;
}
function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
    const win = iframeEl.contentWindow;
    if (!win) {
        return;
    }
    let fired = false;
    let readyState;
    try {
        readyState = win.document.readyState;
    }
    catch (error) {
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
    const blankUrl = 'about:blank';
    if (win.location.href !== blankUrl ||
        iframeEl.src === blankUrl ||
        iframeEl.src === '') {
        setTimeout(listener, 0);
        return iframeEl.addEventListener('load', listener);
    }
    iframeEl.addEventListener('load', listener);
}
function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
    let fired = false;
    let styleSheetLoaded;
    try {
        styleSheetLoaded = link.sheet;
    }
    catch (error) {
        return;
    }
    if (styleSheetLoaded)
        return;
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
function serializeNode(n, options) {
    const { doc, mirror, blockClass, blockSelector, needsMask, inlineStylesheet, maskInputOptions = {}, maskTextFn, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, cssCaptured = false, } = options;
    const rootId = getRootId(doc, mirror);
    switch (n.nodeType) {
        case n.DOCUMENT_NODE:
            if (n.compatMode !== 'CSS1Compat') {
                return {
                    type: NodeType.Document,
                    childNodes: [],
                    compatMode: n.compatMode,
                };
            }
            else {
                return {
                    type: NodeType.Document,
                    childNodes: [],
                };
            }
        case n.DOCUMENT_TYPE_NODE:
            return {
                type: NodeType.DocumentType,
                name: n.name,
                publicId: n.publicId,
                systemId: n.systemId,
                rootId,
            };
        case n.ELEMENT_NODE:
            return serializeElementNode(n, {
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
            return serializeTextNode(n, {
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
                textContent: dom.textContent(n) || '',
                rootId,
            };
        default:
            return false;
    }
}
function getRootId(doc, mirror) {
    if (!mirror.hasNode(doc))
        return undefined;
    const docId = mirror.getId(doc);
    return docId === 1 ? undefined : docId;
}
function serializeTextNode(n, options) {
    const { needsMask, maskTextFn, rootId, cssCaptured } = options;
    const parent = dom.parentNode(n);
    const parentTagName = parent && parent.tagName;
    let textContent = '';
    const isStyle = parentTagName === 'STYLE' ? true : undefined;
    const isScript = parentTagName === 'SCRIPT' ? true : undefined;
    if (isScript) {
        textContent = 'SCRIPT_PLACEHOLDER';
    }
    else if (!cssCaptured) {
        textContent = dom.textContent(n);
        if (isStyle && textContent) {
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
function serializeElementNode(n, options) {
    const { doc, blockClass, blockSelector, inlineStylesheet, maskInputOptions = {}, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, rootId, } = options;
    const needBlock = _isBlockedElement(n, blockClass, blockSelector);
    const tagName = getValidTagName(n);
    let attributes = {};
    const len = n.attributes.length;
    for (let i = 0; i < len; i++) {
        const attr = n.attributes[i];
        if (!ignoreAttribute(tagName, attr.name, attr.value)) {
            attributes[attr.name] = transformAttribute(doc, tagName, toLowerCase(attr.name), attr.value);
        }
    }
    if (tagName === 'link' && inlineStylesheet) {
        const stylesheet = Array.from(doc.styleSheets).find((s) => {
            return s.href === n.href;
        });
        let cssText = null;
        if (stylesheet) {
            cssText = stringifyStylesheet(stylesheet);
        }
        if (cssText) {
            delete attributes.rel;
            delete attributes.href;
            attributes._cssText = cssText;
        }
    }
    if (tagName === 'style' && n.sheet) {
        let cssText = stringifyStylesheet(n.sheet);
        if (cssText) {
            if (n.childNodes.length > 1) {
                cssText = markCssSplits(cssText, n);
            }
            attributes._cssText = cssText;
        }
    }
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        const value = n.value;
        const checked = n.checked;
        if (attributes.type !== 'radio' &&
            attributes.type !== 'checkbox' &&
            attributes.type !== 'submit' &&
            attributes.type !== 'button' &&
            value) {
            attributes.value = maskInputValue({
                element: n,
                type: getInputType(n),
                tagName,
                value,
                maskInputOptions,
                maskInputFn,
            });
        }
        else if (checked) {
            attributes.checked = checked;
        }
    }
    if (tagName === 'option') {
        if (n.selected && !maskInputOptions['select']) {
            attributes.selected = true;
        }
        else {
            delete attributes.selected;
        }
    }
    if (tagName === 'dialog' && n.open) {
        attributes.rr_open_mode = n.matches('dialog:modal')
            ? 'modal'
            : 'non-modal';
    }
    if (tagName === 'canvas' && recordCanvas) {
        if (n.__context === '2d') {
            if (!is2DCanvasBlank(n)) {
                attributes.rr_dataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            }
        }
        else if (!('__context' in n)) {
            const canvasDataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            const blankCanvas = doc.createElement('canvas');
            blankCanvas.width = n.width;
            blankCanvas.height = n.height;
            const blankCanvasDataURL = blankCanvas.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            if (canvasDataURL !== blankCanvasDataURL) {
                attributes.rr_dataURL = canvasDataURL;
            }
        }
    }
    if (tagName === 'img' && inlineImages) {
        if (!canvasService) {
            canvasService = doc.createElement('canvas');
            canvasCtx = canvasService.getContext('2d');
        }
        const image = n;
        const imageSrc = image.currentSrc || image.getAttribute('src') || '<unknown-src>';
        const priorCrossOrigin = image.crossOrigin;
        const recordInlineImage = () => {
            image.removeEventListener('load', recordInlineImage);
            try {
                canvasService.width = image.naturalWidth;
                canvasService.height = image.naturalHeight;
                canvasCtx.drawImage(image, 0, 0);
                attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            }
            catch (err) {
                if (image.crossOrigin !== 'anonymous') {
                    image.crossOrigin = 'anonymous';
                    if (image.complete && image.naturalWidth !== 0)
                        recordInlineImage();
                    else
                        image.addEventListener('load', recordInlineImage);
                    return;
                }
                else {
                    console.warn(`Cannot inline img src=${imageSrc}! Error: ${err}`);
                }
            }
            if (image.crossOrigin === 'anonymous') {
                priorCrossOrigin
                    ? (attributes.crossOrigin = priorCrossOrigin)
                    : image.removeAttribute('crossorigin');
            }
        };
        if (image.complete && image.naturalWidth !== 0)
            recordInlineImage();
        else
            image.addEventListener('load', recordInlineImage);
    }
    if (tagName === 'audio' || tagName === 'video') {
        const mediaAttributes = attributes;
        mediaAttributes.rr_mediaState = n.paused
            ? 'paused'
            : 'played';
        mediaAttributes.rr_mediaCurrentTime = n.currentTime;
        mediaAttributes.rr_mediaPlaybackRate = n.playbackRate;
        mediaAttributes.rr_mediaMuted = n.muted;
        mediaAttributes.rr_mediaLoop = n.loop;
        mediaAttributes.rr_mediaVolume = n.volume;
    }
    if (!newlyAddedElement) {
        if (n.scrollLeft) {
            attributes.rr_scrollLeft = n.scrollLeft;
        }
        if (n.scrollTop) {
            attributes.rr_scrollTop = n.scrollTop;
        }
    }
    if (needBlock) {
        const { width, height } = n.getBoundingClientRect();
        attributes = {
            class: attributes.class,
            rr_width: `${width}px`,
            rr_height: `${height}px`,
        };
    }
    if (tagName === 'iframe' && !keepIframeSrcFn(attributes.src)) {
        if (!n.contentDocument) {
            attributes.rr_src = attributes.src;
        }
        delete attributes.src;
    }
    let isCustomElement;
    try {
        if (customElements.get(tagName))
            isCustomElement = true;
    }
    catch (e) {
    }
    return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG: isSVGElement(n) || undefined,
        needBlock,
        rootId,
        isCustom: isCustomElement,
    };
}
function lowerIfExists(maybeAttr) {
    if (maybeAttr === undefined || maybeAttr === null) {
        return '';
    }
    else {
        return maybeAttr.toLowerCase();
    }
}
function slimDOMExcluded(sn, slimDOMOptions) {
    if (slimDOMOptions.comment && sn.type === NodeType.Comment) {
        return true;
    }
    else if (sn.type === NodeType.Element) {
        if (slimDOMOptions.script &&
            (sn.tagName === 'script' ||
                (sn.tagName === 'link' &&
                    ((sn.attributes.rel === 'preload' && sn.attributes.as === 'script') ||
                        sn.attributes.rel === 'modulepreload')) ||
                (sn.tagName === 'link' &&
                    sn.attributes.rel === 'prefetch' &&
                    typeof sn.attributes.href === 'string' &&
                    extractFileExtension(sn.attributes.href) === 'js'))) {
            return true;
        }
        else if (slimDOMOptions.headFavicon &&
            ((sn.tagName === 'link' && sn.attributes.rel === 'shortcut icon') ||
                (sn.tagName === 'meta' &&
                    (lowerIfExists(sn.attributes.name).match(/^msapplication-tile(image|color)$/) ||
                        lowerIfExists(sn.attributes.name) === 'application-name' ||
                        lowerIfExists(sn.attributes.rel) === 'icon' ||
                        lowerIfExists(sn.attributes.rel) === 'apple-touch-icon' ||
                        lowerIfExists(sn.attributes.rel) === 'shortcut icon')))) {
            return true;
        }
        else if (sn.tagName === 'meta') {
            if (slimDOMOptions.headMetaDescKeywords &&
                lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
                return true;
            }
            else if (slimDOMOptions.headMetaSocial &&
                (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) ||
                    lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) ||
                    lowerIfExists(sn.attributes.name) === 'pinterest')) {
                return true;
            }
            else if (slimDOMOptions.headMetaRobots &&
                (lowerIfExists(sn.attributes.name) === 'robots' ||
                    lowerIfExists(sn.attributes.name) === 'googlebot' ||
                    lowerIfExists(sn.attributes.name) === 'bingbot')) {
                return true;
            }
            else if (slimDOMOptions.headMetaHttpEquiv &&
                sn.attributes['http-equiv'] !== undefined) {
                return true;
            }
            else if (slimDOMOptions.headMetaAuthorship &&
                (lowerIfExists(sn.attributes.name) === 'author' ||
                    lowerIfExists(sn.attributes.name) === 'generator' ||
                    lowerIfExists(sn.attributes.name) === 'framework' ||
                    lowerIfExists(sn.attributes.name) === 'publisher' ||
                    lowerIfExists(sn.attributes.name) === 'progid' ||
                    lowerIfExists(sn.attributes.property).match(/^article:/) ||
                    lowerIfExists(sn.attributes.property).match(/^product:/))) {
                return true;
            }
            else if (slimDOMOptions.headMetaVerification &&
                (lowerIfExists(sn.attributes.name) === 'google-site-verification' ||
                    lowerIfExists(sn.attributes.name) === 'yandex-verification' ||
                    lowerIfExists(sn.attributes.name) === 'csrf-token' ||
                    lowerIfExists(sn.attributes.name) === 'p:domain_verify' ||
                    lowerIfExists(sn.attributes.name) === 'verify-v1' ||
                    lowerIfExists(sn.attributes.name) === 'verification' ||
                    lowerIfExists(sn.attributes.name) === 'shopify-checkout-api-token')) {
                return true;
            }
        }
    }
    return false;
}
export function serializeNodeWithId(n, options) {
    const { doc, mirror, blockClass, blockSelector, maskTextClass, maskTextSelector, skipChild = false, inlineStylesheet = true, maskInputOptions = {}, maskTextFn, maskInputFn, slimDOMOptions, dataURLOptions = {}, inlineImages = false, recordCanvas = false, onSerialize, onIframeLoad, iframeLoadTimeout = 5000, onStylesheetLoad, stylesheetLoadTimeout = 5000, keepIframeSrcFn = () => false, newlyAddedElement = false, cssCaptured = false, } = options;
    let { needsMask } = options;
    let { preserveWhiteSpace = true } = options;
    if (!needsMask) {
        const checkAncestors = needsMask === undefined;
        needsMask = needMaskingText(n, maskTextClass, maskTextSelector, checkAncestors);
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
        console.warn(n, 'not serialized');
        return null;
    }
    let id;
    if (mirror.hasNode(n)) {
        id = mirror.getId(n);
    }
    else if (slimDOMExcluded(_serializedNode, slimDOMOptions) ||
        (!preserveWhiteSpace &&
            _serializedNode.type === NodeType.Text &&
            !_serializedNode.textContent.replace(/^\s+|\s+$/gm, '').length)) {
        id = IGNORED_NODE;
    }
    else {
        id = genId();
    }
    const serializedNode = Object.assign(_serializedNode, { id });
    mirror.add(n, serializedNode);
    if (id === IGNORED_NODE) {
        return null;
    }
    if (onSerialize) {
        onSerialize(n);
    }
    let recordChild = !skipChild;
    if (serializedNode.type === NodeType.Element) {
        recordChild = recordChild && !serializedNode.needBlock;
        delete serializedNode.needBlock;
        const shadowRootEl = dom.shadowRoot(n);
        if (shadowRootEl && isNativeShadowDom(shadowRootEl))
            serializedNode.isShadowHost = true;
    }
    if ((serializedNode.type === NodeType.Document ||
        serializedNode.type === NodeType.Element) &&
        recordChild) {
        if (slimDOMOptions.headWhitespace &&
            serializedNode.type === NodeType.Element &&
            serializedNode.tagName === 'head') {
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
        if (serializedNode.type === NodeType.Element &&
            serializedNode.tagName === 'textarea' &&
            serializedNode.attributes.value !== undefined) {
        }
        else {
            if (serializedNode.type === NodeType.Element &&
                serializedNode.attributes._cssText !== undefined &&
                typeof serializedNode.attributes._cssText === 'string') {
                bypassOptions.cssCaptured = true;
            }
            for (const childN of Array.from(dom.childNodes(n))) {
                const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
                if (serializedChildNode) {
                    serializedNode.childNodes.push(serializedChildNode);
                }
            }
        }
        let shadowRootEl = null;
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
    if (serializedNode.type === NodeType.Element &&
        serializedNode.tagName === 'iframe') {
        onceIframeLoaded(n, () => {
            const iframeDoc = n.contentDocument;
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
                    onIframeLoad(n, serializedIframeNode);
                }
            }
        }, iframeLoadTimeout);
    }
    if (serializedNode.type === NodeType.Element &&
        serializedNode.tagName === 'link' &&
        typeof serializedNode.attributes.rel === 'string' &&
        (serializedNode.attributes.rel === 'stylesheet' ||
            (serializedNode.attributes.rel === 'preload' &&
                typeof serializedNode.attributes.href === 'string' &&
                extractFileExtension(serializedNode.attributes.href) === 'css'))) {
        onceStylesheetLoaded(n, () => {
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
                    onStylesheetLoad(n, serializedLinkNode);
                }
            }
        }, stylesheetLoadTimeout);
    }
    return serializedNode;
}
function snapshot(n, options) {
    const { mirror = new Mirror(), blockClass = 'rr-block', blockSelector = null, maskTextClass = 'rr-mask', maskTextSelector = null, inlineStylesheet = true, inlineImages = false, recordCanvas = false, maskAllInputs = false, maskTextFn, maskInputFn, slimDOM = false, dataURLOptions, preserveWhiteSpace, onSerialize, onIframeLoad, iframeLoadTimeout, onStylesheetLoad, stylesheetLoadTimeout, keepIframeSrcFn = () => false, } = options || {};
    const maskInputOptions = maskAllInputs === true
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
    const slimDOMOptions = slimDOM === true || slimDOM === 'all'
        ?
            {
                script: true,
                comment: true,
                headFavicon: true,
                headWhitespace: true,
                headMetaDescKeywords: slimDOM === 'all',
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
export function visitSnapshot(node, onVisit) {
    function walk(current) {
        onVisit(current);
        if (current.type === NodeType.Document ||
            current.type === NodeType.Element) {
            current.childNodes.forEach(walk);
        }
    }
    walk(node);
}
export function cleanupSnapshot() {
    _id = 1;
}
export default snapshot;
//# sourceMappingURL=snapshot.js.map