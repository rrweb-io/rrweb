import { createMirror as createNodeMirror } from '@newrelic/rrweb-snapshot';
import { NodeType as RRNodeType } from '@newrelic/rrweb-types';
import { BaseRRNode as RRNode, BaseRRCDATASection, BaseRRComment, BaseRRDocument, BaseRRDocumentType, BaseRRElement, BaseRRMediaElement, BaseRRText, NodeType, BaseRRDialogElement, } from './document';
export class RRDocument extends BaseRRDocument {
    UNSERIALIZED_STARTING_ID = -2;
    _unserializedId = this.UNSERIALIZED_STARTING_ID;
    get unserializedId() {
        return this._unserializedId--;
    }
    mirror = createMirror();
    scrollData = null;
    constructor(mirror) {
        super();
        if (mirror) {
            this.mirror = mirror;
        }
    }
    createDocument(_namespace, _qualifiedName, _doctype) {
        return new RRDocument();
    }
    createDocumentType(qualifiedName, publicId, systemId) {
        const documentTypeNode = new RRDocumentType(qualifiedName, publicId, systemId);
        documentTypeNode.ownerDocument = this;
        return documentTypeNode;
    }
    createElement(tagName) {
        const upperTagName = tagName.toUpperCase();
        let element;
        switch (upperTagName) {
            case 'AUDIO':
            case 'VIDEO':
                element = new RRMediaElement(upperTagName);
                break;
            case 'IFRAME':
                element = new RRIFrameElement(upperTagName, this.mirror);
                break;
            case 'CANVAS':
                element = new RRCanvasElement(upperTagName);
                break;
            case 'STYLE':
                element = new RRStyleElement(upperTagName);
                break;
            case 'DIALOG':
                element = new RRDialogElement(upperTagName);
                break;
            default:
                element = new RRElement(upperTagName);
                break;
        }
        element.ownerDocument = this;
        return element;
    }
    createComment(data) {
        const commentNode = new RRComment(data);
        commentNode.ownerDocument = this;
        return commentNode;
    }
    createCDATASection(data) {
        const sectionNode = new RRCDATASection(data);
        sectionNode.ownerDocument = this;
        return sectionNode;
    }
    createTextNode(data) {
        const textNode = new RRText(data);
        textNode.ownerDocument = this;
        return textNode;
    }
    destroyTree() {
        this.firstChild = null;
        this.lastChild = null;
        this.mirror.reset();
    }
    open() {
        super.open();
        this._unserializedId = this.UNSERIALIZED_STARTING_ID;
    }
}
export const RRDocumentType = BaseRRDocumentType;
export class RRElement extends BaseRRElement {
    inputData = null;
    scrollData = null;
}
export class RRMediaElement extends BaseRRMediaElement {
}
export class RRDialogElement extends BaseRRDialogElement {
}
export class RRCanvasElement extends RRElement {
    rr_dataURL = null;
    canvasMutations = [];
    getContext() {
        return null;
    }
}
export class RRStyleElement extends RRElement {
    rules = [];
}
export class RRIFrameElement extends RRElement {
    contentDocument = new RRDocument();
    constructor(upperTagName, mirror) {
        super(upperTagName);
        this.contentDocument.mirror = mirror;
    }
}
export const RRText = BaseRRText;
export const RRComment = BaseRRComment;
export const RRCDATASection = BaseRRCDATASection;
function getValidTagName(element) {
    if (element instanceof HTMLFormElement) {
        return 'FORM';
    }
    return element.tagName.toUpperCase();
}
export function buildFromNode(node, rrdom, domMirror, parentRRNode) {
    let rrNode;
    switch (node.nodeType) {
        case NodeType.DOCUMENT_NODE:
            if (parentRRNode && parentRRNode.nodeName === 'IFRAME')
                rrNode = parentRRNode.contentDocument;
            else {
                rrNode = rrdom;
                rrNode.compatMode = node.compatMode;
            }
            break;
        case NodeType.DOCUMENT_TYPE_NODE: {
            const documentType = node;
            rrNode = rrdom.createDocumentType(documentType.name, documentType.publicId, documentType.systemId);
            break;
        }
        case NodeType.ELEMENT_NODE: {
            const elementNode = node;
            const tagName = getValidTagName(elementNode);
            rrNode = rrdom.createElement(tagName);
            const rrElement = rrNode;
            for (const { name, value } of Array.from(elementNode.attributes)) {
                rrElement.attributes[name] = value;
            }
            elementNode.scrollLeft && (rrElement.scrollLeft = elementNode.scrollLeft);
            elementNode.scrollTop && (rrElement.scrollTop = elementNode.scrollTop);
            break;
        }
        case NodeType.TEXT_NODE:
            rrNode = rrdom.createTextNode(node.textContent || '');
            break;
        case NodeType.CDATA_SECTION_NODE:
            rrNode = rrdom.createCDATASection(node.data);
            break;
        case NodeType.COMMENT_NODE:
            rrNode = rrdom.createComment(node.textContent || '');
            break;
        case NodeType.DOCUMENT_FRAGMENT_NODE:
            rrNode = parentRRNode.attachShadow({ mode: 'open' });
            break;
        default:
            return null;
    }
    let sn = domMirror.getMeta(node);
    if (rrdom instanceof RRDocument) {
        if (!sn) {
            sn = getDefaultSN(rrNode, rrdom.unserializedId);
            domMirror.add(node, sn);
        }
        rrdom.mirror.add(rrNode, { ...sn });
    }
    return rrNode;
}
export function buildFromDom(dom, domMirror = createNodeMirror(), rrdom = new RRDocument()) {
    function walk(node, parentRRNode) {
        const rrNode = buildFromNode(node, rrdom, domMirror, parentRRNode);
        if (rrNode === null)
            return;
        if (parentRRNode?.nodeName !== 'IFRAME' &&
            node.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE) {
            parentRRNode?.appendChild(rrNode);
            rrNode.parentNode = parentRRNode;
            rrNode.parentElement = parentRRNode;
        }
        if (node.nodeName === 'IFRAME') {
            const iframeDoc = node.contentDocument;
            iframeDoc && walk(iframeDoc, rrNode);
        }
        else if (node.nodeType === NodeType.DOCUMENT_NODE ||
            node.nodeType === NodeType.ELEMENT_NODE ||
            node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE) {
            if (node.nodeType === NodeType.ELEMENT_NODE &&
                node.shadowRoot)
                walk(node.shadowRoot, rrNode);
            node.childNodes.forEach((childNode) => walk(childNode, rrNode));
        }
    }
    walk(dom, null);
    return rrdom;
}
export function createMirror() {
    return new Mirror();
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
export function getDefaultSN(node, id) {
    switch (node.RRNodeType) {
        case RRNodeType.Document:
            return {
                id,
                type: node.RRNodeType,
                childNodes: [],
            };
        case RRNodeType.DocumentType: {
            const doctype = node;
            return {
                id,
                type: node.RRNodeType,
                name: doctype.name,
                publicId: doctype.publicId,
                systemId: doctype.systemId,
            };
        }
        case RRNodeType.Element:
            return {
                id,
                type: node.RRNodeType,
                tagName: node.tagName.toLowerCase(),
                attributes: {},
                childNodes: [],
            };
        case RRNodeType.Text:
            return {
                id,
                type: node.RRNodeType,
                textContent: node.textContent || '',
            };
        case RRNodeType.Comment:
            return {
                id,
                type: node.RRNodeType,
                textContent: node.textContent || '',
            };
        case RRNodeType.CDATA:
            return {
                id,
                type: node.RRNodeType,
                textContent: '',
            };
    }
}
export function printRRDom(rootNode, mirror) {
    return walk(rootNode, mirror, '');
}
function walk(node, mirror, blankSpace) {
    let printText = `${blankSpace}${mirror.getId(node)} ${node.toString()}\n`;
    if (node.RRNodeType === RRNodeType.Element) {
        const element = node;
        if (element.shadowRoot)
            printText += walk(element.shadowRoot, mirror, blankSpace + '  ');
    }
    for (const child of node.childNodes)
        printText += walk(child, mirror, blankSpace + '  ');
    if (node.nodeName === 'IFRAME')
        printText += walk(node.contentDocument, mirror, blankSpace + '  ');
    return printText;
}
export { RRNode };
export { diff, createOrGetNode } from './diff';
export * from './document';
//# sourceMappingURL=index.js.map