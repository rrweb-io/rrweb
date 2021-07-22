export declare enum NodeType {
    Document = 0,
    DocumentType = 1,
    Element = 2,
    Text = 3,
    CDATA = 4,
    Comment = 5
}
export declare type documentNode = {
    type: NodeType.Document;
    childNodes: serializedNodeWithId[];
};
export declare type documentTypeNode = {
    type: NodeType.DocumentType;
    name: string;
    publicId: string;
    systemId: string;
};
export declare type attributes = {
    [key: string]: string | number | boolean;
};
export declare type elementNode = {
    type: NodeType.Element;
    tagName: string;
    attributes: attributes;
    childNodes: serializedNodeWithId[];
    isSVG?: true;
    needBlock?: boolean;
};
export declare type textNode = {
    type: NodeType.Text;
    textContent: string;
    isStyle?: true;
};
export declare type cdataNode = {
    type: NodeType.CDATA;
    textContent: '';
};
export declare type commentNode = {
    type: NodeType.Comment;
    textContent: string;
};
export declare type serializedNode = (documentNode | documentTypeNode | elementNode | textNode | cdataNode | commentNode) & {
    rootId?: number;
    isShadowHost?: boolean;
    isShadow?: boolean;
};
export declare type serializedNodeWithId = serializedNode & {
    id: number;
};
export declare type tagMap = {
    [key: string]: string;
};
export interface INode extends Node {
    __sn: serializedNodeWithId;
}
export declare type idNodeMap = {
    [key: number]: INode;
};
export declare type MaskInputOptions = Partial<{
    color: boolean;
    date: boolean;
    'datetime-local': boolean;
    email: boolean;
    month: boolean;
    number: boolean;
    range: boolean;
    search: boolean;
    tel: boolean;
    text: boolean;
    time: boolean;
    url: boolean;
    week: boolean;
    textarea: boolean;
    select: boolean;
    password: boolean;
}>;
export declare type SlimDOMOptions = Partial<{
    script: boolean;
    comment: boolean;
    headFavicon: boolean;
    headWhitespace: boolean;
    headMetaDescKeywords: boolean;
    headMetaSocial: boolean;
    headMetaRobots: boolean;
    headMetaHttpEquiv: boolean;
    headMetaAuthorship: boolean;
    headMetaVerification: boolean;
}>;
export declare type MaskTextFn = (text: string) => string;
export declare type MaskInputFn = (text: string) => string;
export declare type KeepIframeSrcFn = (src: string) => boolean;
