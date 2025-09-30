import {} from '@newrelic/rrweb-snapshot';
import { NodeType as RRNodeType } from '@newrelic/rrweb-types';
const NAMESPACES = {
    svg: 'http://www.w3.org/2000/svg',
    'xlink:href': 'http://www.w3.org/1999/xlink',
    xmlns: 'http://www.w3.org/2000/xmlns/',
};
const SVGTagMap = {
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
let createdNodeSet = null;
export function diff(oldTree, newTree, replayer, rrnodeMirror = newTree.mirror ||
    newTree.ownerDocument.mirror) {
    oldTree = diffBeforeUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror);
    diffChildren(oldTree, newTree, replayer, rrnodeMirror);
    diffAfterUpdatingChildren(oldTree, newTree, replayer);
}
function diffBeforeUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror) {
    if (replayer.afterAppend && !createdNodeSet) {
        createdNodeSet = new WeakSet();
        setTimeout(() => {
            createdNodeSet = null;
        }, 0);
    }
    if (!sameNodeType(oldTree, newTree)) {
        const calibratedOldTree = createOrGetNode(newTree, replayer.mirror, rrnodeMirror);
        oldTree.parentNode?.replaceChild(calibratedOldTree, oldTree);
        oldTree = calibratedOldTree;
    }
    switch (newTree.RRNodeType) {
        case RRNodeType.Document: {
            if (!nodeMatching(oldTree, newTree, replayer.mirror, rrnodeMirror)) {
                const newMeta = rrnodeMirror.getMeta(newTree);
                if (newMeta) {
                    replayer.mirror.removeNodeFromMap(oldTree);
                    oldTree.close();
                    oldTree.open();
                    replayer.mirror.add(oldTree, newMeta);
                    createdNodeSet?.add(oldTree);
                }
            }
            break;
        }
        case RRNodeType.Element: {
            const oldElement = oldTree;
            const newRRElement = newTree;
            switch (newRRElement.tagName) {
                case 'IFRAME': {
                    const oldContentDocument = oldTree
                        .contentDocument;
                    if (!oldContentDocument)
                        break;
                    diff(oldContentDocument, newTree.contentDocument, replayer, rrnodeMirror);
                    break;
                }
            }
            if (newRRElement.shadowRoot) {
                if (!oldElement.shadowRoot)
                    oldElement.attachShadow({ mode: 'open' });
                diffChildren(oldElement.shadowRoot, newRRElement.shadowRoot, replayer, rrnodeMirror);
            }
            diffProps(oldElement, newRRElement, rrnodeMirror);
            break;
        }
    }
    return oldTree;
}
function diffAfterUpdatingChildren(oldTree, newTree, replayer) {
    switch (newTree.RRNodeType) {
        case RRNodeType.Document: {
            const scrollData = newTree.scrollData;
            scrollData && replayer.applyScroll(scrollData, true);
            break;
        }
        case RRNodeType.Element: {
            const oldElement = oldTree;
            const newRRElement = newTree;
            newRRElement.scrollData &&
                replayer.applyScroll(newRRElement.scrollData, true);
            newRRElement.inputData && replayer.applyInput(newRRElement.inputData);
            switch (newRRElement.tagName) {
                case 'AUDIO':
                case 'VIDEO': {
                    const oldMediaElement = oldTree;
                    const newMediaRRElement = newRRElement;
                    if (newMediaRRElement.paused !== undefined)
                        newMediaRRElement.paused
                            ? void oldMediaElement.pause()
                            : void oldMediaElement.play();
                    if (newMediaRRElement.muted !== undefined)
                        oldMediaElement.muted = newMediaRRElement.muted;
                    if (newMediaRRElement.volume !== undefined)
                        oldMediaElement.volume = newMediaRRElement.volume;
                    if (newMediaRRElement.currentTime !== undefined)
                        oldMediaElement.currentTime = newMediaRRElement.currentTime;
                    if (newMediaRRElement.playbackRate !== undefined)
                        oldMediaElement.playbackRate = newMediaRRElement.playbackRate;
                    if (newMediaRRElement.loop !== undefined)
                        oldMediaElement.loop = newMediaRRElement.loop;
                    break;
                }
                case 'CANVAS': {
                    const rrCanvasElement = newTree;
                    if (rrCanvasElement.rr_dataURL !== null) {
                        const image = document.createElement('img');
                        image.onload = () => {
                            const ctx = oldElement.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(image, 0, 0, image.width, image.height);
                            }
                        };
                        image.src = rrCanvasElement.rr_dataURL;
                    }
                    rrCanvasElement.canvasMutations.forEach((canvasMutation) => replayer.applyCanvas(canvasMutation.event, canvasMutation.mutation, oldTree));
                    break;
                }
                case 'STYLE': {
                    const styleSheet = oldElement.sheet;
                    styleSheet &&
                        newTree.rules.forEach((data) => replayer.applyStyleSheetMutation(data, styleSheet));
                    break;
                }
                case 'DIALOG': {
                    const dialog = oldElement;
                    const rrDialog = newRRElement;
                    const wasOpen = dialog.open;
                    const wasModal = dialog.matches('dialog:modal');
                    const shouldBeOpen = rrDialog.open;
                    const shouldBeModal = rrDialog.isModal;
                    const modalChanged = wasModal !== shouldBeModal;
                    const openChanged = wasOpen !== shouldBeOpen;
                    if (modalChanged || (wasOpen && openChanged))
                        dialog.close();
                    if (shouldBeOpen && (openChanged || modalChanged)) {
                        try {
                            if (shouldBeModal)
                                dialog.showModal();
                            else
                                dialog.show();
                        }
                        catch (e) {
                            console.warn(e);
                        }
                    }
                    break;
                }
            }
            break;
        }
        case RRNodeType.Text:
        case RRNodeType.Comment:
        case RRNodeType.CDATA: {
            if (oldTree.textContent !==
                newTree.data)
                oldTree.textContent = newTree.data;
            break;
        }
    }
    if (createdNodeSet?.has(oldTree)) {
        createdNodeSet.delete(oldTree);
        replayer.afterAppend?.(oldTree, replayer.mirror.getId(oldTree));
    }
}
function diffProps(oldTree, newTree, rrnodeMirror) {
    const oldAttributes = oldTree.attributes;
    const newAttributes = newTree.attributes;
    for (const name in newAttributes) {
        const newValue = newAttributes[name];
        const sn = rrnodeMirror.getMeta(newTree);
        if (sn?.isSVG && NAMESPACES[name])
            oldTree.setAttributeNS(NAMESPACES[name], name, newValue);
        else if (newTree.tagName === 'CANVAS' && name === 'rr_dataURL') {
            const image = document.createElement('img');
            image.src = newValue;
            image.onload = () => {
                const ctx = oldTree.getContext('2d');
                if (ctx) {
                    ctx.drawImage(image, 0, 0, image.width, image.height);
                }
            };
        }
        else if (newTree.tagName === 'IFRAME' && name === 'srcdoc')
            continue;
        else {
            try {
                oldTree.setAttribute(name, newValue);
            }
            catch (err) {
                console.warn(err);
            }
        }
    }
    for (const { name } of Array.from(oldAttributes))
        if (!(name in newAttributes))
            oldTree.removeAttribute(name);
    newTree.scrollLeft && (oldTree.scrollLeft = newTree.scrollLeft);
    newTree.scrollTop && (oldTree.scrollTop = newTree.scrollTop);
}
function diffChildren(oldTree, newTree, replayer, rrnodeMirror) {
    const oldChildren = Array.from(oldTree.childNodes);
    const newChildren = newTree.childNodes;
    if (oldChildren.length === 0 && newChildren.length === 0)
        return;
    let oldStartIndex = 0, oldEndIndex = oldChildren.length - 1, newStartIndex = 0, newEndIndex = newChildren.length - 1;
    let oldStartNode = oldChildren[oldStartIndex], oldEndNode = oldChildren[oldEndIndex], newStartNode = newChildren[newStartIndex], newEndNode = newChildren[newEndIndex];
    let oldIdToIndex = undefined, indexInOld = undefined;
    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
        if (oldStartNode === undefined) {
            oldStartNode = oldChildren[++oldStartIndex];
        }
        else if (oldEndNode === undefined) {
            oldEndNode = oldChildren[--oldEndIndex];
        }
        else if (nodeMatching(oldStartNode, newStartNode, replayer.mirror, rrnodeMirror)) {
            oldStartNode = oldChildren[++oldStartIndex];
            newStartNode = newChildren[++newStartIndex];
        }
        else if (nodeMatching(oldEndNode, newEndNode, replayer.mirror, rrnodeMirror)) {
            oldEndNode = oldChildren[--oldEndIndex];
            newEndNode = newChildren[--newEndIndex];
        }
        else if (nodeMatching(oldStartNode, newEndNode, replayer.mirror, rrnodeMirror)) {
            try {
                oldTree.insertBefore(oldStartNode, oldEndNode.nextSibling);
            }
            catch (e) {
                console.warn(e);
            }
            oldStartNode = oldChildren[++oldStartIndex];
            newEndNode = newChildren[--newEndIndex];
        }
        else if (nodeMatching(oldEndNode, newStartNode, replayer.mirror, rrnodeMirror)) {
            try {
                oldTree.insertBefore(oldEndNode, oldStartNode);
            }
            catch (e) {
                console.warn(e);
            }
            oldEndNode = oldChildren[--oldEndIndex];
            newStartNode = newChildren[++newStartIndex];
        }
        else {
            if (!oldIdToIndex) {
                oldIdToIndex = {};
                for (let i = oldStartIndex; i <= oldEndIndex; i++) {
                    const oldChild = oldChildren[i];
                    if (oldChild && replayer.mirror.hasNode(oldChild))
                        oldIdToIndex[replayer.mirror.getId(oldChild)] = i;
                }
            }
            indexInOld = oldIdToIndex[rrnodeMirror.getId(newStartNode)];
            const nodeToMove = oldChildren[indexInOld];
            if (indexInOld !== undefined &&
                nodeToMove &&
                nodeMatching(nodeToMove, newStartNode, replayer.mirror, rrnodeMirror)) {
                try {
                    oldTree.insertBefore(nodeToMove, oldStartNode);
                }
                catch (e) {
                    console.warn(e);
                }
                oldChildren[indexInOld] = undefined;
            }
            else {
                const newNode = createOrGetNode(newStartNode, replayer.mirror, rrnodeMirror);
                if (oldTree.nodeName === '#document' &&
                    oldStartNode &&
                    ((newNode.nodeType === newNode.DOCUMENT_TYPE_NODE &&
                        oldStartNode.nodeType === oldStartNode.DOCUMENT_TYPE_NODE) ||
                        (newNode.nodeType === newNode.ELEMENT_NODE &&
                            oldStartNode.nodeType === oldStartNode.ELEMENT_NODE))) {
                    oldTree.removeChild(oldStartNode);
                    replayer.mirror.removeNodeFromMap(oldStartNode);
                    oldStartNode = oldChildren[++oldStartIndex];
                }
                try {
                    oldTree.insertBefore(newNode, oldStartNode || null);
                }
                catch (e) {
                    console.warn(e);
                }
            }
            newStartNode = newChildren[++newStartIndex];
        }
    }
    if (oldStartIndex > oldEndIndex) {
        const referenceRRNode = newChildren[newEndIndex + 1];
        let referenceNode = null;
        if (referenceRRNode)
            referenceNode = replayer.mirror.getNode(rrnodeMirror.getId(referenceRRNode));
        for (; newStartIndex <= newEndIndex; ++newStartIndex) {
            const newNode = createOrGetNode(newChildren[newStartIndex], replayer.mirror, rrnodeMirror);
            try {
                oldTree.insertBefore(newNode, referenceNode);
            }
            catch (e) {
                console.warn(e);
            }
        }
    }
    else if (newStartIndex > newEndIndex) {
        for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
            const node = oldChildren[oldStartIndex];
            if (!node || node.parentNode !== oldTree)
                continue;
            try {
                oldTree.removeChild(node);
                replayer.mirror.removeNodeFromMap(node);
            }
            catch (e) {
                console.warn(e);
            }
        }
    }
    let oldChild = oldTree.firstChild;
    let newChild = newTree.firstChild;
    while (oldChild !== null && newChild !== null) {
        diff(oldChild, newChild, replayer, rrnodeMirror);
        oldChild = oldChild.nextSibling;
        newChild = newChild.nextSibling;
    }
}
export function createOrGetNode(rrNode, domMirror, rrnodeMirror) {
    const nodeId = rrnodeMirror.getId(rrNode);
    const sn = rrnodeMirror.getMeta(rrNode);
    let node = null;
    if (nodeId > -1)
        node = domMirror.getNode(nodeId);
    if (node !== null && sameNodeType(node, rrNode))
        return node;
    switch (rrNode.RRNodeType) {
        case RRNodeType.Document:
            node = new Document();
            break;
        case RRNodeType.DocumentType:
            node = document.implementation.createDocumentType(rrNode.name, rrNode.publicId, rrNode.systemId);
            break;
        case RRNodeType.Element: {
            let tagName = rrNode.tagName.toLowerCase();
            tagName = SVGTagMap[tagName] || tagName;
            if (sn && 'isSVG' in sn && sn?.isSVG) {
                node = document.createElementNS(NAMESPACES['svg'], tagName);
            }
            else
                node = document.createElement(rrNode.tagName);
            break;
        }
        case RRNodeType.Text:
            node = document.createTextNode(rrNode.data);
            break;
        case RRNodeType.Comment:
            node = document.createComment(rrNode.data);
            break;
        case RRNodeType.CDATA:
            node = document.createCDATASection(rrNode.data);
            break;
    }
    if (sn)
        domMirror.add(node, { ...sn });
    try {
        createdNodeSet?.add(node);
    }
    catch (e) {
    }
    return node;
}
export function sameNodeType(node1, node2) {
    if (node1.nodeType !== node2.nodeType)
        return false;
    return (node1.nodeType !== node1.ELEMENT_NODE ||
        node1.tagName.toUpperCase() ===
            node2.tagName);
}
export function nodeMatching(node1, node2, domMirror, rrdomMirror) {
    const node1Id = domMirror.getId(node1);
    const node2Id = rrdomMirror.getId(node2);
    if (node1Id === -1 || node1Id !== node2Id)
        return false;
    return sameNodeType(node1, node2);
}
//# sourceMappingURL=diff.js.map