export interface ParserOptions {
    silent?: boolean;
    source?: string;
}
export interface ParserError {
    message?: string;
    reason?: string;
    filename?: string;
    line?: number;
    column?: number;
    source?: string;
}
export interface Loc {
    line?: number;
    column?: number;
}
export interface Node {
    type?: string;
    parent?: Node;
    position?: {
        start?: Loc;
        end?: Loc;
        source?: string;
        content?: string;
    };
}
export interface Rule extends Node {
    selectors?: string[];
    declarations?: Array<Declaration | Comment>;
}
export interface Declaration extends Node {
    property?: string;
    value?: string;
}
export interface Comment extends Node {
    comment?: string;
}
export interface Charset extends Node {
    charset?: string;
}
export interface CustomMedia extends Node {
    name?: string;
    media?: string;
}
export interface Document extends Node {
    document?: string;
    vendor?: string;
    rules?: Array<Rule | Comment | AtRule>;
}
export interface FontFace extends Node {
    declarations?: Array<Declaration | Comment>;
}
export interface Host extends Node {
    rules?: Array<Rule | Comment | AtRule>;
}
export interface Import extends Node {
    import?: string;
}
export interface KeyFrames extends Node {
    name?: string;
    vendor?: string;
    keyframes?: Array<KeyFrame | Comment>;
}
export interface KeyFrame extends Node {
    values?: string[];
    declarations?: Array<Declaration | Comment>;
}
export interface Media extends Node {
    media?: string;
    rules?: Array<Rule | Comment | AtRule>;
}
export interface Namespace extends Node {
    namespace?: string;
}
export interface Page extends Node {
    selectors?: string[];
    declarations?: Array<Declaration | Comment>;
}
export interface Supports extends Node {
    supports?: string;
    rules?: Array<Rule | Comment | AtRule>;
}
export declare type AtRule = Charset | CustomMedia | Document | FontFace | Host | Import | KeyFrames | Media | Namespace | Page | Supports;
export interface StyleRules {
    source?: string;
    rules: Array<Rule | Comment | AtRule>;
    parsingErrors?: ParserError[];
}
export interface Stylesheet extends Node {
    stylesheet?: StyleRules;
}
export declare function parse(css: string, options?: ParserOptions): Stylesheet;
