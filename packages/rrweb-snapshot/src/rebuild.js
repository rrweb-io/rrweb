import { mediaSelectorPlugin, pseudoClassPlugin } from './css';
import { NodeType, } from '@rrweb/types';
import {} from './types';
import { isElement, Mirror, isNodeMetaEqual, extractFileExtension, } from './utils';
import postcss from 'postcss';
const tagMap = {
    script: 'noscript',
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
function getTagName(n) {
    let tagName = tagMap[n.tagName] ? tagMap[n.tagName] : n.tagName;
    if (tagName === 'link' && n.attributes._cssText) {
        tagName = 'style';
    }
    return tagName;
}
export function adaptCssForReplay(cssText, cache) {
    const cachedStyle = cache?.stylesWithHoverClass.get(cssText);
    if (cachedStyle)
        return cachedStyle;
    let result = cssText;
    try {
        const ast = postcss([
            mediaSelectorPlugin,
            pseudoClassPlugin,
        ]).process(cssText);
        result = ast.css;
    }
    catch (error) {
        console.warn('Failed to adapt css for replay', error);
    }
    cache?.stylesWithHoverClass.set(cssText, result);
    return result;
}
export function createCache() {
    const stylesWithHoverClass = new Map();
    return {
        stylesWithHoverClass,
    };
}
export function applyCssSplits(n, cssText, hackCss, cache) {
    const childTextNodes = [];
    for (const scn of n.childNodes) {
        if (scn.type === NodeType.Text) {
            childTextNodes.push(scn);
        }
    }
    const cssTextSplits = cssText.split('/* rr_split */');
    while (cssTextSplits.length > 1 &&
        cssTextSplits.length > childTextNodes.length) {
        cssTextSplits.splice(-2, 2, cssTextSplits.slice(-2).join(''));
    }
    let adaptedCss = '';
    if (hackCss) {
        adaptedCss = adaptCssForReplay(cssTextSplits.join(''), cache);
    }
    let startIndex = 0;
    for (let i = 0; i < childTextNodes.length; i++) {
        if (i === cssTextSplits.length) {
            break;
        }
        const childTextNode = childTextNodes[i];
        if (!hackCss) {
            childTextNode.textContent = cssTextSplits[i];
        }
        else if (i < cssTextSplits.length - 1) {
            let endIndex = startIndex;
            let endSearch = cssTextSplits[i + 1].length;
            endSearch = Math.min(endSearch, 30);
            let found = false;
            for (; endSearch > 2; endSearch--) {
                const searchBit = cssTextSplits[i + 1].substring(0, endSearch);
                const searchIndex = adaptedCss.substring(startIndex).indexOf(searchBit);
                found = searchIndex !== -1;
                if (found) {
                    endIndex += searchIndex;
                    break;
                }
            }
            if (!found) {
                endIndex += cssTextSplits[i].length;
            }
            childTextNode.textContent = adaptedCss.substring(startIndex, endIndex);
            startIndex = endIndex;
        }
        else {
            childTextNode.textContent = adaptedCss.substring(startIndex);
        }
    }
}
export function buildStyleNode(n, styleEl, cssText, options) {
    const { doc, hackCss, cache } = options;
    if (n.childNodes.length) {
        applyCssSplits(n, cssText, hackCss, cache);
    }
    else {
        if (hackCss) {
            cssText = adaptCssForReplay(cssText, cache);
        }
        styleEl.appendChild(doc.createTextNode(cssText));
    }
}
function buildNode(n, options) {
    const { doc, hackCss, cache } = options;
    switch (n.type) {
        case NodeType.Document:
            return doc.implementation.createDocument(null, '', null);
        case NodeType.DocumentType:
            return doc.implementation.createDocumentType(n.name || 'html', n.publicId, n.systemId);
        case NodeType.Element: {
            const tagName = getTagName(n);
            let node;
            if (n.isSVG) {
                node = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
            }
            else {
                if (n.isCustom &&
                    doc.defaultView?.customElements &&
                    !doc.defaultView.customElements.get(n.tagName))
                    doc.defaultView.customElements.define(n.tagName, class extends doc.defaultView.HTMLElement {
                    });
                node = doc.createElement(tagName);
            }
            const specialAttributes = {};
            for (const name in n.attributes) {
                if (!Object.prototype.hasOwnProperty.call(n.attributes, name)) {
                    continue;
                }
                let value = n.attributes[name];
                if (tagName === 'option' &&
                    name === 'selected' &&
                    value === false) {
                    continue;
                }
                if (value === null) {
                    continue;
                }
                if (value === true)
                    value = '';
                if (name.startsWith('rr_')) {
                    specialAttributes[name] = value;
                    continue;
                }
                if (typeof value !== 'string') {
                }
                else if (tagName === 'style' && name === '_cssText') {
                    buildStyleNode(n, node, value, options);
                    continue;
                }
                else if (tagName === 'textarea' && name === 'value') {
                    node.appendChild(doc.createTextNode(value));
                    n.childNodes = [];
                    continue;
                }
                try {
                    if (n.isSVG && name === 'xlink:href') {
                        node.setAttributeNS('http://www.w3.org/1999/xlink', name, value.toString());
                    }
                    else if (name === 'onload' ||
                        name === 'onclick' ||
                        name.substring(0, 7) === 'onmouse') {
                        node.setAttribute('_' + name, value.toString());
                    }
                    else if (tagName === 'meta' &&
                        n.attributes['http-equiv'] === 'Content-Security-Policy' &&
                        name === 'content') {
                        node.setAttribute('csp-content', value.toString());
                        continue;
                    }
                    else if (tagName === 'link' &&
                        ((n.attributes.rel === 'preload' && n.attributes.as === 'script') ||
                            n.attributes.rel === 'modulepreload')) {
                    }
                    else if (tagName === 'link' &&
                        n.attributes.rel === 'prefetch' &&
                        typeof n.attributes.href === 'string' &&
                        extractFileExtension(n.attributes.href) === 'js') {
                    }
                    else if (tagName === 'img' &&
                        n.attributes.srcset &&
                        n.attributes.rr_dataURL) {
                        node.setAttribute('rrweb-original-srcset', n.attributes.srcset);
                    }
                    else {
                        node.setAttribute(name, value.toString());
                    }
                }
                catch (error) {
                }
            }
            for (const name in specialAttributes) {
                const value = specialAttributes[name];
                if (tagName === 'canvas' && name === 'rr_dataURL') {
                    const image = doc.createElement('img');
                    image.onload = () => {
                        const ctx = node.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(image, 0, 0, image.width, image.height);
                        }
                    };
                    image.src = value.toString();
                    if (node.RRNodeType)
                        node.rr_dataURL = value.toString();
                }
                else if (tagName === 'img' && name === 'rr_dataURL') {
                    const image = node;
                    if (!image.currentSrc.startsWith('data:')) {
                        image.setAttribute('rrweb-original-src', n.attributes.src);
                        image.src = value.toString();
                    }
                }
                if (name === 'rr_width') {
                    node.style.setProperty('width', value.toString());
                }
                else if (name === 'rr_height') {
                    node.style.setProperty('height', value.toString());
                }
                else if (name === 'rr_mediaCurrentTime' &&
                    typeof value === 'number') {
                    node.currentTime = value;
                }
                else if (name === 'rr_mediaState') {
                    switch (value) {
                        case 'played':
                            node
                                .play()
                                .catch((e) => console.warn('media playback error', e));
                            break;
                        case 'paused':
                            node.pause();
                            break;
                        default:
                    }
                }
                else if (name === 'rr_mediaPlaybackRate' &&
                    typeof value === 'number') {
                    node.playbackRate = value;
                }
                else if (name === 'rr_mediaMuted' && typeof value === 'boolean') {
                    node.muted = value;
                }
                else if (name === 'rr_mediaLoop' && typeof value === 'boolean') {
                    node.loop = value;
                }
                else if (name === 'rr_mediaVolume' && typeof value === 'number') {
                    node.volume = value;
                }
                else if (name === 'rr_open_mode') {
                    node.setAttribute('rr_open_mode', value);
                }
            }
            if (n.isShadowHost) {
                if (!node.shadowRoot) {
                    node.attachShadow({ mode: 'open' });
                }
                else {
                    while (node.shadowRoot.firstChild) {
                        node.shadowRoot.removeChild(node.shadowRoot.firstChild);
                    }
                }
            }
            return node;
        }
        case NodeType.Text:
            if (n.isStyle && hackCss) {
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
export function buildNodeWithSN(n, options) {
    const { doc, mirror, skipChild = false, hackCss = true, afterAppend, cache, } = options;
    if (mirror.has(n.id)) {
        const nodeInMirror = mirror.getNode(n.id);
        const meta = mirror.getMeta(nodeInMirror);
        if (isNodeMetaEqual(meta, n))
            return mirror.getNode(n.id);
    }
    let node = buildNode(n, { doc, hackCss, cache });
    if (!node) {
        return null;
    }
    if (n.rootId && mirror.getNode(n.rootId) !== doc) {
        mirror.replace(n.rootId, doc);
    }
    if (n.type === NodeType.Document) {
        doc.close();
        doc.open();
        if (n.compatMode === 'BackCompat' &&
            n.childNodes &&
            n.childNodes[0].type !== NodeType.DocumentType) {
            if (n.childNodes[0].type === NodeType.Element &&
                'xmlns' in n.childNodes[0].attributes &&
                n.childNodes[0].attributes.xmlns === 'http://www.w3.org/1999/xhtml') {
                doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">');
            }
            else {
                doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">');
            }
        }
        node = doc;
    }
    mirror.add(node, n);
    if ((n.type === NodeType.Document || n.type === NodeType.Element) &&
        !skipChild) {
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
            }
            else if (n.type === NodeType.Document &&
                childN.type == NodeType.Element) {
                const htmlElement = childNode;
                let body = null;
                htmlElement.childNodes.forEach((child) => {
                    if (child.nodeName === 'BODY')
                        body = child;
                });
                if (body) {
                    htmlElement.removeChild(body);
                    node.appendChild(childNode);
                    htmlElement.appendChild(body);
                }
                else {
                    node.appendChild(childNode);
                }
            }
            else {
                node.appendChild(childNode);
            }
            if (afterAppend) {
                afterAppend(childNode, childN.id);
            }
        }
    }
    return node;
}
function visit(mirror, onVisit) {
    function walk(node) {
        onVisit(node);
    }
    for (const id of mirror.getIds()) {
        if (mirror.has(id)) {
            walk(mirror.getNode(id));
        }
    }
}
function handleScroll(node, mirror) {
    const n = mirror.getMeta(node);
    if (n?.type !== NodeType.Element) {
        return;
    }
    const el = node;
    for (const name in n.attributes) {
        if (!(Object.prototype.hasOwnProperty.call(n.attributes, name) &&
            name.startsWith('rr_'))) {
            continue;
        }
        const value = n.attributes[name];
        if (name === 'rr_scrollLeft') {
            el.scrollLeft = value;
        }
        if (name === 'rr_scrollTop') {
            el.scrollTop = value;
        }
    }
}
function rebuild(n, options) {
    const { doc, onVisit, hackCss = true, afterAppend, cache, mirror = new Mirror(), } = options;
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
//# sourceMappingURL=rebuild.js.map