import { NodeType as RRNodeType } from '@newrelic/rrweb-types';
import { parseCSSText, camelize, toCSSText } from './style';
export class BaseRRNode {
    parentElement = null;
    parentNode = null;
    ownerDocument;
    firstChild = null;
    lastChild = null;
    previousSibling = null;
    nextSibling = null;
    ELEMENT_NODE = NodeType.ELEMENT_NODE;
    TEXT_NODE = NodeType.TEXT_NODE;
    nodeType;
    nodeName;
    RRNodeType;
    constructor(..._args) {
    }
    get childNodes() {
        const childNodes = [];
        let childIterator = this.firstChild;
        while (childIterator) {
            childNodes.push(childIterator);
            childIterator = childIterator.nextSibling;
        }
        return childNodes;
    }
    contains(node) {
        if (!(node instanceof BaseRRNode))
            return false;
        else if (node.ownerDocument !== this.ownerDocument)
            return false;
        else if (node === this)
            return true;
        while (node.parentNode) {
            if (node.parentNode === this)
                return true;
            node = node.parentNode;
        }
        return false;
    }
    appendChild(_newChild) {
        throw new Error(`RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`);
    }
    insertBefore(_newChild, _refChild) {
        throw new Error(`RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`);
    }
    removeChild(_node) {
        throw new Error(`RRDomException: Failed to execute 'removeChild' on 'RRNode': This RRNode type does not support this method.`);
    }
    toString() {
        return 'RRNode';
    }
}
export class BaseRRDocument extends BaseRRNode {
    nodeType = NodeType.DOCUMENT_NODE;
    nodeName = '#document';
    compatMode = 'CSS1Compat';
    RRNodeType = RRNodeType.Document;
    textContent = null;
    constructor(...args) {
        super(args);
        this.ownerDocument = this;
    }
    get documentElement() {
        return (this.childNodes.find((node) => node.RRNodeType === RRNodeType.Element &&
            node.tagName === 'HTML') || null);
    }
    get body() {
        return (this.documentElement?.childNodes.find((node) => node.RRNodeType === RRNodeType.Element &&
            node.tagName === 'BODY') || null);
    }
    get head() {
        return (this.documentElement?.childNodes.find((node) => node.RRNodeType === RRNodeType.Element &&
            node.tagName === 'HEAD') || null);
    }
    get implementation() {
        return this;
    }
    get firstElementChild() {
        return this.documentElement;
    }
    appendChild(newChild) {
        const nodeType = newChild.RRNodeType;
        if (nodeType === RRNodeType.Element ||
            nodeType === RRNodeType.DocumentType) {
            if (this.childNodes.some((s) => s.RRNodeType === nodeType)) {
                throw new Error(`RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${nodeType === RRNodeType.Element ? 'RRElement' : 'RRDoctype'} on RRDocument allowed.`);
            }
        }
        const child = appendChild(this, newChild);
        child.parentElement = null;
        return child;
    }
    insertBefore(newChild, refChild) {
        const nodeType = newChild.RRNodeType;
        if (nodeType === RRNodeType.Element ||
            nodeType === RRNodeType.DocumentType) {
            if (this.childNodes.some((s) => s.RRNodeType === nodeType)) {
                throw new Error(`RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one ${nodeType === RRNodeType.Element ? 'RRElement' : 'RRDoctype'} on RRDocument allowed.`);
            }
        }
        const child = insertBefore(this, newChild, refChild);
        child.parentElement = null;
        return child;
    }
    removeChild(node) {
        return removeChild(this, node);
    }
    open() {
        this.firstChild = null;
        this.lastChild = null;
    }
    close() {
    }
    write(content) {
        let publicId;
        if (content ===
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">')
            publicId = '-//W3C//DTD XHTML 1.0 Transitional//EN';
        else if (content ===
            '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">')
            publicId = '-//W3C//DTD HTML 4.0 Transitional//EN';
        if (publicId) {
            const doctype = this.createDocumentType('html', publicId, '');
            this.open();
            this.appendChild(doctype);
        }
    }
    createDocument(_namespace, _qualifiedName, _doctype) {
        return new BaseRRDocument();
    }
    createDocumentType(qualifiedName, publicId, systemId) {
        const doctype = new BaseRRDocumentType(qualifiedName, publicId, systemId);
        doctype.ownerDocument = this;
        return doctype;
    }
    createElement(tagName) {
        const element = new BaseRRElement(tagName);
        element.ownerDocument = this;
        return element;
    }
    createElementNS(_namespaceURI, qualifiedName) {
        return this.createElement(qualifiedName);
    }
    createTextNode(data) {
        const text = new BaseRRText(data);
        text.ownerDocument = this;
        return text;
    }
    createComment(data) {
        const comment = new BaseRRComment(data);
        comment.ownerDocument = this;
        return comment;
    }
    createCDATASection(data) {
        const CDATASection = new BaseRRCDATASection(data);
        CDATASection.ownerDocument = this;
        return CDATASection;
    }
    toString() {
        return 'RRDocument';
    }
}
export class BaseRRDocumentType extends BaseRRNode {
    nodeType = NodeType.DOCUMENT_TYPE_NODE;
    RRNodeType = RRNodeType.DocumentType;
    name;
    publicId;
    systemId;
    textContent = null;
    constructor(qualifiedName, publicId, systemId) {
        super();
        this.name = qualifiedName;
        this.publicId = publicId;
        this.systemId = systemId;
        this.nodeName = qualifiedName;
    }
    toString() {
        return 'RRDocumentType';
    }
}
export class BaseRRElement extends BaseRRNode {
    nodeType = NodeType.ELEMENT_NODE;
    RRNodeType = RRNodeType.Element;
    tagName;
    attributes = {};
    shadowRoot = null;
    scrollLeft;
    scrollTop;
    constructor(tagName) {
        super();
        this.tagName = tagName.toUpperCase();
        this.nodeName = tagName.toUpperCase();
    }
    get textContent() {
        let result = '';
        this.childNodes.forEach((node) => (result += node.textContent));
        return result;
    }
    set textContent(textContent) {
        this.firstChild = null;
        this.lastChild = null;
        this.appendChild(this.ownerDocument.createTextNode(textContent));
    }
    get classList() {
        return new ClassList(this.attributes.class, (newClassName) => {
            this.attributes.class = newClassName;
        });
    }
    get id() {
        return this.attributes.id || '';
    }
    get className() {
        return this.attributes.class || '';
    }
    get style() {
        const style = (this.attributes.style ? parseCSSText(this.attributes.style) : {});
        const hyphenateRE = /\B([A-Z])/g;
        style.setProperty = (name, value, priority) => {
            if (hyphenateRE.test(name))
                return;
            const normalizedName = camelize(name);
            if (!value)
                delete style[normalizedName];
            else
                style[normalizedName] = value;
            if (priority === 'important')
                style[normalizedName] += ' !important';
            this.attributes.style = toCSSText(style);
        };
        style.removeProperty = (name) => {
            if (hyphenateRE.test(name))
                return '';
            const normalizedName = camelize(name);
            const value = style[normalizedName] || '';
            delete style[normalizedName];
            this.attributes.style = toCSSText(style);
            return value;
        };
        return style;
    }
    getAttribute(name) {
        if (this.attributes[name] === undefined)
            return null;
        return this.attributes[name];
    }
    setAttribute(name, attribute) {
        this.attributes[name] = attribute;
    }
    setAttributeNS(_namespace, qualifiedName, value) {
        this.setAttribute(qualifiedName, value);
    }
    removeAttribute(name) {
        delete this.attributes[name];
    }
    appendChild(newChild) {
        return appendChild(this, newChild);
    }
    insertBefore(newChild, refChild) {
        return insertBefore(this, newChild, refChild);
    }
    removeChild(node) {
        return removeChild(this, node);
    }
    attachShadow(_init) {
        const shadowRoot = this.ownerDocument.createElement('SHADOWROOT');
        this.shadowRoot = shadowRoot;
        return shadowRoot;
    }
    dispatchEvent(_event) {
        return true;
    }
    toString() {
        let attributeString = '';
        for (const attribute in this.attributes) {
            attributeString += `${attribute}="${this.attributes[attribute]}" `;
        }
        return `${this.tagName} ${attributeString}`;
    }
}
export class BaseRRMediaElement extends BaseRRElement {
    currentTime;
    volume;
    paused;
    muted;
    playbackRate;
    loop;
    attachShadow(_init) {
        throw new Error(`RRDomException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow`);
    }
    play() {
        this.paused = false;
    }
    pause() {
        this.paused = true;
    }
}
export class BaseRRDialogElement extends BaseRRElement {
    tagName = 'DIALOG';
    nodeName = 'DIALOG';
    get isModal() {
        return this.getAttribute('rr_open_mode') === 'modal';
    }
    get open() {
        return this.getAttribute('open') !== null;
    }
    close() {
        this.removeAttribute('open');
        this.removeAttribute('rr_open_mode');
    }
    show() {
        this.setAttribute('open', '');
        this.setAttribute('rr_open_mode', 'non-modal');
    }
    showModal() {
        this.setAttribute('open', '');
        this.setAttribute('rr_open_mode', 'modal');
    }
}
export class BaseRRText extends BaseRRNode {
    nodeType = NodeType.TEXT_NODE;
    nodeName = '#text';
    RRNodeType = RRNodeType.Text;
    data;
    constructor(data) {
        super();
        this.data = data;
    }
    get textContent() {
        return this.data;
    }
    set textContent(textContent) {
        this.data = textContent;
    }
    toString() {
        return `RRText text=${JSON.stringify(this.data)}`;
    }
}
export class BaseRRComment extends BaseRRNode {
    nodeType = NodeType.COMMENT_NODE;
    nodeName = '#comment';
    RRNodeType = RRNodeType.Comment;
    data;
    constructor(data) {
        super();
        this.data = data;
    }
    get textContent() {
        return this.data;
    }
    set textContent(textContent) {
        this.data = textContent;
    }
    toString() {
        return `RRComment text=${JSON.stringify(this.data)}`;
    }
}
export class BaseRRCDATASection extends BaseRRNode {
    nodeName = '#cdata-section';
    nodeType = NodeType.CDATA_SECTION_NODE;
    RRNodeType = RRNodeType.CDATA;
    data;
    constructor(data) {
        super();
        this.data = data;
    }
    get textContent() {
        return this.data;
    }
    set textContent(textContent) {
        this.data = textContent;
    }
    toString() {
        return `RRCDATASection data=${JSON.stringify(this.data)}`;
    }
}
export class ClassList {
    onChange;
    classes = [];
    constructor(classText, onChange) {
        if (classText) {
            const classes = classText.trim().split(/\s+/);
            this.classes.push(...classes);
        }
        this.onChange = onChange;
    }
    add = (...classNames) => {
        for (const item of classNames) {
            const className = String(item);
            if (this.classes.indexOf(className) >= 0)
                continue;
            this.classes.push(className);
        }
        this.onChange && this.onChange(this.classes.join(' '));
    };
    remove = (...classNames) => {
        this.classes = this.classes.filter((item) => classNames.indexOf(item) === -1);
        this.onChange && this.onChange(this.classes.join(' '));
    };
}
function appendChild(parent, newChild) {
    if (newChild.parentNode)
        newChild.parentNode.removeChild(newChild);
    if (parent.lastChild) {
        parent.lastChild.nextSibling = newChild;
        newChild.previousSibling = parent.lastChild;
    }
    else {
        parent.firstChild = newChild;
        newChild.previousSibling = null;
    }
    parent.lastChild = newChild;
    newChild.nextSibling = null;
    newChild.parentNode = parent;
    newChild.parentElement = parent;
    newChild.ownerDocument = parent.ownerDocument;
    return newChild;
}
function insertBefore(parent, newChild, refChild) {
    if (!refChild)
        return appendChild(parent, newChild);
    if (refChild.parentNode !== parent)
        throw new Error("Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.");
    if (newChild === refChild)
        return newChild;
    if (newChild.parentNode)
        newChild.parentNode.removeChild(newChild);
    newChild.previousSibling = refChild.previousSibling;
    refChild.previousSibling = newChild;
    newChild.nextSibling = refChild;
    if (newChild.previousSibling)
        newChild.previousSibling.nextSibling = newChild;
    else
        parent.firstChild = newChild;
    newChild.parentElement = parent;
    newChild.parentNode = parent;
    newChild.ownerDocument = parent.ownerDocument;
    return newChild;
}
function removeChild(parent, child) {
    if (child.parentNode !== parent)
        throw new Error("Failed to execute 'removeChild' on 'RRNode': The RRNode to be removed is not a child of this RRNode.");
    if (child.previousSibling)
        child.previousSibling.nextSibling = child.nextSibling;
    else
        parent.firstChild = child.nextSibling;
    if (child.nextSibling)
        child.nextSibling.previousSibling = child.previousSibling;
    else
        parent.lastChild = child.previousSibling;
    child.previousSibling = null;
    child.nextSibling = null;
    child.parentElement = null;
    child.parentNode = null;
    return child;
}
export var NodeType;
(function (NodeType) {
    NodeType[NodeType["PLACEHOLDER"] = 0] = "PLACEHOLDER";
    NodeType[NodeType["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
    NodeType[NodeType["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
    NodeType[NodeType["TEXT_NODE"] = 3] = "TEXT_NODE";
    NodeType[NodeType["CDATA_SECTION_NODE"] = 4] = "CDATA_SECTION_NODE";
    NodeType[NodeType["ENTITY_REFERENCE_NODE"] = 5] = "ENTITY_REFERENCE_NODE";
    NodeType[NodeType["ENTITY_NODE"] = 6] = "ENTITY_NODE";
    NodeType[NodeType["PROCESSING_INSTRUCTION_NODE"] = 7] = "PROCESSING_INSTRUCTION_NODE";
    NodeType[NodeType["COMMENT_NODE"] = 8] = "COMMENT_NODE";
    NodeType[NodeType["DOCUMENT_NODE"] = 9] = "DOCUMENT_NODE";
    NodeType[NodeType["DOCUMENT_TYPE_NODE"] = 10] = "DOCUMENT_TYPE_NODE";
    NodeType[NodeType["DOCUMENT_FRAGMENT_NODE"] = 11] = "DOCUMENT_FRAGMENT_NODE";
})(NodeType || (NodeType = {}));
//# sourceMappingURL=document.js.map