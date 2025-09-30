import { NodeType } from '@rrweb/types';
import dom from '@newrelic/rrweb-utils';
export function isElement(n) {
    return n.nodeType === n.ELEMENT_NODE;
}
export function isShadowRoot(n) {
    const hostEl = (n && 'host' in n && 'mode' in n && dom.host(n)) || null;
    return Boolean(hostEl && 'shadowRoot' in hostEl && dom.shadowRoot(hostEl) === n);
}
export function isNativeShadowDom(shadowRoot) {
    return Object.prototype.toString.call(shadowRoot) === '[object ShadowRoot]';
}
function fixBrowserCompatibilityIssuesInCSS(cssText) {
    if (cssText.includes(' background-clip: text;') &&
        !cssText.includes(' -webkit-background-clip: text;')) {
        cssText = cssText.replace(/\sbackground-clip:\s*text;/g, ' -webkit-background-clip: text; background-clip: text;');
    }
    return cssText;
}
export function escapeImportStatement(rule) {
    const { cssText } = rule;
    if (cssText.split('"').length < 3)
        return cssText;
    const statement = ['@import', `url(${JSON.stringify(rule.href)})`];
    if (rule.layerName === '') {
        statement.push(`layer`);
    }
    else if (rule.layerName) {
        statement.push(`layer(${rule.layerName})`);
    }
    if (rule.supportsText) {
        statement.push(`supports(${rule.supportsText})`);
    }
    if (rule.media.length) {
        statement.push(rule.media.mediaText);
    }
    return statement.join(' ') + ';';
}
export function stringifyStylesheet(s) {
    try {
        const rules = s.rules || s.cssRules;
        if (!rules) {
            return null;
        }
        let sheetHref = s.href;
        if (!sheetHref && s.ownerNode) {
            sheetHref = s.ownerNode.baseURI;
        }
        const stringifiedRules = Array.from(rules, (rule) => stringifyRule(rule, sheetHref)).join('');
        return fixBrowserCompatibilityIssuesInCSS(stringifiedRules);
    }
    catch (error) {
        return null;
    }
}
export function stringifyRule(rule, sheetHref) {
    if (isCSSImportRule(rule)) {
        let importStringified;
        try {
            importStringified =
                stringifyStylesheet(rule.styleSheet) ||
                    escapeImportStatement(rule);
        }
        catch (error) {
            importStringified = rule.cssText;
        }
        if (rule.styleSheet.href) {
            return absolutifyURLs(importStringified, rule.styleSheet.href);
        }
        return importStringified;
    }
    else {
        let ruleStringified = rule.cssText;
        if (isCSSStyleRule(rule) && rule.selectorText.includes(':')) {
            ruleStringified = fixSafariColons(ruleStringified);
        }
        if (sheetHref) {
            return absolutifyURLs(ruleStringified, sheetHref);
        }
        return ruleStringified;
    }
}
export function fixSafariColons(cssStringified) {
    const regex = /(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm;
    return cssStringified.replace(regex, '$1\\$2');
}
export function isCSSImportRule(rule) {
    return 'styleSheet' in rule;
}
export function isCSSStyleRule(rule) {
    return 'selectorText' in rule;
}
export class Mirror {
    idNodeMap = new Map();
    nodeMetaMap = new WeakMap();
    getId(n) {
        if (!n)
            return -1;
        const id = this.getMeta(n)?.id;
        return id ?? -1;
    }
    getNode(id) {
        return this.idNodeMap.get(id) || null;
    }
    getIds() {
        return Array.from(this.idNodeMap.keys());
    }
    getMeta(n) {
        return this.nodeMetaMap.get(n) || null;
    }
    removeNodeFromMap(n) {
        const id = this.getId(n);
        this.idNodeMap.delete(id);
        if (n.childNodes) {
            n.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
        }
    }
    has(id) {
        return this.idNodeMap.has(id);
    }
    hasNode(node) {
        return this.nodeMetaMap.has(node);
    }
    add(n, meta) {
        const id = meta.id;
        this.idNodeMap.set(id, n);
        this.nodeMetaMap.set(n, meta);
    }
    replace(id, n) {
        const oldNode = this.getNode(id);
        if (oldNode) {
            const meta = this.nodeMetaMap.get(oldNode);
            if (meta)
                this.nodeMetaMap.set(n, meta);
        }
        this.idNodeMap.set(id, n);
    }
    reset() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
}
export function createMirror() {
    return new Mirror();
}
export function maskInputValue({ element, maskInputOptions, tagName, type, value, maskInputFn, }) {
    let text = value || '';
    const actualType = type && toLowerCase(type);
    if (maskInputOptions[tagName.toLowerCase()] ||
        (actualType && maskInputOptions[actualType])) {
        if (maskInputFn) {
            text = maskInputFn(text, element);
        }
        else {
            text = '*'.repeat(text.length);
        }
    }
    return text;
}
export function toLowerCase(str) {
    return str.toLowerCase();
}
const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
export function is2DCanvasBlank(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return true;
    const chunkSize = 50;
    for (let x = 0; x < canvas.width; x += chunkSize) {
        for (let y = 0; y < canvas.height; y += chunkSize) {
            const getImageData = ctx.getImageData;
            const originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData
                ? getImageData[ORIGINAL_ATTRIBUTE_NAME]
                : getImageData;
            const pixelBuffer = new Uint32Array(originalGetImageData.call(ctx, x, y, Math.min(chunkSize, canvas.width - x), Math.min(chunkSize, canvas.height - y)).data.buffer);
            if (pixelBuffer.some((pixel) => pixel !== 0))
                return false;
        }
    }
    return true;
}
export function isNodeMetaEqual(a, b) {
    if (!a || !b || a.type !== b.type)
        return false;
    if (a.type === NodeType.Document)
        return a.compatMode === b.compatMode;
    else if (a.type === NodeType.DocumentType)
        return (a.name === b.name &&
            a.publicId === b.publicId &&
            a.systemId === b.systemId);
    else if (a.type === NodeType.Comment ||
        a.type === NodeType.Text ||
        a.type === NodeType.CDATA)
        return a.textContent === b.textContent;
    else if (a.type === NodeType.Element)
        return (a.tagName === b.tagName &&
            JSON.stringify(a.attributes) ===
                JSON.stringify(b.attributes) &&
            a.isSVG === b.isSVG &&
            a.needBlock === b.needBlock);
    return false;
}
export function getInputType(element) {
    const type = element.type;
    return element.hasAttribute('data-rr-is-password')
        ? 'password'
        : type
            ?
                toLowerCase(type)
            : null;
}
export function extractFileExtension(path, baseURL) {
    let url;
    try {
        url = new URL(path, baseURL ?? window.location.href);
    }
    catch (err) {
        return null;
    }
    const regex = /\.([0-9a-z]+)(?:$)/i;
    const match = url.pathname.match(regex);
    return match?.[1] ?? null;
}
function extractOrigin(url) {
    let origin = '';
    if (url.indexOf('//') > -1) {
        origin = url.split('/').slice(0, 3).join('/');
    }
    else {
        origin = url.split('/')[0];
    }
    origin = origin.split('?')[0];
    return origin;
}
const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
const URL_WWW_MATCH = /^www\..*/i;
const DATA_URI = /^(data:)([^,]*),(.*)/i;
export function absolutifyURLs(cssText, href) {
    return (cssText || '').replace(URL_IN_CSS_REF, (origin, quote1, path1, quote2, path2, path3) => {
        const filePath = path1 || path2 || path3;
        const maybeQuote = quote1 || quote2 || '';
        if (!filePath) {
            return origin;
        }
        if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) {
            return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (DATA_URI.test(filePath)) {
            return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (filePath[0] === '/') {
            return `url(${maybeQuote}${extractOrigin(href) + filePath}${maybeQuote})`;
        }
        const stack = href.split('/');
        const parts = filePath.split('/');
        stack.pop();
        for (const part of parts) {
            if (part === '.') {
                continue;
            }
            else if (part === '..') {
                stack.pop();
            }
            else {
                stack.push(part);
            }
        }
        return `url(${maybeQuote}${stack.join('/')}${maybeQuote})`;
    });
}
export function normalizeCssString(cssText, _testNoPxNorm = false) {
    if (_testNoPxNorm) {
        return cssText.replace(/(\/\*[^*]*\*\/)|[\s;]/g, '');
    }
    else {
        return cssText.replace(/(\/\*[^*]*\*\/)|[\s;]/g, '').replace(/0px/g, '0');
    }
}
export function splitCssText(cssText, style, _testNoPxNorm = false) {
    const childNodes = Array.from(style.childNodes);
    const splits = [];
    let iterCount = 0;
    if (childNodes.length > 1 && cssText && typeof cssText === 'string') {
        let cssTextNorm = normalizeCssString(cssText, _testNoPxNorm);
        const normFactor = cssTextNorm.length / cssText.length;
        for (let i = 1; i < childNodes.length; i++) {
            if (childNodes[i].textContent &&
                typeof childNodes[i].textContent === 'string') {
                const textContentNorm = normalizeCssString(childNodes[i].textContent, _testNoPxNorm);
                const jLimit = 100;
                let j = 3;
                for (; j < textContentNorm.length; j++) {
                    if (textContentNorm[j].match(/[a-zA-Z0-9]/) ||
                        textContentNorm.indexOf(textContentNorm.substring(0, j), 1) !== -1) {
                        continue;
                    }
                    break;
                }
                for (; j < textContentNorm.length; j++) {
                    let startSubstring = textContentNorm.substring(0, j);
                    let cssNormSplits = cssTextNorm.split(startSubstring);
                    let splitNorm = -1;
                    if (cssNormSplits.length === 2) {
                        splitNorm = cssNormSplits[0].length;
                    }
                    else if (cssNormSplits.length > 2 &&
                        cssNormSplits[0] === '' &&
                        childNodes[i - 1].textContent !== '') {
                        splitNorm = cssTextNorm.indexOf(startSubstring, 1);
                    }
                    else if (cssNormSplits.length === 1) {
                        startSubstring = startSubstring.substring(0, startSubstring.length - 1);
                        cssNormSplits = cssTextNorm.split(startSubstring);
                        if (cssNormSplits.length <= 1) {
                            splits.push(cssText);
                            return splits;
                        }
                        j = jLimit + 1;
                    }
                    else if (j === textContentNorm.length - 1) {
                        splitNorm = cssTextNorm.indexOf(startSubstring);
                    }
                    if (cssNormSplits.length >= 2 && j > jLimit) {
                        const prevTextContent = childNodes[i - 1].textContent;
                        if (prevTextContent && typeof prevTextContent === 'string') {
                            const prevMinLength = normalizeCssString(prevTextContent).length;
                            splitNorm = cssTextNorm.indexOf(startSubstring, prevMinLength);
                        }
                        if (splitNorm === -1) {
                            splitNorm = cssNormSplits[0].length;
                        }
                    }
                    if (splitNorm !== -1) {
                        let k = Math.floor(splitNorm / normFactor);
                        for (; k > 0 && k < cssText.length;) {
                            iterCount += 1;
                            if (iterCount > 50 * childNodes.length) {
                                splits.push(cssText);
                                return splits;
                            }
                            const normPart = normalizeCssString(cssText.substring(0, k), _testNoPxNorm);
                            if (normPart.length === splitNorm) {
                                splits.push(cssText.substring(0, k));
                                cssText = cssText.substring(k);
                                cssTextNorm = cssTextNorm.substring(splitNorm);
                                break;
                            }
                            else if (normPart.length < splitNorm) {
                                k += Math.max(1, Math.floor((splitNorm - normPart.length) / normFactor));
                            }
                            else {
                                k -= Math.max(1, Math.floor((normPart.length - splitNorm) * normFactor));
                            }
                        }
                        break;
                    }
                }
            }
        }
    }
    splits.push(cssText);
    return splits;
}
export function markCssSplits(cssText, style) {
    return splitCssText(cssText, style).join('/* rr_split */');
}
//# sourceMappingURL=utils.js.map