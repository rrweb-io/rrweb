var NodeType$1;
(function (NodeType) {
    NodeType[NodeType["Document"] = 0] = "Document";
    NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
    NodeType[NodeType["Element"] = 2] = "Element";
    NodeType[NodeType["Text"] = 3] = "Text";
    NodeType[NodeType["CDATA"] = 4] = "CDATA";
    NodeType[NodeType["Comment"] = 5] = "Comment";
})(NodeType$1 || (NodeType$1 = {}));
var Mirror$1 = (function () {
    function Mirror() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
    Mirror.prototype.getId = function (n) {
        var _a;
        if (!n)
            return -1;
        var id = (_a = this.getMeta(n)) === null || _a === void 0 ? void 0 : _a.id;
        return id !== null && id !== void 0 ? id : -1;
    };
    Mirror.prototype.getNode = function (id) {
        return this.idNodeMap.get(id) || null;
    };
    Mirror.prototype.getIds = function () {
        return Array.from(this.idNodeMap.keys());
    };
    Mirror.prototype.getMeta = function (n) {
        return this.nodeMetaMap.get(n) || null;
    };
    Mirror.prototype.removeNodeFromMap = function (n) {
        var _this = this;
        var id = this.getId(n);
        this.idNodeMap["delete"](id);
        if (n.childNodes) {
            n.childNodes.forEach(function (childNode) {
                return _this.removeNodeFromMap(childNode);
            });
        }
    };
    Mirror.prototype.has = function (id) {
        return this.idNodeMap.has(id);
    };
    Mirror.prototype.hasNode = function (node) {
        return this.nodeMetaMap.has(node);
    };
    Mirror.prototype.add = function (n, meta) {
        var id = meta.id;
        this.idNodeMap.set(id, n);
        this.nodeMetaMap.set(n, meta);
    };
    Mirror.prototype.replace = function (id, n) {
        var oldNode = this.getNode(id);
        if (oldNode) {
            var meta = this.nodeMetaMap.get(oldNode);
            if (meta)
                this.nodeMetaMap.set(n, meta);
        }
        this.idNodeMap.set(id, n);
    };
    Mirror.prototype.reset = function () {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    };
    return Mirror;
}());
function createMirror$1() {
    return new Mirror$1();
}

function parseCSSText(cssText) {
    const res = {};
    const listDelimiter = /;(?![^(]*\))/g;
    const propertyDelimiter = /:(.+)/;
    const comment = /\/\*.*?\*\//g;
    cssText
        .replace(comment, '')
        .split(listDelimiter)
        .forEach(function (item) {
        if (item) {
            const tmp = item.split(propertyDelimiter);
            tmp.length > 1 && (res[camelize(tmp[0].trim())] = tmp[1].trim());
        }
    });
    return res;
}
function toCSSText(style) {
    const properties = [];
    for (const name in style) {
        const value = style[name];
        if (typeof value !== 'string')
            continue;
        const normalizedName = hyphenate(name);
        properties.push(`${normalizedName}: ${value};`);
    }
    return properties.join(' ');
}
const camelizeRE = /-([a-z])/g;
const CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9-]+$/;
const camelize = (str) => {
    if (CUSTOM_PROPERTY_REGEX.test(str))
        return str;
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
};
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = (str) => {
    return str.replace(hyphenateRE, '-$1').toLowerCase();
};

class BaseRRNode {
    constructor(..._args) {
        this.parentElement = null;
        this.parentNode = null;
        this.firstChild = null;
        this.lastChild = null;
        this.previousSibling = null;
        this.nextSibling = null;
        this.ELEMENT_NODE = NodeType.ELEMENT_NODE;
        this.TEXT_NODE = NodeType.TEXT_NODE;
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
function BaseRRDocumentImpl(RRNodeClass) {
    return class BaseRRDocument extends RRNodeClass {
        constructor(...args) {
            super(args);
            this.nodeType = NodeType.DOCUMENT_NODE;
            this.nodeName = '#document';
            this.compatMode = 'CSS1Compat';
            this.RRNodeType = NodeType$1.Document;
            this.textContent = null;
            this.ownerDocument = this;
        }
        get documentElement() {
            return (this.childNodes.find((node) => node.RRNodeType === NodeType$1.Element &&
                node.tagName === 'HTML') || null);
        }
        get body() {
            var _a;
            return (((_a = this.documentElement) === null || _a === void 0 ? void 0 : _a.childNodes.find((node) => node.RRNodeType === NodeType$1.Element &&
                node.tagName === 'BODY')) || null);
        }
        get head() {
            var _a;
            return (((_a = this.documentElement) === null || _a === void 0 ? void 0 : _a.childNodes.find((node) => node.RRNodeType === NodeType$1.Element &&
                node.tagName === 'HEAD')) || null);
        }
        get implementation() {
            return this;
        }
        get firstElementChild() {
            return this.documentElement;
        }
        appendChild(newChild) {
            const nodeType = newChild.RRNodeType;
            if (nodeType === NodeType$1.Element ||
                nodeType === NodeType$1.DocumentType) {
                if (this.childNodes.some((s) => s.RRNodeType === nodeType)) {
                    throw new Error(`RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${nodeType === NodeType$1.Element ? 'RRElement' : 'RRDoctype'} on RRDocument allowed.`);
                }
            }
            const child = appendChild(this, newChild);
            child.parentElement = null;
            return child;
        }
        insertBefore(newChild, refChild) {
            const nodeType = newChild.RRNodeType;
            if (nodeType === NodeType$1.Element ||
                nodeType === NodeType$1.DocumentType) {
                if (this.childNodes.some((s) => s.RRNodeType === nodeType)) {
                    throw new Error(`RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one ${nodeType === NodeType$1.Element ? 'RRElement' : 'RRDoctype'} on RRDocument allowed.`);
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
            const doctype = new (BaseRRDocumentTypeImpl(BaseRRNode))(qualifiedName, publicId, systemId);
            doctype.ownerDocument = this;
            return doctype;
        }
        createElement(tagName) {
            const element = new (BaseRRElementImpl(BaseRRNode))(tagName);
            element.ownerDocument = this;
            return element;
        }
        createElementNS(_namespaceURI, qualifiedName) {
            return this.createElement(qualifiedName);
        }
        createTextNode(data) {
            const text = new (BaseRRTextImpl(BaseRRNode))(data);
            text.ownerDocument = this;
            return text;
        }
        createComment(data) {
            const comment = new (BaseRRCommentImpl(BaseRRNode))(data);
            comment.ownerDocument = this;
            return comment;
        }
        createCDATASection(data) {
            const CDATASection = new (BaseRRCDATASectionImpl(BaseRRNode))(data);
            CDATASection.ownerDocument = this;
            return CDATASection;
        }
        toString() {
            return 'RRDocument';
        }
    };
}
function BaseRRDocumentTypeImpl(RRNodeClass) {
    return class BaseRRDocumentType extends RRNodeClass {
        constructor(qualifiedName, publicId, systemId) {
            super();
            this.nodeType = NodeType.DOCUMENT_TYPE_NODE;
            this.RRNodeType = NodeType$1.DocumentType;
            this.name = qualifiedName;
            this.publicId = publicId;
            this.systemId = systemId;
            this.nodeName = qualifiedName;
            this.textContent = null;
        }
        toString() {
            return 'RRDocumentType';
        }
    };
}
function BaseRRElementImpl(RRNodeClass) {
    return class BaseRRElement extends RRNodeClass {
        constructor(tagName) {
            super();
            this.nodeType = NodeType.ELEMENT_NODE;
            this.RRNodeType = NodeType$1.Element;
            this.attributes = {};
            this.shadowRoot = null;
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
            return this.attributes[name] || null;
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
    };
}
function BaseRRMediaElementImpl(RRElementClass) {
    return class BaseRRMediaElement extends RRElementClass {
        attachShadow(_init) {
            throw new Error(`RRDomException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow`);
        }
        play() {
            this.paused = false;
        }
        pause() {
            this.paused = true;
        }
    };
}
function BaseRRTextImpl(RRNodeClass) {
    return class BaseRRText extends RRNodeClass {
        constructor(data) {
            super();
            this.nodeType = NodeType.TEXT_NODE;
            this.nodeName = '#text';
            this.RRNodeType = NodeType$1.Text;
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
    };
}
function BaseRRCommentImpl(RRNodeClass) {
    return class BaseRRComment extends RRNodeClass {
        constructor(data) {
            super();
            this.nodeType = NodeType.COMMENT_NODE;
            this.nodeName = '#comment';
            this.RRNodeType = NodeType$1.Comment;
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
    };
}
function BaseRRCDATASectionImpl(RRNodeClass) {
    return class BaseRRCDATASection extends RRNodeClass {
        constructor(data) {
            super();
            this.nodeName = '#cdata-section';
            this.nodeType = NodeType.CDATA_SECTION_NODE;
            this.RRNodeType = NodeType$1.CDATA;
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
    };
}
class ClassList {
    constructor(classText, onChange) {
        this.classes = [];
        this.add = (...classNames) => {
            for (const item of classNames) {
                const className = String(item);
                if (this.classes.indexOf(className) >= 0)
                    continue;
                this.classes.push(className);
            }
            this.onChange && this.onChange(this.classes.join(' '));
        };
        this.remove = (...classNames) => {
            this.classes = this.classes.filter((item) => classNames.indexOf(item) === -1);
            this.onChange && this.onChange(this.classes.join(' '));
        };
        if (classText) {
            const classes = classText.trim().split(/\s+/);
            this.classes.push(...classes);
        }
        this.onChange = onChange;
    }
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
var NodeType;
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
function diff(oldTree, newTree, replayer, rrnodeMirror = newTree.mirror ||
    newTree.ownerDocument.mirror) {
    oldTree = diffBeforeUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror);
    const oldChildren = oldTree.childNodes;
    const newChildren = newTree.childNodes;
    if (oldChildren.length > 0 || newChildren.length > 0) {
        diffChildren(Array.from(oldChildren), newChildren, oldTree, replayer, rrnodeMirror);
    }
    diffAfterUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror);
}
function diffBeforeUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror) {
    var _a;
    if (replayer.afterAppend && !createdNodeSet) {
        createdNodeSet = new WeakSet();
        setTimeout(() => {
            createdNodeSet = null;
        }, 0);
    }
    if (!sameNodeType(oldTree, newTree)) {
        const calibratedOldTree = createOrGetNode(newTree, replayer.mirror, rrnodeMirror);
        (_a = oldTree.parentNode) === null || _a === void 0 ? void 0 : _a.replaceChild(calibratedOldTree, oldTree);
        oldTree = calibratedOldTree;
    }
    switch (newTree.RRNodeType) {
        case NodeType$1.Document: {
            if (!nodeMatching(oldTree, newTree, replayer.mirror, rrnodeMirror)) {
                const newMeta = rrnodeMirror.getMeta(newTree);
                if (newMeta) {
                    replayer.mirror.removeNodeFromMap(oldTree);
                    oldTree.close();
                    oldTree.open();
                    replayer.mirror.add(oldTree, newMeta);
                    createdNodeSet === null || createdNodeSet === void 0 ? void 0 : createdNodeSet.add(oldTree);
                }
            }
            break;
        }
        case NodeType$1.Element: {
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
                const oldChildren = oldElement.shadowRoot.childNodes;
                const newChildren = newRRElement.shadowRoot.childNodes;
                if (oldChildren.length > 0 || newChildren.length > 0)
                    diffChildren(Array.from(oldChildren), newChildren, oldElement.shadowRoot, replayer, rrnodeMirror);
            }
            break;
        }
    }
    return oldTree;
}
function diffAfterUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror) {
    var _a;
    switch (newTree.RRNodeType) {
        case NodeType$1.Document: {
            const scrollData = newTree.scrollData;
            scrollData && replayer.applyScroll(scrollData, true);
            break;
        }
        case NodeType$1.Element: {
            const oldElement = oldTree;
            const newRRElement = newTree;
            diffProps(oldElement, newRRElement, rrnodeMirror);
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
            }
            break;
        }
        case NodeType$1.Text:
        case NodeType$1.Comment:
        case NodeType$1.CDATA: {
            if (oldTree.textContent !==
                newTree.data)
                oldTree.textContent = newTree.data;
            break;
        }
    }
    if (createdNodeSet === null || createdNodeSet === void 0 ? void 0 : createdNodeSet.has(oldTree)) {
        createdNodeSet.delete(oldTree);
        (_a = replayer.afterAppend) === null || _a === void 0 ? void 0 : _a.call(replayer, oldTree, replayer.mirror.getId(oldTree));
    }
}
function diffProps(oldTree, newTree, rrnodeMirror) {
    const oldAttributes = oldTree.attributes;
    const newAttributes = newTree.attributes;
    for (const name in newAttributes) {
        const newValue = newAttributes[name];
        const sn = rrnodeMirror.getMeta(newTree);
        if ((sn === null || sn === void 0 ? void 0 : sn.isSVG) && NAMESPACES[name])
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
        else
            oldTree.setAttribute(name, newValue);
    }
    for (const { name } of Array.from(oldAttributes))
        if (!(name in newAttributes))
            oldTree.removeAttribute(name);
    newTree.scrollLeft && (oldTree.scrollLeft = newTree.scrollLeft);
    newTree.scrollTop && (oldTree.scrollTop = newTree.scrollTop);
}
function diffChildren(oldChildren, newChildren, parentNode, replayer, rrnodeMirror) {
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
            diff(oldStartNode, newStartNode, replayer, rrnodeMirror);
            oldStartNode = oldChildren[++oldStartIndex];
            newStartNode = newChildren[++newStartIndex];
        }
        else if (nodeMatching(oldEndNode, newEndNode, replayer.mirror, rrnodeMirror)) {
            diff(oldEndNode, newEndNode, replayer, rrnodeMirror);
            oldEndNode = oldChildren[--oldEndIndex];
            newEndNode = newChildren[--newEndIndex];
        }
        else if (nodeMatching(oldStartNode, newEndNode, replayer.mirror, rrnodeMirror)) {
            try {
                parentNode.insertBefore(oldStartNode, oldEndNode.nextSibling);
            }
            catch (e) {
                console.warn(e);
            }
            diff(oldStartNode, newEndNode, replayer, rrnodeMirror);
            oldStartNode = oldChildren[++oldStartIndex];
            newEndNode = newChildren[--newEndIndex];
        }
        else if (nodeMatching(oldEndNode, newStartNode, replayer.mirror, rrnodeMirror)) {
            try {
                parentNode.insertBefore(oldEndNode, oldStartNode);
            }
            catch (e) {
                console.warn(e);
            }
            diff(oldEndNode, newStartNode, replayer, rrnodeMirror);
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
                    parentNode.insertBefore(nodeToMove, oldStartNode);
                }
                catch (e) {
                    console.warn(e);
                }
                diff(nodeToMove, newStartNode, replayer, rrnodeMirror);
                oldChildren[indexInOld] = undefined;
            }
            else {
                const newNode = createOrGetNode(newStartNode, replayer.mirror, rrnodeMirror);
                if (parentNode.nodeName === '#document' &&
                    oldStartNode &&
                    ((newNode.nodeType === newNode.DOCUMENT_TYPE_NODE &&
                        oldStartNode.nodeType === oldStartNode.DOCUMENT_TYPE_NODE) ||
                        (newNode.nodeType === newNode.ELEMENT_NODE &&
                            oldStartNode.nodeType === oldStartNode.ELEMENT_NODE))) {
                    parentNode.removeChild(oldStartNode);
                    replayer.mirror.removeNodeFromMap(oldStartNode);
                    oldStartNode = oldChildren[++oldStartIndex];
                }
                try {
                    parentNode.insertBefore(newNode, oldStartNode || null);
                    diff(newNode, newStartNode, replayer, rrnodeMirror);
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
                parentNode.insertBefore(newNode, referenceNode);
                diff(newNode, newChildren[newStartIndex], replayer, rrnodeMirror);
            }
            catch (e) {
                console.warn(e);
            }
        }
    }
    else if (newStartIndex > newEndIndex) {
        for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
            const node = oldChildren[oldStartIndex];
            if (!node || node.parentNode !== parentNode)
                continue;
            try {
                parentNode.removeChild(node);
                replayer.mirror.removeNodeFromMap(node);
            }
            catch (e) {
                console.warn(e);
            }
        }
    }
}
function createOrGetNode(rrNode, domMirror, rrnodeMirror) {
    const nodeId = rrnodeMirror.getId(rrNode);
    const sn = rrnodeMirror.getMeta(rrNode);
    let node = null;
    if (nodeId > -1)
        node = domMirror.getNode(nodeId);
    if (node !== null && sameNodeType(node, rrNode))
        return node;
    switch (rrNode.RRNodeType) {
        case NodeType$1.Document:
            node = new Document();
            break;
        case NodeType$1.DocumentType:
            node = document.implementation.createDocumentType(rrNode.name, rrNode.publicId, rrNode.systemId);
            break;
        case NodeType$1.Element: {
            let tagName = rrNode.tagName.toLowerCase();
            tagName = SVGTagMap[tagName] || tagName;
            if (sn && 'isSVG' in sn && (sn === null || sn === void 0 ? void 0 : sn.isSVG)) {
                node = document.createElementNS(NAMESPACES['svg'], tagName);
            }
            else
                node = document.createElement(rrNode.tagName);
            break;
        }
        case NodeType$1.Text:
            node = document.createTextNode(rrNode.data);
            break;
        case NodeType$1.Comment:
            node = document.createComment(rrNode.data);
            break;
        case NodeType$1.CDATA:
            node = document.createCDATASection(rrNode.data);
            break;
    }
    if (sn)
        domMirror.add(node, Object.assign({}, sn));
    try {
        createdNodeSet === null || createdNodeSet === void 0 ? void 0 : createdNodeSet.add(node);
    }
    catch (e) {
    }
    return node;
}
function sameNodeType(node1, node2) {
    if (node1.nodeType !== node2.nodeType)
        return false;
    return (node1.nodeType !== node1.ELEMENT_NODE ||
        node1.tagName.toUpperCase() ===
            node2.tagName);
}
function nodeMatching(node1, node2, domMirror, rrdomMirror) {
    const node1Id = domMirror.getId(node1);
    const node2Id = rrdomMirror.getId(node2);
    if (node1Id === -1 || node1Id !== node2Id)
        return false;
    return sameNodeType(node1, node2);
}

class RRDocument extends BaseRRDocumentImpl(BaseRRNode) {
    constructor(mirror) {
        super();
        this.UNSERIALIZED_STARTING_ID = -2;
        this._unserializedId = this.UNSERIALIZED_STARTING_ID;
        this.mirror = createMirror();
        this.scrollData = null;
        if (mirror) {
            this.mirror = mirror;
        }
    }
    get unserializedId() {
        return this._unserializedId--;
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
const RRDocumentType = BaseRRDocumentTypeImpl(BaseRRNode);
class RRElement extends BaseRRElementImpl(BaseRRNode) {
    constructor() {
        super(...arguments);
        this.inputData = null;
        this.scrollData = null;
    }
}
class RRMediaElement extends BaseRRMediaElementImpl(RRElement) {
}
class RRCanvasElement extends RRElement {
    constructor() {
        super(...arguments);
        this.rr_dataURL = null;
        this.canvasMutations = [];
    }
    getContext() {
        return null;
    }
}
class RRStyleElement extends RRElement {
    constructor() {
        super(...arguments);
        this.rules = [];
    }
}
class RRIFrameElement extends RRElement {
    constructor(upperTagName, mirror) {
        super(upperTagName);
        this.contentDocument = new RRDocument();
        this.contentDocument.mirror = mirror;
    }
}
const RRText = BaseRRTextImpl(BaseRRNode);
const RRComment = BaseRRCommentImpl(BaseRRNode);
const RRCDATASection = BaseRRCDATASectionImpl(BaseRRNode);
function getValidTagName(element) {
    if (element instanceof HTMLFormElement) {
        return 'FORM';
    }
    return element.tagName.toUpperCase();
}
function buildFromNode(node, rrdom, domMirror, parentRRNode) {
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
        rrdom.mirror.add(rrNode, Object.assign({}, sn));
    }
    return rrNode;
}
function buildFromDom(dom, domMirror = createMirror$1(), rrdom = new RRDocument()) {
    function walk(node, parentRRNode) {
        const rrNode = buildFromNode(node, rrdom, domMirror, parentRRNode);
        if (rrNode === null)
            return;
        if ((parentRRNode === null || parentRRNode === void 0 ? void 0 : parentRRNode.nodeName) !== 'IFRAME' &&
            node.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE) {
            parentRRNode === null || parentRRNode === void 0 ? void 0 : parentRRNode.appendChild(rrNode);
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
function createMirror() {
    return new Mirror();
}
class Mirror {
    constructor() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
    getId(n) {
        var _a;
        if (!n)
            return -1;
        const id = (_a = this.getMeta(n)) === null || _a === void 0 ? void 0 : _a.id;
        return id !== null && id !== void 0 ? id : -1;
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
function getDefaultSN(node, id) {
    switch (node.RRNodeType) {
        case NodeType$1.Document:
            return {
                id,
                type: node.RRNodeType,
                childNodes: [],
            };
        case NodeType$1.DocumentType: {
            const doctype = node;
            return {
                id,
                type: node.RRNodeType,
                name: doctype.name,
                publicId: doctype.publicId,
                systemId: doctype.systemId,
            };
        }
        case NodeType$1.Element:
            return {
                id,
                type: node.RRNodeType,
                tagName: node.tagName.toLowerCase(),
                attributes: {},
                childNodes: [],
            };
        case NodeType$1.Text:
            return {
                id,
                type: node.RRNodeType,
                textContent: node.textContent || '',
            };
        case NodeType$1.Comment:
            return {
                id,
                type: node.RRNodeType,
                textContent: node.textContent || '',
            };
        case NodeType$1.CDATA:
            return {
                id,
                type: node.RRNodeType,
                textContent: '',
            };
    }
}
function printRRDom(rootNode, mirror) {
    return walk(rootNode, mirror, '');
}
function walk(node, mirror, blankSpace) {
    let printText = `${blankSpace}${mirror.getId(node)} ${node.toString()}\n`;
    if (node.RRNodeType === NodeType$1.Element) {
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

export { BaseRRCDATASectionImpl, BaseRRCommentImpl, BaseRRDocumentImpl, BaseRRDocumentTypeImpl, BaseRRElementImpl, BaseRRMediaElementImpl, BaseRRNode, BaseRRTextImpl, ClassList, Mirror, NodeType, RRCDATASection, RRCanvasElement, RRComment, RRDocument, RRDocumentType, RRElement, RRIFrameElement, RRMediaElement, BaseRRNode as RRNode, RRStyleElement, RRText, buildFromDom, buildFromNode, createMirror, createOrGetNode, diff, getDefaultSN, printRRDom };
