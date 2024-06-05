/**
 * This file is a fork of https://github.com/reworkcss/css/blob/master/lib/parse/index.js
 * I fork it because:
 * 1. The css library was built for node.js which does not have tree-shaking supports.
 * 2. Rewrites into typescript give us a better type interface.
 */
/* eslint-disable tsdoc/syntax */

export interface ParserOptions {
  /** Silently fail on parse errors */
  silent?: boolean;
  /**
   * The path to the file containing css.
   * Makes errors and source maps more helpful, by letting them know where code comes from.
   */
  source?: string;
}

/**
 * Error thrown during parsing.
 */
export interface ParserError {
  /** The full error message with the source position. */
  message?: string;
  /** The error message without position. */
  reason?: string;
  /** The value of options.source if passed to css.parse. Otherwise undefined. */
  filename?: string;
  line?: number;
  column?: number;
  /** The portion of code that couldn't be parsed. */
  source?: string;
}

export interface Loc {
  line?: number;
  column?: number;
}

/**
 * Base AST Tree Node.
 */
export interface Node {
  /** The possible values are the ones listed in the Types section on https://github.com/reworkcss/css page. */
  type?: string;
  /** A reference to the parent node, or null if the node has no parent. */
  parent?: Node;
  /** Information about the position in the source string that corresponds to the node. */
  position?: {
    start?: Loc;
    end?: Loc;
    /** The value of options.source if passed to css.parse. Otherwise undefined. */
    source?: string;
    /** The full source string passed to css.parse. */
    content?: string;
  };
}

export interface NodeWithRules extends Node {
  /** Array of nodes with the types rule, comment and any of the at-rule types. */
  rules: Array<Rule | Comment | AtRule>;
}

export interface Rule extends Node {
  /** The list of selectors of the rule, split on commas. Each selector is trimmed from whitespace and comments. */
  selectors?: string[];
  /** Array of nodes with the types declaration and comment. */
  declarations?: Array<Declaration | Comment>;
}

export interface Declaration extends Node {
  /** The property name, trimmed from whitespace and comments. May not be empty. */
  property?: string;
  /** The value of the property, trimmed from whitespace and comments. Empty values are allowed. */
  value?: string;
}

/**
 * A rule-level or declaration-level comment. Comments inside selectors, properties and values etc. are lost.
 */
export interface Comment extends Node {
  comment?: string;
}

/**
 * The @charset at-rule.
 */
export interface Charset extends Node {
  /** The part following @charset. */
  charset?: string;
}

/**
 * The @custom-media at-rule
 */
export interface CustomMedia extends Node {
  /** The ---prefixed name. */
  name?: string;
  /** The part following the name. */
  media?: string;
}

/**
 * The @document at-rule.
 */
export interface Document extends NodeWithRules {
  /** The part following @document. */
  document?: string;
  /** The vendor prefix in @document, or undefined if there is none. */
  vendor?: string;
}

/**
 * The @font-face at-rule.
 */
export interface FontFace extends Node {
  /** Array of nodes with the types declaration and comment. */
  declarations?: Array<Declaration | Comment>;
}

/**
 * The @host at-rule.
 */
export type Host = NodeWithRules;

/**
 * The @import at-rule.
 */
export interface Import extends Node {
  /** The part following @import. */
  import?: string;
}

/**
 * The @keyframes at-rule.
 */
export interface KeyFrames extends Node {
  /** The name of the keyframes rule. */
  name?: string;
  /** The vendor prefix in @keyframes, or undefined if there is none. */
  vendor?: string;
  /** Array of nodes with the types keyframe and comment. */
  keyframes?: Array<KeyFrame | Comment>;
}

export interface KeyFrame extends Node {
  /** The list of "selectors" of the keyframe rule, split on commas. Each “selector” is trimmed from whitespace. */
  values?: string[];
  /** Array of nodes with the types declaration and comment. */
  declarations?: Array<Declaration | Comment>;
}

/**
 * The @media at-rule.
 */
export interface Media extends NodeWithRules {
  /** The part following @media. */
  media?: string;
}

/**
 * The @namespace at-rule.
 */
export interface Namespace extends Node {
  /** The part following @namespace. */
  namespace?: string;
}

/**
 * The @page at-rule.
 */
export interface Page extends Node {
  /** The list of selectors of the rule, split on commas. Each selector is trimmed from whitespace and comments. */
  selectors?: string[];
  /** Array of nodes with the types declaration and comment. */
  declarations?: Array<Declaration | Comment>;
}

/**
 * The @supports at-rule.
 */
export interface Supports extends NodeWithRules {
  /** The part following @supports. */
  supports?: string;
}

/** All at-rules. */
export type AtRule =
  | Charset
  | CustomMedia
  | Document
  | FontFace
  | Host
  | Import
  | KeyFrames
  | Media
  | Namespace
  | Page
  | Supports;

/**
 * A collection of rules
 */
export interface StyleRules extends NodeWithRules {
  source?: string;
  /** Array of Errors. Errors collected during parsing when option silent is true. */
  parsingErrors?: ParserError[];
}

/**
 * The root node returned by css.parse.
 */
export interface Stylesheet extends Node {
  stylesheet?: StyleRules;
}

// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
const commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;

export function parse(css: string, options: ParserOptions = {}): Stylesheet {
  /**
   * Positional.
   */

  let lineno = 1;
  let column = 1;

  /**
   * Update lineno and column based on `str`.
   */

  function updatePosition(str: string) {
    const lines = str.match(/\n/g);
    if (lines) {
      lineno += lines.length;
    }
    const i = str.lastIndexOf('\n');
    column = i === -1 ? column + str.length : str.length - i;
  }

  /**
   * Mark position and patch `node.position`.
   */

  function position() {
    const start = { line: lineno, column };
    return (
      node: Rule | Declaration | Comment | AtRule | Stylesheet | KeyFrame,
    ) => {
      node.position = new Position(start);
      whitespace();
      return node;
    };
  }

  /**
   * Store position information for a node
   */

  class Position {
    public static content: string;
    public content!: string;
    public start!: Loc;
    public end!: Loc;
    public source?: string;

    constructor(start: Loc) {
      this.start = start;
      this.end = { line: lineno, column };
      this.source = options.source;
      this.content = Position.content;
    }
  }

  /**
   * Non-enumerable source string
   */

  Position.content = css;

  const errorsList: ParserError[] = [];

  function error(msg: string) {
    const err = new Error(
      `${options.source || ''}:${lineno}:${column}: ${msg}`,
    ) as ParserError;
    err.reason = msg;
    err.filename = options.source;
    err.line = lineno;
    err.column = column;
    err.source = css;

    if (options.silent) {
      errorsList.push(err);
    } else {
      throw err;
    }
  }

  /**
   * Parse stylesheet.
   */

  function stylesheet(): Stylesheet {
    const rulesList = rules();

    return {
      type: 'stylesheet',
      stylesheet: {
        source: options.source,
        rules: rulesList,
        parsingErrors: errorsList,
      },
    };
  }

  /**
   * Opening brace.
   */

  function open() {
    return match(/^{\s*/);
  }

  /**
   * Closing brace.
   */

  function close() {
    return match(/^}/);
  }

  /**
   * Parse ruleset.
   */

  function rules() {
    let node: Rule | void;
    const rules: Rule[] = [];
    whitespace();
    comments(rules);
    while (css.length && css.charAt(0) !== '}' && (node = atrule() || rule())) {
      if (node) {
        rules.push(node);
        comments(rules);
      }
    }
    return rules;
  }

  /**
   * Match `re` and return captures.
   */

  function match(re: RegExp) {
    const m = re.exec(css);
    if (!m) {
      return;
    }
    const str = m[0];
    updatePosition(str);
    css = css.slice(str.length);
    return m;
  }

  /**
   * Parse whitespace.
   */

  function whitespace() {
    match(/^\s*/);
  }

  /**
   * Parse comments;
   */

  function comments(rules: Rule[] = []) {
    let c: Comment | void;
    while ((c = comment())) {
      if (c) {
        rules.push(c);
      }
      c = comment();
    }
    return rules;
  }

  /**
   * Parse comment.
   */

  function comment() {
    const pos = position();
    if ('/' !== css.charAt(0) || '*' !== css.charAt(1)) {
      return;
    }

    let i = 2;
    while (
      '' !== css.charAt(i) &&
      ('*' !== css.charAt(i) || '/' !== css.charAt(i + 1))
    ) {
      ++i;
    }
    i += 2;

    if ('' === css.charAt(i - 1)) {
      return error('End of comment missing');
    }

    const str = css.slice(2, i - 2);
    column += 2;
    updatePosition(str);
    css = css.slice(i);
    column += 2;

    return pos({
      type: 'comment',
      comment: str,
    });
  }

  /**
   * Parse selector.
   */

  // originally from https://github.com/NxtChg/pieces/blob/3eb39c8287a97632e9347a24f333d52d916bc816/js/css_parser/css_parse.js#L46C1-L47C1
  const selectorMatcher = new RegExp(
    '^((' +
      [
        /[^\\]"(?:\\"|[^"])*"/.source, // consume any quoted parts (checking that the double quote isn't itself escaped)
        /[^\\]'(?:\\'|[^'])*'/.source, // same but for single quotes
        '[^{]',
      ].join('|') +
      ')+)',
  );

  function selector() {
    whitespace();
    while (css[0] == '}') {
      error('extra closing bracket');
      css = css.slice(1);
      whitespace();
    }

    const m = match(selectorMatcher);
    if (!m) {
      return;
    }

    /* @fix Remove all comments from selectors
     * http://ostermiller.org/findcomment.html */
    const cleanedInput = m[0]
      .trim()
      .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, '')

      // Handle strings by replacing commas inside them
      .replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, (m) => {
        return m.replace(/,/g, '\u200C');
      });

    // Split using a custom function and restore commas in strings
    return customSplit(cleanedInput).map((s) =>
      s.replace(/\u200C/g, ',').trim(),
    );
  }

  /**
   * Split selector correctly, ensuring not to split on comma if inside ().
   */

  function customSplit(input: string) {
    const result = [];
    let currentSegment = '';
    let depthParentheses = 0; // Track depth of parentheses
    let depthBrackets = 0; // Track depth of square brackets
    let currentStringChar = null;

    for (const char of input) {
      const hasStringEscape = currentSegment.endsWith('\\');

      if (currentStringChar) {
        if (currentStringChar === char && !hasStringEscape) {
          currentStringChar = null;
        }
      } else if (char === '(') {
        depthParentheses++;
      } else if (char === ')') {
        depthParentheses--;
      } else if (char === '[') {
        depthBrackets++;
      } else if (char === ']') {
        depthBrackets--;
      } else if ('\'"'.includes(char)) {
        currentStringChar = char;
      }

      // Split point is a comma that is not inside parentheses or square brackets
      if (char === ',' && depthParentheses === 0 && depthBrackets === 0) {
        result.push(currentSegment);
        currentSegment = '';
      } else {
        currentSegment += char;
      }
    }

    // Add the last segment
    if (currentSegment) {
      result.push(currentSegment);
    }

    return result;
  }

  /**
   * Parse declaration.
   */

  function declaration(): Declaration | void | never {
    const pos = position();

    // prop
    // eslint-disable-next-line no-useless-escape
    const propMatch = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
    if (!propMatch) {
      return;
    }
    const prop = trim(propMatch[0]);

    // :
    if (!match(/^:\s*/)) {
      return error(`property missing ':'`);
    }

    // val
    // eslint-disable-next-line no-useless-escape
    const val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);

    const ret = pos({
      type: 'declaration',
      property: prop.replace(commentre, ''),
      value: val ? trim(val[0]).replace(commentre, '') : '',
    });

    // ;
    match(/^[;\s]*/);

    return ret;
  }

  /**
   * Parse declarations.
   */

  function declarations() {
    const decls: Array<object> = [];

    if (!open()) {
      return error(`missing '{'`);
    }
    comments(decls);

    // declarations
    let decl;
    while ((decl = declaration())) {
      if ((decl as unknown) !== false) {
        decls.push(decl);
        comments(decls);
      }
      decl = declaration();
    }

    if (!close()) {
      return error(`missing '}'`);
    }
    return decls;
  }

  /**
   * Parse keyframe.
   */

  function keyframe() {
    let m;
    const vals = [];
    const pos = position();

    while ((m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/))) {
      vals.push(m[1]);
      match(/^,\s*/);
    }

    if (!vals.length) {
      return;
    }

    return pos({
      type: 'keyframe',
      values: vals,
      declarations: declarations() as Declaration[],
    });
  }

  /**
   * Parse keyframes.
   */

  function atkeyframes() {
    const pos = position();
    let m = match(/^@([-\w]+)?keyframes\s*/);

    if (!m) {
      return;
    }
    const vendor = m[1];

    // identifier
    m = match(/^([-\w]+)\s*/);
    if (!m) {
      return error('@keyframes missing name');
    }
    const name = m[1];

    if (!open()) {
      return error(`@keyframes missing '{'`);
    }

    let frame;
    let frames = comments();
    while ((frame = keyframe())) {
      frames.push(frame);
      frames = frames.concat(comments());
    }

    if (!close()) {
      return error(`@keyframes missing '}'`);
    }

    return pos({
      type: 'keyframes',
      name,
      vendor,
      keyframes: frames,
    });
  }

  /**
   * Parse supports.
   */

  function atsupports() {
    const pos = position();
    const m = match(/^@supports *([^{]+)/);

    if (!m) {
      return;
    }
    const supports = trim(m[1]);

    if (!open()) {
      return error(`@supports missing '{'`);
    }

    const style = comments().concat(rules());

    if (!close()) {
      return error(`@supports missing '}'`);
    }

    return pos({
      type: 'supports',
      supports,
      rules: style,
    });
  }

  /**
   * Parse host.
   */

  function athost() {
    const pos = position();
    const m = match(/^@host\s*/);

    if (!m) {
      return;
    }

    if (!open()) {
      return error(`@host missing '{'`);
    }

    const style = comments().concat(rules());

    if (!close()) {
      return error(`@host missing '}'`);
    }

    return pos({
      type: 'host',
      rules: style,
    });
  }

  /**
   * Parse media.
   */

  function atmedia() {
    const pos = position();
    const m = match(/^@media *([^{]+)/);

    if (!m) {
      return;
    }
    const media = trim(m[1]);

    if (!open()) {
      return error(`@media missing '{'`);
    }

    const style = comments().concat(rules());

    if (!close()) {
      return error(`@media missing '}'`);
    }

    return pos({
      type: 'media',
      media,
      rules: style,
    });
  }

  /**
   * Parse custom-media.
   */

  function atcustommedia() {
    const pos = position();
    const m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
    if (!m) {
      return;
    }

    return pos({
      type: 'custom-media',
      name: trim(m[1]),
      media: trim(m[2]),
    });
  }

  /**
   * Parse paged media.
   */

  function atpage() {
    const pos = position();
    const m = match(/^@page */);
    if (!m) {
      return;
    }

    const sel = selector() || [];

    if (!open()) {
      return error(`@page missing '{'`);
    }
    let decls = comments();

    // declarations
    let decl;
    while ((decl = declaration())) {
      decls.push(decl);
      decls = decls.concat(comments());
    }

    if (!close()) {
      return error(`@page missing '}'`);
    }

    return pos({
      type: 'page',
      selectors: sel,
      declarations: decls,
    });
  }

  /**
   * Parse document.
   */

  function atdocument() {
    const pos = position();
    const m = match(/^@([-\w]+)?document *([^{]+)/);
    if (!m) {
      return;
    }

    const vendor = trim(m[1]);
    const doc = trim(m[2]);

    if (!open()) {
      return error(`@document missing '{'`);
    }

    const style = comments().concat(rules());

    if (!close()) {
      return error(`@document missing '}'`);
    }

    return pos({
      type: 'document',
      document: doc,
      vendor,
      rules: style,
    });
  }

  /**
   * Parse font-face.
   */

  function atfontface() {
    const pos = position();
    const m = match(/^@font-face\s*/);
    if (!m) {
      return;
    }

    if (!open()) {
      return error(`@font-face missing '{'`);
    }
    let decls = comments();

    // declarations
    let decl;
    while ((decl = declaration())) {
      decls.push(decl);
      decls = decls.concat(comments());
    }

    if (!close()) {
      return error(`@font-face missing '}'`);
    }

    return pos({
      type: 'font-face',
      declarations: decls,
    });
  }

  /**
   * Parse import
   */

  const atimport = _compileAtrule('import');

  /**
   * Parse charset
   */

  const atcharset = _compileAtrule('charset');

  /**
   * Parse namespace
   */

  const atnamespace = _compileAtrule('namespace');

  /**
   * Parse non-block at-rules
   */

  function _compileAtrule(name: string) {
    const re = new RegExp(
      '^@' +
        name +
        '\\s*((?:' +
        [
          /[^\\]"(?:\\"|[^"])*"/.source, // consume any quoted parts (checking that the double quote isn't itself escaped)
          /[^\\]'(?:\\'|[^'])*'/.source, // same but for single quotes
          '[^;]',
        ].join('|') +
        ')+);',
    );
    return () => {
      const pos = position();
      const m = match(re);
      if (!m) {
        return;
      }
      const ret: Record<string, string> = { type: name };
      ret[name] = m[1].trim();
      return pos(ret);
    };
  }

  /**
   * Parse at rule.
   */

  function atrule() {
    if (css[0] !== '@') {
      return;
    }

    return (
      atkeyframes() ||
      atmedia() ||
      atcustommedia() ||
      atsupports() ||
      atimport() ||
      atcharset() ||
      atnamespace() ||
      atdocument() ||
      atpage() ||
      athost() ||
      atfontface()
    );
  }

  /**
   * Parse rule.
   */

  function rule() {
    const pos = position();
    const sel = selector();

    if (!sel) {
      return error('selector missing');
    }
    comments();

    return pos({
      type: 'rule',
      selectors: sel,
      declarations: declarations() as Declaration[],
    });
  }

  return addParent(stylesheet());
}

/**
 * Trim `str`.
 */

function trim(str: string) {
  return str ? str.replace(/^\s+|\s+$/g, '') : '';
}

/**
 * Adds non-enumerable parent node reference to each node.
 */

function addParent(obj: Stylesheet, parent?: Stylesheet): Stylesheet {
  const isNode = obj && typeof obj.type === 'string';
  const childParent = isNode ? obj : parent;

  for (const k of Object.keys(obj)) {
    const value = obj[k as keyof Stylesheet];
    if (Array.isArray(value)) {
      value.forEach((v) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        addParent(v, childParent);
      });
    } else if (value && typeof value === 'object') {
      addParent(value as Stylesheet, childParent);
    }
  }

  if (isNode) {
    Object.defineProperty(obj, 'parent', {
      configurable: true,
      writable: true,
      enumerable: false,
      value: parent || null,
    });
  }

  return obj;
}
