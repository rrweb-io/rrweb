var rrwebPlayer = (function () {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (var k in src) tar[k] = src[k];
		return tar;
	}

	function assignTrue(tar, src) {
		for (var k in src) tar[k] = 1;
		return tar;
	}

	function addLoc(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		fn();
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detachNode(node) {
		node.parentNode.removeChild(node);
	}

	function destroyEach(iterations, detach) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detach);
		}
	}

	function createElement(name) {
		return document.createElement(name);
	}

	function createSvgElement(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	function createText(data) {
		return document.createTextNode(data);
	}

	function createComment() {
		return document.createComment('');
	}

	function addListener(node, event, handler, options) {
		node.addEventListener(event, handler, options);
	}

	function removeListener(node, event, handler, options) {
		node.removeEventListener(event, handler, options);
	}

	function setAttribute(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function setData(text, data) {
		text.data = '' + data;
	}

	function setStyle(node, key, value) {
		node.style.setProperty(key, value);
	}

	function toggleClass(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	function blankObject() {
		return Object.create(null);
	}

	function destroy(detach) {
		this.destroy = noop;
		this.fire('destroy');
		this.set = noop;

		this._fragment.d(detach !== false);
		this._fragment = null;
		this._state = {};
	}

	function destroyDev(detach) {
		destroy.call(this, detach);
		this.destroy = function() {
			console.warn('Component was already destroyed');
		};
	}

	function _differs(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function fire(eventName, data) {
		var handlers =
			eventName in this._handlers && this._handlers[eventName].slice();
		if (!handlers) return;

		for (var i = 0; i < handlers.length; i += 1) {
			var handler = handlers[i];

			if (!handler.__calling) {
				try {
					handler.__calling = true;
					handler.call(this, data);
				} finally {
					handler.__calling = false;
				}
			}
		}
	}

	function flush(component) {
		component._lock = true;
		callAll(component._beforecreate);
		callAll(component._oncreate);
		callAll(component._aftercreate);
		component._lock = false;
	}

	function get() {
		return this._state;
	}

	function init(component, options) {
		component._handlers = blankObject();
		component._slots = blankObject();
		component._bind = options._bind;
		component._staged = {};

		component.options = options;
		component.root = options.root || component;
		component.store = options.store || component.root.store;

		if (!options.root) {
			component._beforecreate = [];
			component._oncreate = [];
			component._aftercreate = [];
		}
	}

	function on(eventName, handler) {
		var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
		handlers.push(handler);

		return {
			cancel: function() {
				var index = handlers.indexOf(handler);
				if (~index) handlers.splice(index, 1);
			}
		};
	}

	function set(newState) {
		this._set(assign({}, newState));
		if (this.root._lock) return;
		flush(this.root);
	}

	function _set(newState) {
		var oldState = this._state,
			changed = {},
			dirty = false;

		newState = assign(this._staged, newState);
		this._staged = {};

		for (var key in newState) {
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
		}
		if (!dirty) return;

		this._state = assign(assign({}, oldState), newState);
		this._recompute(changed, this._state);
		if (this._bind) this._bind(changed, this._state);

		if (this._fragment) {
			this.fire("state", { changed: changed, current: this._state, previous: oldState });
			this._fragment.p(changed, this._state);
			this.fire("update", { changed: changed, current: this._state, previous: oldState });
		}
	}

	function _stage(newState) {
		assign(this._staged, newState);
	}

	function setDev(newState) {
		if (typeof newState !== 'object') {
			throw new Error(
				this._debugName + '.set was called without an object of data key-values to update.'
			);
		}

		this._checkReadOnly(newState);
		set.call(this, newState);
	}

	function callAll(fns) {
		while (fns && fns.length) fns.shift()();
	}

	function _mount(target, anchor) {
		this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
	}

	var protoDev = {
		destroy: destroyDev,
		get,
		fire,
		on,
		set: setDev,
		_recompute: noop,
		_set,
		_stage,
		_mount,
		_differs
	};

	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation. All rights reserved.
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use
	this file except in compliance with the License. You may obtain a copy of the
	License at http://www.apache.org/licenses/LICENSE-2.0

	THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
	WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
	MERCHANTABLITY OR NON-INFRINGEMENT.

	See the Apache Version 2.0 License for specific language governing permissions
	and limitations under the License.
	***************************************************************************** */

	var __assign = function() {
	  __assign =
	    Object.assign ||
	    function __assign(t) {
	      for (var s, i = 1, n = arguments.length; i < n; i++) {
	        s = arguments[i];
	        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	      }
	      return t;
	    };
	  return __assign.apply(this, arguments);
	};

	var NodeType;
	(function(NodeType) {
	  NodeType[(NodeType['Document'] = 0)] = 'Document';
	  NodeType[(NodeType['DocumentType'] = 1)] = 'DocumentType';
	  NodeType[(NodeType['Element'] = 2)] = 'Element';
	  NodeType[(NodeType['Text'] = 3)] = 'Text';
	  NodeType[(NodeType['CDATA'] = 4)] = 'CDATA';
	  NodeType[(NodeType['Comment'] = 5)] = 'Comment';
	})(NodeType || (NodeType = {}));

	var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
	function parse(css, options) {
	  if (options === void 0) {
	    options = {};
	  }
	  var lineno = 1;
	  var column = 1;
	  function updatePosition(str) {
	    var lines = str.match(/\n/g);
	    if (lines) {
	      lineno += lines.length;
	    }
	    var i = str.lastIndexOf('\n');
	    column = i === -1 ? column + str.length : str.length - i;
	  }
	  function position() {
	    var start = { line: lineno, column: column };
	    return function(node) {
	      node.position = new Position(start);
	      whitespace();
	      return node;
	    };
	  }
	  var Position = (function() {
	    function Position(start) {
	      this.start = start;
	      this.end = { line: lineno, column: column };
	      this.source = options.source;
	    }
	    return Position;
	  })();
	  Position.prototype.content = css;
	  var errorsList = [];
	  function error(msg) {
	    var err = new Error(options.source + ':' + lineno + ':' + column + ': ' + msg);
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
	  function stylesheet() {
	    var rulesList = rules();
	    return {
	      type: 'stylesheet',
	      stylesheet: {
	        source: options.source,
	        rules: rulesList,
	        parsingErrors: errorsList,
	      },
	    };
	  }
	  function open() {
	    return match(/^{\s*/);
	  }
	  function close() {
	    return match(/^}/);
	  }
	  function rules() {
	    var node;
	    var rules = [];
	    whitespace();
	    comments(rules);
	    while (css.length && css.charAt(0) !== '}' && (node = atrule() || rule())) {
	      if (node !== false) {
	        rules.push(node);
	        comments(rules);
	      }
	    }
	    return rules;
	  }
	  function match(re) {
	    var m = re.exec(css);
	    if (!m) {
	      return;
	    }
	    var str = m[0];
	    updatePosition(str);
	    css = css.slice(str.length);
	    return m;
	  }
	  function whitespace() {
	    match(/^\s*/);
	  }
	  function comments(rules) {
	    if (rules === void 0) {
	      rules = [];
	    }
	    var c;
	    while ((c = comment())) {
	      if (c !== false) {
	        rules.push(c);
	      }
	      c = comment();
	    }
	    return rules;
	  }
	  function comment() {
	    var pos = position();
	    if ('/' !== css.charAt(0) || '*' !== css.charAt(1)) {
	      return;
	    }
	    var i = 2;
	    while ('' !== css.charAt(i) && ('*' !== css.charAt(i) || '/' !== css.charAt(i + 1))) {
	      ++i;
	    }
	    i += 2;
	    if ('' === css.charAt(i - 1)) {
	      return error('End of comment missing');
	    }
	    var str = css.slice(2, i - 2);
	    column += 2;
	    updatePosition(str);
	    css = css.slice(i);
	    column += 2;
	    return pos({
	      type: 'comment',
	      comment: str,
	    });
	  }
	  function selector() {
	    var m = match(/^([^{]+)/);
	    if (!m) {
	      return;
	    }
	    return trim(m[0])
	      .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, '')
	      .replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, function(m) {
	        return m.replace(/,/g, '\u200C');
	      })
	      .split(/\s*(?![^(]*\)),\s*/)
	      .map(function(s) {
	        return s.replace(/\u200C/g, ',');
	      });
	  }
	  function declaration() {
	    var pos = position();
	    var propMatch = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
	    if (!propMatch) {
	      return;
	    }
	    var prop = trim(propMatch[0]);
	    if (!match(/^:\s*/)) {
	      return error("property missing ':'");
	    }
	    var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
	    var ret = pos({
	      type: 'declaration',
	      property: prop.replace(commentre, ''),
	      value: val ? trim(val[0]).replace(commentre, '') : '',
	    });
	    match(/^[;\s]*/);
	    return ret;
	  }
	  function declarations() {
	    var decls = [];
	    if (!open()) {
	      return error("missing '{'");
	    }
	    comments(decls);
	    var decl;
	    while ((decl = declaration())) {
	      if (decl !== false) {
	        decls.push(decl);
	        comments(decls);
	      }
	      decl = declaration();
	    }
	    if (!close()) {
	      return error("missing '}'");
	    }
	    return decls;
	  }
	  function keyframe() {
	    var m;
	    var vals = [];
	    var pos = position();
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
	      declarations: declarations(),
	    });
	  }
	  function atkeyframes() {
	    var pos = position();
	    var m = match(/^@([-\w]+)?keyframes\s*/);
	    if (!m) {
	      return;
	    }
	    var vendor = m[1];
	    m = match(/^([-\w]+)\s*/);
	    if (!m) {
	      return error('@keyframes missing name');
	    }
	    var name = m[1];
	    if (!open()) {
	      return error("@keyframes missing '{'");
	    }
	    var frame;
	    var frames = comments();
	    while ((frame = keyframe())) {
	      frames.push(frame);
	      frames = frames.concat(comments());
	    }
	    if (!close()) {
	      return error("@keyframes missing '}'");
	    }
	    return pos({
	      type: 'keyframes',
	      name: name,
	      vendor: vendor,
	      keyframes: frames,
	    });
	  }
	  function atsupports() {
	    var pos = position();
	    var m = match(/^@supports *([^{]+)/);
	    if (!m) {
	      return;
	    }
	    var supports = trim(m[1]);
	    if (!open()) {
	      return error("@supports missing '{'");
	    }
	    var style = comments().concat(rules());
	    if (!close()) {
	      return error("@supports missing '}'");
	    }
	    return pos({
	      type: 'supports',
	      supports: supports,
	      rules: style,
	    });
	  }
	  function athost() {
	    var pos = position();
	    var m = match(/^@host\s*/);
	    if (!m) {
	      return;
	    }
	    if (!open()) {
	      return error("@host missing '{'");
	    }
	    var style = comments().concat(rules());
	    if (!close()) {
	      return error("@host missing '}'");
	    }
	    return pos({
	      type: 'host',
	      rules: style,
	    });
	  }
	  function atmedia() {
	    var pos = position();
	    var m = match(/^@media *([^{]+)/);
	    if (!m) {
	      return;
	    }
	    var media = trim(m[1]);
	    if (!open()) {
	      return error("@media missing '{'");
	    }
	    var style = comments().concat(rules());
	    if (!close()) {
	      return error("@media missing '}'");
	    }
	    return pos({
	      type: 'media',
	      media: media,
	      rules: style,
	    });
	  }
	  function atcustommedia() {
	    var pos = position();
	    var m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
	    if (!m) {
	      return;
	    }
	    return pos({
	      type: 'custom-media',
	      name: trim(m[1]),
	      media: trim(m[2]),
	    });
	  }
	  function atpage() {
	    var pos = position();
	    var m = match(/^@page */);
	    if (!m) {
	      return;
	    }
	    var sel = selector() || [];
	    if (!open()) {
	      return error("@page missing '{'");
	    }
	    var decls = comments();
	    var decl;
	    while ((decl = declaration())) {
	      decls.push(decl);
	      decls = decls.concat(comments());
	    }
	    if (!close()) {
	      return error("@page missing '}'");
	    }
	    return pos({
	      type: 'page',
	      selectors: sel,
	      declarations: decls,
	    });
	  }
	  function atdocument() {
	    var pos = position();
	    var m = match(/^@([-\w]+)?document *([^{]+)/);
	    if (!m) {
	      return;
	    }
	    var vendor = trim(m[1]);
	    var doc = trim(m[2]);
	    if (!open()) {
	      return error("@document missing '{'");
	    }
	    var style = comments().concat(rules());
	    if (!close()) {
	      return error("@document missing '}'");
	    }
	    return pos({
	      type: 'document',
	      document: doc,
	      vendor: vendor,
	      rules: style,
	    });
	  }
	  function atfontface() {
	    var pos = position();
	    var m = match(/^@font-face\s*/);
	    if (!m) {
	      return;
	    }
	    if (!open()) {
	      return error("@font-face missing '{'");
	    }
	    var decls = comments();
	    var decl;
	    while ((decl = declaration())) {
	      decls.push(decl);
	      decls = decls.concat(comments());
	    }
	    if (!close()) {
	      return error("@font-face missing '}'");
	    }
	    return pos({
	      type: 'font-face',
	      declarations: decls,
	    });
	  }
	  var atimport = _compileAtrule('import');
	  var atcharset = _compileAtrule('charset');
	  var atnamespace = _compileAtrule('namespace');
	  function _compileAtrule(name) {
	    var re = new RegExp('^@' + name + '\\s*([^;]+);');
	    return function() {
	      var pos = position();
	      var m = match(re);
	      if (!m) {
	        return;
	      }
	      var ret = { type: name };
	      ret[name] = m[1].trim();
	      return pos(ret);
	    };
	  }
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
	  function rule() {
	    var pos = position();
	    var sel = selector();
	    if (!sel) {
	      return error('selector missing');
	    }
	    comments();
	    return pos({
	      type: 'rule',
	      selectors: sel,
	      declarations: declarations(),
	    });
	  }
	  return addParent(stylesheet());
	}
	function trim(str) {
	  return str ? str.replace(/^\s+|\s+$/g, '') : '';
	}
	function addParent(obj, parent) {
	  var isNode = obj && typeof obj.type === 'string';
	  var childParent = isNode ? obj : parent;
	  for (var _i = 0, _a = Object.keys(obj); _i < _a.length; _i++) {
	    var k = _a[_i];
	    var value = obj[k];
	    if (Array.isArray(value)) {
	      value.forEach(function(v) {
	        addParent(v, childParent);
	      });
	    } else if (value && typeof value === 'object') {
	      addParent(value, childParent);
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

	var tagMap = {
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
	  var tagName = tagMap[n.tagName] ? tagMap[n.tagName] : n.tagName;
	  if (tagName === 'link' && n.attributes._cssText) {
	    tagName = 'style';
	  }
	  return tagName;
	}
	var HOVER_SELECTOR = /([^\\]):hover/g;
	function addHoverClass(cssText) {
	  var ast = parse(cssText, { silent: true });
	  if (!ast.stylesheet) {
	    return cssText;
	  }
	  ast.stylesheet.rules.forEach(function(rule) {
	    if ('selectors' in rule) {
	      (rule.selectors || []).forEach(function(selector) {
	        if (HOVER_SELECTOR.test(selector)) {
	          var newSelector = selector.replace(HOVER_SELECTOR, '$1.\\:hover');
	          cssText = cssText.replace(selector, selector + ', ' + newSelector);
	        }
	      });
	    }
	  });
	  return cssText;
	}
	function buildNode(n, doc, HACK_CSS) {
	  switch (n.type) {
	    case NodeType.Document:
	      return doc.implementation.createDocument(null, '', null);
	    case NodeType.DocumentType:
	      return doc.implementation.createDocumentType(n.name, n.publicId, n.systemId);
	    case NodeType.Element:
	      var tagName = getTagName(n);
	      var node = void 0;
	      if (n.isSVG) {
	        node = doc.createElementNS('http://www.w3.org/2000/svg', tagName);
	      } else {
	        node = doc.createElement(tagName);
	      }
	      for (var name in n.attributes) {
	        if (n.attributes.hasOwnProperty(name) && !name.startsWith('rr_')) {
	          var value = n.attributes[name];
	          value = typeof value === 'boolean' ? '' : value;
	          var isTextarea = tagName === 'textarea' && name === 'value';
	          var isRemoteOrDynamicCss = tagName === 'style' && name === '_cssText';
	          if (isRemoteOrDynamicCss && HACK_CSS) {
	            value = addHoverClass(value);
	          }
	          if (isTextarea || isRemoteOrDynamicCss) {
	            var child = doc.createTextNode(value);
	            for (var _i = 0, _a = Array.from(node.childNodes); _i < _a.length; _i++) {
	              var c = _a[_i];
	              if (c.nodeType === node.TEXT_NODE) {
	                node.removeChild(c);
	              }
	            }
	            node.appendChild(child);
	            continue;
	          }
	          if (tagName === 'iframe' && name === 'src') {
	            continue;
	          }
	          try {
	            if (n.isSVG && name === 'xlink:href') {
	              node.setAttributeNS('http://www.w3.org/1999/xlink', name, value);
	            } else {
	              node.setAttribute(name, value);
	            }
	          } catch (error) {}
	        } else {
	          if (n.attributes.rr_width) {
	            node.style.width = n.attributes.rr_width;
	          }
	          if (n.attributes.rr_height) {
	            node.style.height = n.attributes.rr_height;
	          }
	        }
	      }
	      return node;
	    case NodeType.Text:
	      return doc.createTextNode(
	        n.isStyle && HACK_CSS ? addHoverClass(n.textContent) : n.textContent,
	      );
	    case NodeType.CDATA:
	      return doc.createCDATASection(n.textContent);
	    case NodeType.Comment:
	      return doc.createComment(n.textContent);
	    default:
	      return null;
	  }
	}
	function buildNodeWithSN(n, doc, map, skipChild, HACK_CSS) {
	  if (skipChild === void 0) {
	    skipChild = false;
	  }
	  if (HACK_CSS === void 0) {
	    HACK_CSS = true;
	  }
	  var node = buildNode(n, doc, HACK_CSS);
	  if (!node) {
	    return null;
	  }
	  if (n.type === NodeType.Document) {
	    doc.close();
	    doc.open();
	    node = doc;
	  }
	  node.__sn = n;
	  map[n.id] = node;
	  if ((n.type === NodeType.Document || n.type === NodeType.Element) && !skipChild) {
	    for (var _i = 0, _a = n.childNodes; _i < _a.length; _i++) {
	      var childN = _a[_i];
	      var childNode = buildNodeWithSN(childN, doc, map, false, HACK_CSS);
	      if (!childNode) {
	        console.warn('Failed to rebuild', childN);
	      } else {
	        node.appendChild(childNode);
	      }
	    }
	  }
	  return node;
	}
	function rebuild(n, doc, HACK_CSS) {
	  if (HACK_CSS === void 0) {
	    HACK_CSS = true;
	  }
	  var idNodeMap = {};
	  return [buildNodeWithSN(n, doc, idNodeMap, false, HACK_CSS), idNodeMap];
	}
	var mirror = {
	  map: {},
	  getId: function(n) {
	    if (!n.__sn) {
	      return -1;
	    }
	    return n.__sn.id;
	  },
	  getNode: function(id) {
	    return mirror.map[id] || null;
	  },
	  removeNodeFromMap: function(n) {
	    var id = n.__sn && n.__sn.id;
	    delete mirror.map[id];
	    if (n.childNodes) {
	      n.childNodes.forEach(function(child) {
	        return mirror.removeNodeFromMap(child);
	      });
	    }
	  },
	  has: function(id) {
	    return mirror.map.hasOwnProperty(id);
	  },
	};
	function polyfill() {
	  if ('NodeList' in window && !NodeList.prototype.forEach) {
	    NodeList.prototype.forEach = Array.prototype.forEach;
	  }
	}

	var EventType;
	(function(EventType) {
	  EventType[(EventType['DomContentLoaded'] = 0)] = 'DomContentLoaded';
	  EventType[(EventType['Load'] = 1)] = 'Load';
	  EventType[(EventType['FullSnapshot'] = 2)] = 'FullSnapshot';
	  EventType[(EventType['IncrementalSnapshot'] = 3)] = 'IncrementalSnapshot';
	  EventType[(EventType['Meta'] = 4)] = 'Meta';
	  EventType[(EventType['Custom'] = 5)] = 'Custom';
	})(EventType || (EventType = {}));
	var IncrementalSource;
	(function(IncrementalSource) {
	  IncrementalSource[(IncrementalSource['Mutation'] = 0)] = 'Mutation';
	  IncrementalSource[(IncrementalSource['MouseMove'] = 1)] = 'MouseMove';
	  IncrementalSource[(IncrementalSource['MouseInteraction'] = 2)] = 'MouseInteraction';
	  IncrementalSource[(IncrementalSource['Scroll'] = 3)] = 'Scroll';
	  IncrementalSource[(IncrementalSource['ViewportResize'] = 4)] = 'ViewportResize';
	  IncrementalSource[(IncrementalSource['Input'] = 5)] = 'Input';
	  IncrementalSource[(IncrementalSource['TouchMove'] = 6)] = 'TouchMove';
	})(IncrementalSource || (IncrementalSource = {}));
	var MouseInteractions;
	(function(MouseInteractions) {
	  MouseInteractions[(MouseInteractions['MouseUp'] = 0)] = 'MouseUp';
	  MouseInteractions[(MouseInteractions['MouseDown'] = 1)] = 'MouseDown';
	  MouseInteractions[(MouseInteractions['Click'] = 2)] = 'Click';
	  MouseInteractions[(MouseInteractions['ContextMenu'] = 3)] = 'ContextMenu';
	  MouseInteractions[(MouseInteractions['DblClick'] = 4)] = 'DblClick';
	  MouseInteractions[(MouseInteractions['Focus'] = 5)] = 'Focus';
	  MouseInteractions[(MouseInteractions['Blur'] = 6)] = 'Blur';
	  MouseInteractions[(MouseInteractions['TouchStart'] = 7)] = 'TouchStart';
	  MouseInteractions[(MouseInteractions['TouchMove_Departed'] = 8)] = 'TouchMove_Departed';
	  MouseInteractions[(MouseInteractions['TouchEnd'] = 9)] = 'TouchEnd';
	})(MouseInteractions || (MouseInteractions = {}));
	var ReplayerEvents;
	(function(ReplayerEvents) {
	  ReplayerEvents['Start'] = 'start';
	  ReplayerEvents['Pause'] = 'pause';
	  ReplayerEvents['Resume'] = 'resume';
	  ReplayerEvents['Resize'] = 'resize';
	  ReplayerEvents['Finish'] = 'finish';
	  ReplayerEvents['FullsnapshotRebuilded'] = 'fullsnapshot-rebuilded';
	  ReplayerEvents['LoadStylesheetStart'] = 'load-stylesheet-start';
	  ReplayerEvents['LoadStylesheetEnd'] = 'load-stylesheet-end';
	  ReplayerEvents['SkipStart'] = 'skip-start';
	  ReplayerEvents['SkipEnd'] = 'skip-end';
	  ReplayerEvents['MouseInteraction'] = 'mouse-interaction';
	})(ReplayerEvents || (ReplayerEvents = {}));

	//
	// An event handler can take an optional event argument
	// and should not return a value

	// An array of all currently registered event handlers for a type

	// A map of event types and their corresponding event handlers.

	/** Mitt: Tiny (~200b) functional event emitter / pubsub.
	 *  @name mitt
	 *  @returns {Mitt}
	 */
	function mitt(all) {
	  all = all || Object.create(null);

	  return {
	    /**
	     * Register an event handler for the given type.
	     *
	     * @param  {String} type	Type of event to listen for, or `"*"` for all events
	     * @param  {Function} handler Function to call in response to given event
	     * @memberOf mitt
	     */
	    on: function on(type, handler) {
	      (all[type] || (all[type] = [])).push(handler);
	    },

	    /**
	     * Remove an event handler for the given type.
	     *
	     * @param  {String} type	Type of event to unregister `handler` from, or `"*"`
	     * @param  {Function} handler Handler function to remove
	     * @memberOf mitt
	     */
	    off: function off(type, handler) {
	      if (all[type]) {
	        all[type].splice(all[type].indexOf(handler) >>> 0, 1);
	      }
	    },

	    /**
	     * Invoke all handlers for the given type.
	     * If present, `"*"` handlers are invoked after type-matched handlers.
	     *
	     * @param {String} type  The event type to invoke
	     * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
	     * @memberOf mitt
	     */
	    emit: function emit(type, evt) {
	      (all[type] || []).slice().map(function(handler) {
	        handler(evt);
	      });
	      (all['*'] || []).slice().map(function(handler) {
	        handler(type, evt);
	      });
	    },
	  };
	}

	var mittProxy = /*#__PURE__*/ Object.freeze({
	  default: mitt,
	});

	function createCommonjsModule(fn, module) {
	  return (module = { exports: {} }), fn(module, module.exports), module.exports;
	}

	var smoothscroll = createCommonjsModule(function(module, exports) {
	  /* smoothscroll v0.4.4 - 2019 - Dustan Kasten, Jeremias Menichelli - MIT License */
	  (function() {
	    // polyfill
	    function polyfill() {
	      // aliases
	      var w = window;
	      var d = document;

	      // return if scroll behavior is supported and polyfill is not forced
	      if ('scrollBehavior' in d.documentElement.style && w.__forceSmoothScrollPolyfill__ !== true) {
	        return;
	      }

	      // globals
	      var Element = w.HTMLElement || w.Element;
	      var SCROLL_TIME = 468;

	      // object gathering original scroll methods
	      var original = {
	        scroll: w.scroll || w.scrollTo,
	        scrollBy: w.scrollBy,
	        elementScroll: Element.prototype.scroll || scrollElement,
	        scrollIntoView: Element.prototype.scrollIntoView,
	      };

	      // define timing method
	      var now =
	        w.performance && w.performance.now ? w.performance.now.bind(w.performance) : Date.now;

	      /**
	       * indicates if a the current browser is made by Microsoft
	       * @method isMicrosoftBrowser
	       * @param {String} userAgent
	       * @returns {Boolean}
	       */
	      function isMicrosoftBrowser(userAgent) {
	        var userAgentPatterns = ['MSIE ', 'Trident/', 'Edge/'];

	        return new RegExp(userAgentPatterns.join('|')).test(userAgent);
	      }

	      /*
	       * IE has rounding bug rounding down clientHeight and clientWidth and
	       * rounding up scrollHeight and scrollWidth causing false positives
	       * on hasScrollableSpace
	       */
	      var ROUNDING_TOLERANCE = isMicrosoftBrowser(w.navigator.userAgent) ? 1 : 0;

	      /**
	       * changes scroll position inside an element
	       * @method scrollElement
	       * @param {Number} x
	       * @param {Number} y
	       * @returns {undefined}
	       */
	      function scrollElement(x, y) {
	        this.scrollLeft = x;
	        this.scrollTop = y;
	      }

	      /**
	       * returns result of applying ease math function to a number
	       * @method ease
	       * @param {Number} k
	       * @returns {Number}
	       */
	      function ease(k) {
	        return 0.5 * (1 - Math.cos(Math.PI * k));
	      }

	      /**
	       * indicates if a smooth behavior should be applied
	       * @method shouldBailOut
	       * @param {Number|Object} firstArg
	       * @returns {Boolean}
	       */
	      function shouldBailOut(firstArg) {
	        if (
	          firstArg === null ||
	          typeof firstArg !== 'object' ||
	          firstArg.behavior === undefined ||
	          firstArg.behavior === 'auto' ||
	          firstArg.behavior === 'instant'
	        ) {
	          // first argument is not an object/null
	          // or behavior is auto, instant or undefined
	          return true;
	        }

	        if (typeof firstArg === 'object' && firstArg.behavior === 'smooth') {
	          // first argument is an object and behavior is smooth
	          return false;
	        }

	        // throw error when behavior is not supported
	        throw new TypeError(
	          'behavior member of ScrollOptions ' +
	            firstArg.behavior +
	            ' is not a valid value for enumeration ScrollBehavior.',
	        );
	      }

	      /**
	       * indicates if an element has scrollable space in the provided axis
	       * @method hasScrollableSpace
	       * @param {Node} el
	       * @param {String} axis
	       * @returns {Boolean}
	       */
	      function hasScrollableSpace(el, axis) {
	        if (axis === 'Y') {
	          return el.clientHeight + ROUNDING_TOLERANCE < el.scrollHeight;
	        }

	        if (axis === 'X') {
	          return el.clientWidth + ROUNDING_TOLERANCE < el.scrollWidth;
	        }
	      }

	      /**
	       * indicates if an element has a scrollable overflow property in the axis
	       * @method canOverflow
	       * @param {Node} el
	       * @param {String} axis
	       * @returns {Boolean}
	       */
	      function canOverflow(el, axis) {
	        var overflowValue = w.getComputedStyle(el, null)['overflow' + axis];

	        return overflowValue === 'auto' || overflowValue === 'scroll';
	      }

	      /**
	       * indicates if an element can be scrolled in either axis
	       * @method isScrollable
	       * @param {Node} el
	       * @param {String} axis
	       * @returns {Boolean}
	       */
	      function isScrollable(el) {
	        var isScrollableY = hasScrollableSpace(el, 'Y') && canOverflow(el, 'Y');
	        var isScrollableX = hasScrollableSpace(el, 'X') && canOverflow(el, 'X');

	        return isScrollableY || isScrollableX;
	      }

	      /**
	       * finds scrollable parent of an element
	       * @method findScrollableParent
	       * @param {Node} el
	       * @returns {Node} el
	       */
	      function findScrollableParent(el) {
	        while (el !== d.body && isScrollable(el) === false) {
	          el = el.parentNode || el.host;
	        }

	        return el;
	      }

	      /**
	       * self invoked function that, given a context, steps through scrolling
	       * @method step
	       * @param {Object} context
	       * @returns {undefined}
	       */
	      function step(context) {
	        var time = now();
	        var value;
	        var currentX;
	        var currentY;
	        var elapsed = (time - context.startTime) / SCROLL_TIME;

	        // avoid elapsed times higher than one
	        elapsed = elapsed > 1 ? 1 : elapsed;

	        // apply easing to elapsed time
	        value = ease(elapsed);

	        currentX = context.startX + (context.x - context.startX) * value;
	        currentY = context.startY + (context.y - context.startY) * value;

	        context.method.call(context.scrollable, currentX, currentY);

	        // scroll more if we have not reached our destination
	        if (currentX !== context.x || currentY !== context.y) {
	          w.requestAnimationFrame(step.bind(w, context));
	        }
	      }

	      /**
	       * scrolls window or element with a smooth behavior
	       * @method smoothScroll
	       * @param {Object|Node} el
	       * @param {Number} x
	       * @param {Number} y
	       * @returns {undefined}
	       */
	      function smoothScroll(el, x, y) {
	        var scrollable;
	        var startX;
	        var startY;
	        var method;
	        var startTime = now();

	        // define scroll context
	        if (el === d.body) {
	          scrollable = w;
	          startX = w.scrollX || w.pageXOffset;
	          startY = w.scrollY || w.pageYOffset;
	          method = original.scroll;
	        } else {
	          scrollable = el;
	          startX = el.scrollLeft;
	          startY = el.scrollTop;
	          method = scrollElement;
	        }

	        // scroll looping over a frame
	        step({
	          scrollable: scrollable,
	          method: method,
	          startTime: startTime,
	          startX: startX,
	          startY: startY,
	          x: x,
	          y: y,
	        });
	      }

	      // ORIGINAL METHODS OVERRIDES
	      // w.scroll and w.scrollTo
	      w.scroll = w.scrollTo = function() {
	        // avoid action when no arguments are passed
	        if (arguments[0] === undefined) {
	          return;
	        }

	        // avoid smooth behavior if not required
	        if (shouldBailOut(arguments[0]) === true) {
	          original.scroll.call(
	            w,
	            arguments[0].left !== undefined
	              ? arguments[0].left
	              : typeof arguments[0] !== 'object'
	              ? arguments[0]
	              : w.scrollX || w.pageXOffset,
	            // use top prop, second argument if present or fallback to scrollY
	            arguments[0].top !== undefined
	              ? arguments[0].top
	              : arguments[1] !== undefined
	              ? arguments[1]
	              : w.scrollY || w.pageYOffset,
	          );

	          return;
	        }

	        // LET THE SMOOTHNESS BEGIN!
	        smoothScroll.call(
	          w,
	          d.body,
	          arguments[0].left !== undefined ? ~~arguments[0].left : w.scrollX || w.pageXOffset,
	          arguments[0].top !== undefined ? ~~arguments[0].top : w.scrollY || w.pageYOffset,
	        );
	      };

	      // w.scrollBy
	      w.scrollBy = function() {
	        // avoid action when no arguments are passed
	        if (arguments[0] === undefined) {
	          return;
	        }

	        // avoid smooth behavior if not required
	        if (shouldBailOut(arguments[0])) {
	          original.scrollBy.call(
	            w,
	            arguments[0].left !== undefined
	              ? arguments[0].left
	              : typeof arguments[0] !== 'object'
	              ? arguments[0]
	              : 0,
	            arguments[0].top !== undefined
	              ? arguments[0].top
	              : arguments[1] !== undefined
	              ? arguments[1]
	              : 0,
	          );

	          return;
	        }

	        // LET THE SMOOTHNESS BEGIN!
	        smoothScroll.call(
	          w,
	          d.body,
	          ~~arguments[0].left + (w.scrollX || w.pageXOffset),
	          ~~arguments[0].top + (w.scrollY || w.pageYOffset),
	        );
	      };

	      // Element.prototype.scroll and Element.prototype.scrollTo
	      Element.prototype.scroll = Element.prototype.scrollTo = function() {
	        // avoid action when no arguments are passed
	        if (arguments[0] === undefined) {
	          return;
	        }

	        // avoid smooth behavior if not required
	        if (shouldBailOut(arguments[0]) === true) {
	          // if one number is passed, throw error to match Firefox implementation
	          if (typeof arguments[0] === 'number' && arguments[1] === undefined) {
	            throw new SyntaxError('Value could not be converted');
	          }

	          original.elementScroll.call(
	            this,
	            // use left prop, first number argument or fallback to scrollLeft
	            arguments[0].left !== undefined
	              ? ~~arguments[0].left
	              : typeof arguments[0] !== 'object'
	              ? ~~arguments[0]
	              : this.scrollLeft,
	            // use top prop, second argument or fallback to scrollTop
	            arguments[0].top !== undefined
	              ? ~~arguments[0].top
	              : arguments[1] !== undefined
	              ? ~~arguments[1]
	              : this.scrollTop,
	          );

	          return;
	        }

	        var left = arguments[0].left;
	        var top = arguments[0].top;

	        // LET THE SMOOTHNESS BEGIN!
	        smoothScroll.call(
	          this,
	          this,
	          typeof left === 'undefined' ? this.scrollLeft : ~~left,
	          typeof top === 'undefined' ? this.scrollTop : ~~top,
	        );
	      };

	      // Element.prototype.scrollBy
	      Element.prototype.scrollBy = function() {
	        // avoid action when no arguments are passed
	        if (arguments[0] === undefined) {
	          return;
	        }

	        // avoid smooth behavior if not required
	        if (shouldBailOut(arguments[0]) === true) {
	          original.elementScroll.call(
	            this,
	            arguments[0].left !== undefined
	              ? ~~arguments[0].left + this.scrollLeft
	              : ~~arguments[0] + this.scrollLeft,
	            arguments[0].top !== undefined
	              ? ~~arguments[0].top + this.scrollTop
	              : ~~arguments[1] + this.scrollTop,
	          );

	          return;
	        }

	        this.scroll({
	          left: ~~arguments[0].left + this.scrollLeft,
	          top: ~~arguments[0].top + this.scrollTop,
	          behavior: arguments[0].behavior,
	        });
	      };

	      // Element.prototype.scrollIntoView
	      Element.prototype.scrollIntoView = function() {
	        // avoid smooth behavior if not required
	        if (shouldBailOut(arguments[0]) === true) {
	          original.scrollIntoView.call(this, arguments[0] === undefined ? true : arguments[0]);

	          return;
	        }

	        // LET THE SMOOTHNESS BEGIN!
	        var scrollableParent = findScrollableParent(this);
	        var parentRects = scrollableParent.getBoundingClientRect();
	        var clientRects = this.getBoundingClientRect();

	        if (scrollableParent !== d.body) {
	          // reveal element inside parent
	          smoothScroll.call(
	            this,
	            scrollableParent,
	            scrollableParent.scrollLeft + clientRects.left - parentRects.left,
	            scrollableParent.scrollTop + clientRects.top - parentRects.top,
	          );

	          // reveal parent in viewport unless is fixed
	          if (w.getComputedStyle(scrollableParent).position !== 'fixed') {
	            w.scrollBy({
	              left: parentRects.left,
	              top: parentRects.top,
	              behavior: 'smooth',
	            });
	          }
	        } else {
	          // reveal element in viewport
	          w.scrollBy({
	            left: clientRects.left,
	            top: clientRects.top,
	            behavior: 'smooth',
	          });
	        }
	      };
	    }

	    {
	      // commonjs
	      module.exports = { polyfill: polyfill };
	    }
	  })();
	});
	var smoothscroll_1 = smoothscroll.polyfill;

	var Timer = (function() {
	  function Timer(config, actions) {
	    if (actions === void 0) {
	      actions = [];
	    }
	    this.timeOffset = 0;
	    this.actions = actions;
	    this.config = config;
	  }
	  Timer.prototype.addAction = function(action) {
	    var index = this.findActionIndex(action);
	    this.actions.splice(index, 0, action);
	  };
	  Timer.prototype.addActions = function(actions) {
	    var _a;
	    (_a = this.actions).push.apply(_a, actions);
	  };
	  Timer.prototype.pause = function() {
	    this.customClear();
	  };
	  Timer.prototype.resume = function() {
	    this.start();
	  };
	  Timer.prototype.customClear = function() {
	    if (this.raf) {
	      console.log('custom clear');
	      cancelAnimationFrame(this.raf);
	    }
	  };
	  Timer.prototype.start = function() {
	    console.log('2149 ', performance.now());
	    this.actions.sort(function(a1, a2) {
	      return a1.delay - a2.delay;
	    });
	    console.log('2151 ', performance.now());
	    // this.timeOffset = 0;
	    var lastTimestamp = performance.now();
	    var _a = this,
	      actions = _a.actions,
	      config = _a.config;
	    var self = this;
	    function check(time) {
	      self.timeOffset += (time - lastTimestamp) * config.speed;
	      lastTimestamp = time;
	      console.log('self.timeOffset ', self.timeOffset);
	      while (actions.length) {
	        var action = actions[0];
	        if (self.timeOffset >= action.delay) {
	          actions.shift();
	          action.doAction();
	        } else {
	          break;
	        }
	      }
	      if (actions.length > 0 || self.config.liveMode) {
	        self.raf = requestAnimationFrame(check);
	      }
	    }
	    this.raf = requestAnimationFrame(check);
	  };
	  Timer.prototype.clear = function() {
	    if (this.raf) {
	      cancelAnimationFrame(this.raf);
	    }
	    this.actions.length = 0;
	  };
	  Timer.prototype.findActionIndex = function(action) {
	    var start = 0;
	    var end = this.actions.length - 1;
	    while (start <= end) {
	      var mid = Math.floor((start + end) / 2);
	      if (this.actions[mid].delay < action.delay) {
	        start = mid + 1;
	      } else if (this.actions[mid].delay > action.delay) {
	        end = mid - 1;
	      } else {
	        return mid;
	      }
	    }
	    return start;
	  };
	  return Timer;
	})();

	var rules = function(blockClass) {
	  return [
	    'iframe, .' + blockClass + ' { background: #ccc }',
	    'noscript { display: none !important; }',
	  ];
	};

	var SKIP_TIME_THRESHOLD = 10 * 1000;
	var SKIP_TIME_INTERVAL = 5 * 1000;
	var mitt$1 = mitt || mittProxy;
	var REPLAY_CONSOLE_PREFIX = '[replayer]';
	var Replayer = (function() {
	  function Replayer(events, config) {
	    this.events = [];
	    this.emitter = mitt$1();
	    this.baselineTime = 0;
	    this.noramlSpeed = -1;
	    this.missingNodeRetryMap = {};
	    if (events.length < 2) {
	      throw new Error('Replayer need at least 2 events.');
	    }
	    this.events = events;
	    this.handleResize = this.handleResize.bind(this);
	    var defaultConfig = {
	      speed: 1,
	      root: document.body,
	      loadTimeout: 0,
	      skipInactive: false,
	      showWarning: true,
	      showDebug: false,
	      blockClass: 'rr-block',
	      liveMode: false,
	      insertStyleRules: [],
	    };
	    this.config = Object.assign({}, defaultConfig, config);
	    this.timer = new Timer(this.config);
	    smoothscroll_1();
	    polyfill();
	    this.setupDom();
	    this.emitter.on('resize', this.handleResize);
	  }
	  Replayer.prototype.on = function(event, handler) {
	    this.emitter.on(event, handler);
	  };
	  Replayer.prototype.setConfig = function(config) {
	    var _this = this;
	    Object.keys(config).forEach(function(key) {
	      _this.config[key] = config[key];
	    });
	    if (!this.config.skipInactive) {
	      this.noramlSpeed = -1;
	    }
	  };
	  Replayer.prototype.getMetaData = function() {
	    var firstEvent = this.events[0];
	    var lastEvent = this.events[this.events.length - 1];
	    return {
	      totalTime: lastEvent.timestamp - firstEvent.timestamp,
	    };
	  };
	  Replayer.prototype.getCurrentTime = function() {
	    return this.timer.timeOffset + this.getTimeOffset();
	  };
	  Replayer.prototype.getTimeOffset = function() {
	    return this.baselineTime - this.events[0].timestamp;
	  };
	  Replayer.prototype.play = function(timeOffset) {
	    if (timeOffset === void 0) {
	      timeOffset = 0;
	    }
	    this.timer.clear();
	    this.baselineTime = this.events[0].timestamp + timeOffset;
	    var actions = new Array();
	    for (var _i = 0, _a = this.events; _i < _a.length; _i++) {
	      var event = _a[_i];
	      var isSync = event.timestamp < this.baselineTime;
	      var castFn = this.getCastFn(event, isSync);
	      if (isSync) {
	        castFn();
	      } else {
	        actions.push({ doAction: castFn, delay: this.getDelay(event) });
	      }
	    }
	    this.timer.addActions(actions);
	    this.timer.start();
	    this.emitter.emit(ReplayerEvents.Start);
	  };
	  Replayer.prototype.convertBufferedEventsToActionsAndAddToTimer = function(bufferedEvents) {
	    var actions = new Array();
	    for (var _i = 0, bufferedEvents_1 = bufferedEvents; _i < bufferedEvents_1.length; _i++) {
	      var event = bufferedEvents_1[_i];
	      var castFn = this.getCastFn(event);
	      actions.push({ doAction: castFn, delay: this.getDelay(event) });
	    }
	    this.timer.addActions(actions);
	  };
	  Replayer.prototype.customPause = function() {
	    this.timer.pause();
	  };
	  Replayer.prototype.customResume = function() {
	    this.timer.resume();
	  };
	  Replayer.prototype.pause = function() {
	    this.timer.clear();
	    this.emitter.emit(ReplayerEvents.Pause);
	  };
	  Replayer.prototype.resume = function(timeOffset) {
	    if (timeOffset === void 0) {
	      timeOffset = 0;
	    }
	    this.timer.clear();
	    this.baselineTime = this.events[0].timestamp + timeOffset;
	    var actions = new Array();
	    for (var _i = 0, _a = this.events; _i < _a.length; _i++) {
	      var event = _a[_i];
	      if (event.timestamp <= this.lastPlayedEvent.timestamp || event === this.lastPlayedEvent) {
	        continue;
	      }
	      var castFn = this.getCastFn(event);
	      actions.push({
	        doAction: castFn,
	        delay: this.getDelay(event),
	      });
	    }
	    this.timer.addActions(actions);
	    this.timer.start();
	    this.emitter.emit(ReplayerEvents.Resume);
	  };
	  Replayer.prototype.addEvent = function(event) {
	    var castFn = this.getCastFn(event, true);
	    castFn();
	  };
	  Replayer.prototype.setupDom = function() {
	    this.wrapper = document.createElement('div');
	    this.wrapper.classList.add('replayer-wrapper');
	    this.config.root.appendChild(this.wrapper);
	    this.mouse = document.createElement('div');
	    this.mouse.classList.add('replayer-mouse');
	    this.wrapper.appendChild(this.mouse);
	    this.iframe = document.createElement('iframe');
	    this.iframe.setAttribute('sandbox', 'allow-same-origin');
	    this.iframe.setAttribute('scrolling', 'no');
	    this.iframe.setAttribute('style', 'pointer-events: none');
	    this.wrapper.appendChild(this.iframe);
	  };
	  Replayer.prototype.handleResize = function(dimension) {
	    this.iframe.width = dimension.width + 'px';
	    this.iframe.height = dimension.height + 'px';
	  };
	  Replayer.prototype.getDelay = function(event) {
	    if (
	      event.type === EventType.IncrementalSnapshot &&
	      event.data.source === IncrementalSource.MouseMove
	    ) {
	      var firstOffset = event.data.positions[0].timeOffset;
	      var firstTimestamp = event.timestamp + firstOffset;
	      event.delay = firstTimestamp - this.baselineTime;
	      return firstTimestamp - this.baselineTime;
	    }
	    event.delay = event.timestamp - this.baselineTime;
	    return event.timestamp - this.baselineTime;
	  };
	  Replayer.prototype.getCastFn = function(event, isSync) {
	    var _this = this;
	    if (isSync === void 0) {
	      isSync = false;
	    }
	    var castFn;
	    switch (event.type) {
	      case EventType.DomContentLoaded:
	      case EventType.Load:
	        break;
	      case EventType.Meta:
	        castFn = function() {
	          return _this.emitter.emit(ReplayerEvents.Resize, {
	            width: event.data.width,
	            height: event.data.height,
	          });
	        };
	        break;
	      case EventType.FullSnapshot:
	        castFn = function() {
	          _this.rebuildFullSnapshot(event);
	          _this.iframe.contentWindow.scrollTo(event.data.initialOffset);
	        };
	        break;
	      case EventType.IncrementalSnapshot:
	        castFn = function() {
	          _this.applyIncremental(event, isSync);
	          if (event === _this.nextUserInteractionEvent) {
	            _this.nextUserInteractionEvent = null;
	            _this.restoreSpeed();
	          }
	          if (_this.config.skipInactive && !_this.nextUserInteractionEvent) {
	            for (var _i = 0, _a = _this.events; _i < _a.length; _i++) {
	              var _event = _a[_i];
	              if (_event.timestamp <= event.timestamp) {
	                continue;
	              }
	              if (_this.isUserInteraction(_event)) {
	                if (_event.delay - event.delay > SKIP_TIME_THRESHOLD * _this.config.speed) {
	                  _this.nextUserInteractionEvent = _event;
	                }
	                break;
	              }
	            }
	            if (_this.nextUserInteractionEvent) {
	              _this.noramlSpeed = _this.config.speed;
	              var skipTime = _this.nextUserInteractionEvent.delay - event.delay;
	              var payload = {
	                speed: Math.min(Math.round(skipTime / SKIP_TIME_INTERVAL), 360),
	              };
	              _this.setConfig(payload);
	              _this.emitter.emit(ReplayerEvents.SkipStart, payload);
	            }
	          }
	        };
	        break;
	      default:
	    }
	    var wrappedCastFn = function() {
	      if (castFn) {
	        castFn();
	      }
	      _this.lastPlayedEvent = event;
	      if (event === _this.events[_this.events.length - 1]) {
	        _this.restoreSpeed();
	        _this.emitter.emit(ReplayerEvents.Finish);
	      }
	    };
	    return wrappedCastFn;
	  };
	  Replayer.prototype.rebuildFullSnapshot = function(event) {
	    if (Object.keys(this.missingNodeRetryMap).length) {
	      console.warn('Found unresolved missing node map', this.missingNodeRetryMap);
	    }
	    this.missingNodeRetryMap = {};
	    mirror.map = rebuild(event.data.node, this.iframe.contentDocument)[1];
	    var styleEl = document.createElement('style');
	    var _a = this.iframe.contentDocument,
	      documentElement = _a.documentElement,
	      head = _a.head;
	    documentElement.insertBefore(styleEl, head);
	    var injectStylesRules = rules(this.config.blockClass).concat(this.config.insertStyleRules);
	    for (var idx = 0; idx < injectStylesRules.length; idx++) {
	      styleEl.sheet.insertRule(injectStylesRules[idx], idx);
	    }
	    this.emitter.emit(ReplayerEvents.FullsnapshotRebuilded);
	    this.waitForStylesheetLoad();
	  };
	  Replayer.prototype.waitForStylesheetLoad = function() {
	    var _this = this;
	    var head = this.iframe.contentDocument.head;
	    if (head) {
	      var unloadSheets_1 = new Set();
	      var timer_1;
	      head.querySelectorAll('link[rel="stylesheet"]').forEach(function(css) {
	        if (!css.sheet) {
	          if (unloadSheets_1.size === 0) {
	            _this.pause();
	            _this.emitter.emit(ReplayerEvents.LoadStylesheetStart);
	            timer_1 = window.setTimeout(function() {
	              _this.resume(_this.getCurrentTime());
	              timer_1 = -1;
	            }, _this.config.loadTimeout);
	          }
	          unloadSheets_1.add(css);
	          css.addEventListener('load', function() {
	            unloadSheets_1['delete'](css);
	            if (unloadSheets_1.size === 0 && timer_1 !== -1) {
	              _this.resume(_this.getCurrentTime());
	              _this.emitter.emit(ReplayerEvents.LoadStylesheetEnd);
	              if (timer_1) {
	                window.clearTimeout(timer_1);
	              }
	            }
	          });
	        }
	      });
	    }
	  };
	  Replayer.prototype.applyIncremental = function(e, isSync) {
	    var _this = this;
	    var d = e.data;
	    switch (d.source) {
	      case IncrementalSource.Mutation: {
	        d.removes.forEach(function(mutation) {
	          var target = mirror.getNode(mutation.id);
	          if (!target) {
	            return _this.warnNodeNotFound(d, mutation.id);
	          }
	          var parent = mirror.getNode(mutation.parentId);
	          if (!parent) {
	            return _this.warnNodeNotFound(d, mutation.parentId);
	          }
	          mirror.removeNodeFromMap(target);
	          if (parent) {
	            parent.removeChild(target);
	          }
	        });
	        var missingNodeMap_1 = __assign({}, this.missingNodeRetryMap);
	        var queue_1 = [];
	        var appendNode_1 = function(mutation) {
	          var parent = mirror.getNode(mutation.parentId);
	          if (!parent) {
	            return queue_1.push(mutation);
	          }
	          var target = buildNodeWithSN(
	            mutation.node,
	            _this.iframe.contentDocument,
	            mirror.map,
	            true,
	          );
	          var previous = null;
	          var next = null;
	          if (mutation.previousId) {
	            previous = mirror.getNode(mutation.previousId);
	          }
	          if (mutation.nextId) {
	            next = mirror.getNode(mutation.nextId);
	          }
	          if (mutation.previousId === -1 || mutation.nextId === -1) {
	            missingNodeMap_1[mutation.node.id] = {
	              node: target,
	              mutation: mutation,
	            };
	            return;
	          }
	          if (previous && previous.nextSibling && previous.nextSibling.parentNode) {
	            parent.insertBefore(target, previous.nextSibling);
	          } else if (next && next.parentNode) {
	            parent.insertBefore(target, next);
	          } else {
	            parent.appendChild(target);
	          }
	          if (mutation.previousId || mutation.nextId) {
	            _this.resolveMissingNode(missingNodeMap_1, parent, target, mutation);
	          }
	        };
	        d.adds.forEach(function(mutation) {
	          appendNode_1(mutation);
	        });
	        while (queue_1.length) {
	          if (
	            queue_1.every(function(m) {
	              return !Boolean(mirror.getNode(m.parentId));
	            })
	          ) {
	            return queue_1.forEach(function(m) {
	              return _this.warnNodeNotFound(d, m.node.id);
	            });
	          }
	          var mutation = queue_1.shift();
	          appendNode_1(mutation);
	        }
	        if (Object.keys(missingNodeMap_1).length) {
	          Object.assign(this.missingNodeRetryMap, missingNodeMap_1);
	        }
	        d.texts.forEach(function(mutation) {
	          var target = mirror.getNode(mutation.id);
	          if (!target) {
	            return _this.warnNodeNotFound(d, mutation.id);
	          }
	          target.textContent = mutation.value;
	        });
	        d.attributes.forEach(function(mutation) {
	          var target = mirror.getNode(mutation.id);
	          if (!target) {
	            return _this.warnNodeNotFound(d, mutation.id);
	          }
	          for (var attributeName in mutation.attributes) {
	            if (typeof attributeName === 'string') {
	              var value = mutation.attributes[attributeName];
	              if (value !== null) {
	                target.setAttribute(attributeName, value);
	              } else {
	                target.removeAttribute(attributeName);
	              }
	            }
	          }
	        });
	        break;
	      }
	      case IncrementalSource.MouseMove:
	        if (isSync) {
	          var lastPosition = d.positions[d.positions.length - 1];
	          this.moveAndHover(d, lastPosition.x, lastPosition.y, lastPosition.id);
	        } else {
	          d.positions.forEach(function(p) {
	            var action = {
	              doAction: function() {
	                _this.moveAndHover(d, p.x, p.y, p.id);
	              },
	              delay: p.timeOffset + e.timestamp - _this.baselineTime,
	            };
	            _this.timer.addAction(action);
	          });
	        }
	        break;
	      case IncrementalSource.MouseInteraction: {
	        if (d.id === -1) {
	          break;
	        }
	        var event = new Event(MouseInteractions[d.type].toLowerCase());
	        var target = mirror.getNode(d.id);
	        if (!target) {
	          return this.debugNodeNotFound(d, d.id);
	        }
	        this.emitter.emit(ReplayerEvents.MouseInteraction, {
	          type: d.type,
	          target: target,
	        });
	        switch (d.type) {
	          case MouseInteractions.Blur:
	            if (target.blur) {
	              target.blur();
	            }
	            break;
	          case MouseInteractions.Focus:
	            if (target.focus) {
	              target.focus({
	                preventScroll: true,
	              });
	            }
	            break;
	          case MouseInteractions.Click:
	          case MouseInteractions.TouchStart:
	          case MouseInteractions.TouchEnd:
	            if (!isSync) {
	              this.moveAndHover(d, d.x, d.y, d.id);
	              this.mouse.classList.remove('active');
	              void this.mouse.offsetWidth;
	              this.mouse.classList.add('active');
	            }
	            break;
	          default:
	            target.dispatchEvent(event);
	        }
	        break;
	      }
	      case IncrementalSource.Scroll: {
	        if (d.id === -1) {
	          break;
	        }
	        var target = mirror.getNode(d.id);
	        if (!target) {
	          return this.debugNodeNotFound(d, d.id);
	        }
	        if (target === this.iframe.contentDocument) {
	          this.iframe.contentWindow.scrollTo({
	            top: d.y,
	            left: d.x,
	            behavior: isSync ? 'auto' : 'smooth',
	          });
	        } else {
	          try {
	            target.scrollTop = d.y;
	            target.scrollLeft = d.x;
	          } catch (error) {}
	        }
	        break;
	      }
	      case IncrementalSource.ViewportResize:
	        this.emitter.emit(ReplayerEvents.Resize, {
	          width: d.width,
	          height: d.height,
	        });
	        break;
	      case IncrementalSource.Input: {
	        if (d.id === -1) {
	          break;
	        }
	        var target = mirror.getNode(d.id);
	        if (!target) {
	          return this.debugNodeNotFound(d, d.id);
	        }
	        try {
	          target.checked = d.isChecked;
	          target.value = d.text;
	        } catch (error) {}
	        break;
	      }
	      default:
	    }
	  };
	  Replayer.prototype.resolveMissingNode = function(map, parent, target, targetMutation) {
	    var previousId = targetMutation.previousId,
	      nextId = targetMutation.nextId;
	    var previousInMap = previousId && map[previousId];
	    var nextInMap = nextId && map[nextId];
	    if (previousInMap) {
	      var _a = previousInMap,
	        node = _a.node,
	        mutation = _a.mutation;
	      parent.insertBefore(node, target);
	      delete map[mutation.node.id];
	      delete this.missingNodeRetryMap[mutation.node.id];
	      if (mutation.previousId || mutation.nextId) {
	        this.resolveMissingNode(map, parent, node, mutation);
	      }
	    }
	    if (nextInMap) {
	      var _b = nextInMap,
	        node = _b.node,
	        mutation = _b.mutation;
	      parent.insertBefore(node, target.nextSibling);
	      delete map[mutation.node.id];
	      delete this.missingNodeRetryMap[mutation.node.id];
	      if (mutation.previousId || mutation.nextId) {
	        this.resolveMissingNode(map, parent, node, mutation);
	      }
	    }
	  };
	  Replayer.prototype.moveAndHover = function(d, x, y, id) {
	    this.mouse.style.left = x + 'px';
	    this.mouse.style.top = y + 'px';
	    var target = mirror.getNode(id);
	    if (!target) {
	      return this.debugNodeNotFound(d, id);
	    }
	    this.hoverElements(target);
	  };
	  Replayer.prototype.hoverElements = function(el) {
	    this.iframe.contentDocument.querySelectorAll('.\\:hover').forEach(function(hoveredEl) {
	      hoveredEl.classList.remove(':hover');
	    });
	    var currentEl = el;
	    while (currentEl) {
	      currentEl.classList.add(':hover');
	      currentEl = currentEl.parentElement;
	    }
	  };
	  Replayer.prototype.isUserInteraction = function(event) {
	    if (event.type !== EventType.IncrementalSnapshot) {
	      return false;
	    }
	    return (
	      event.data.source > IncrementalSource.Mutation && event.data.source <= IncrementalSource.Input
	    );
	  };
	  Replayer.prototype.restoreSpeed = function() {
	    if (this.noramlSpeed === -1) {
	      return;
	    }
	    var payload = { speed: this.noramlSpeed };
	    this.setConfig(payload);
	    this.emitter.emit(ReplayerEvents.SkipEnd, payload);
	    this.noramlSpeed = -1;
	  };
	  Replayer.prototype.warnNodeNotFound = function(d, id) {
	    if (!this.config.showWarning) {
	      return;
	    }
	    console.warn(REPLAY_CONSOLE_PREFIX, "Node with id '" + id + "' not found in", d);
	  };
	  Replayer.prototype.debugNodeNotFound = function(d, id) {
	    if (!this.config.showDebug) {
	      return;
	    }
	    console.log(REPLAY_CONSOLE_PREFIX, "Node with id '" + id + "' not found in", d);
	  };
	  return Replayer;
	})();

	function styleInject(css, ref) {
	  if ( ref === void 0 ) ref = {};
	  var insertAt = ref.insertAt;

	  if (!css || typeof document === 'undefined') { return; }

	  var head = document.head || document.getElementsByTagName('head')[0];
	  var style = document.createElement('style');
	  style.type = 'text/css';

	  if (insertAt === 'top') {
	    if (head.firstChild) {
	      head.insertBefore(style, head.firstChild);
	    } else {
	      head.appendChild(style);
	    }
	  } else {
	    head.appendChild(style);
	  }

	  if (style.styleSheet) {
	    style.styleSheet.cssText = css;
	  } else {
	    style.appendChild(document.createTextNode(css));
	  }
	}

	var css = "body{margin:0}.replayer-wrapper{position:relative}.replayer-mouse{position:absolute;width:20px;height:20px;transition:.05s linear;background-size:contain;background-position:50%;background-repeat:no-repeat;background-image:url(\"data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDUwIDUwIiB4PSIwcHgiIHk9IjBweCI+PHRpdGxlPkRlc2lnbl90bnA8L3RpdGxlPjxwYXRoIGQ9Ik00OC43MSw0Mi45MUwzNC4wOCwyOC4yOSw0NC4zMywxOEExLDEsMCwwLDAsNDQsMTYuMzlMMi4zNSwxLjA2QTEsMSwwLDAsMCwxLjA2LDIuMzVMMTYuMzksNDRhMSwxLDAsMCwwLDEuNjUuMzZMMjguMjksMzQuMDgsNDIuOTEsNDguNzFhMSwxLDAsMCwwLDEuNDEsMGw0LjM4LTQuMzhBMSwxLDAsMCwwLDQ4LjcxLDQyLjkxWm0tNS4wOSwzLjY3TDI5LDMyYTEsMSwwLDAsMC0xLjQxLDBsLTkuODUsOS44NUwzLjY5LDMuNjlsMzguMTIsMTRMMzIsMjcuNThBMSwxLDAsMCwwLDMyLDI5TDQ2LjU5LDQzLjYyWiI+PC9wYXRoPjwvc3ZnPg==\")}.replayer-mouse:after{content:\"\";display:inline-block;width:20px;height:20px;border-radius:10px;background:#4950f6;transform:translate(-10px,-10px);opacity:.3}.replayer-mouse.active:after{animation:a .2s ease-in-out 1}@keyframes a{0%{opacity:.3;width:20px;height:20px;border-radius:10px;transform:translate(-10px,-10px)}50%{opacity:.5;width:10px;height:10px;border-radius:5px;transform:translate(-5px,-5px)}}";
	styleInject(css);

	function inlineCss(cssObj) {
	  let style = '';
	  Object.keys(cssObj).forEach(key => {
	    style += `${key}: ${cssObj[key]};`;
	  });
	  return style;
	}

	function padZero(num, len = 2) {
	  const threshold = Math.pow(10, len - 1);
	  if (num < threshold) {
	    num = String(num);
	    while (String(threshold).length > num.length) {
	      num = '0' + num;
	    }
	  }
	  return num;
	}

	const SECOND = 1000;
	const MINUTE = 60 * SECOND;
	const HOUR = 60 * MINUTE;
	function formatTime(ms) {
	  if (ms <= 0) {
	    return '00:00';
	  }
	  const hour = Math.floor(ms / HOUR);
	  ms = ms % HOUR;
	  const minute = Math.floor(ms / MINUTE);
	  ms = ms % MINUTE;
	  const second = Math.floor(ms / SECOND);
	  if (hour) {
	    return `${padZero(hour)}:${padZero(minute)}:${padZero(second)}`;
	  }
	  return `${padZero(minute)}:${padZero(second)}`;
	}

	function openFullscreen(el) {
	  if (el.requestFullscreen) {
	    return el.requestFullscreen();
	  } else if (el.mozRequestFullScreen) {
	    /* Firefox */
	    return el.mozRequestFullScreen();
	  } else if (el.webkitRequestFullscreen) {
	    /* Chrome, Safari and Opera */
	    return el.webkitRequestFullscreen();
	  } else if (el.msRequestFullscreen) {
	    /* IE/Edge */
	    return el.msRequestFullscreen();
	  }
	}

	function exitFullscreen() {
	  if (document.exitFullscreen) {
	    return document.exitFullscreen();
	  } else if (document.mozExitFullscreen) {
	    /* Firefox */
	    return document.mozExitFullscreen();
	  } else if (document.webkitExitFullscreen) {
	    /* Chrome, Safari and Opera */
	    return document.webkitExitFullscreen();
	  } else if (document.msExitFullscreen) {
	    /* IE/Edge */
	    return document.msExitFullscreen();
	  }
	}

	function isFullscreen() {
	  return (
	    document.fullscreen ||
	    document.webkitIsFullScreen ||
	    document.mozFullScreen ||
	    document.msFullscreenElement
	  );
	}

	function onFullscreenChange(handler) {
	  document.addEventListener('fullscreenchange', handler);
	  document.addEventListener('webkitfullscreenchange', handler);
	  document.addEventListener('mozfullscreenchange', handler);
	  document.addEventListener('MSFullscreenChange', handler);

	  return () => {
	    document.removeEventListener('fullscreenchange', handler);
	    document.removeEventListener('webkitfullscreenchange', handler);
	    document.removeEventListener('mozfullscreenchange', handler);
	    document.removeEventListener('MSFullscreenChange', handler);
	  };
	}

	/* src/components/Switch.html generated by Svelte v2.16.1 */

	const file = "src/components/Switch.html";

	function create_main_fragment(component, ctx) {
		var div, input, text0, label, text1, span, text2, current;

		function input_change_handler() {
			component.set({ checked: input.checked });
		}

		return {
			c: function create() {
				div = createElement("div");
				input = createElement("input");
				text0 = createText("\n  ");
				label = createElement("label");
				text1 = createText(" ");
				span = createElement("span");
				text2 = createText(ctx.label);
				addListener(input, "change", input_change_handler);
				setAttribute(input, "type", "checkbox");
				input.id = ctx.id;
				input.disabled = ctx.disabled;
				input.className = "svelte-a6h7w7";
				addLoc(input, file, 1, 2, 49);
				label.htmlFor = ctx.id;
				label.className = "svelte-a6h7w7";
				addLoc(label, file, 7, 2, 150);
				span.className = "label svelte-a6h7w7";
				addLoc(span, file, 7, 29, 177);
				div.className = "switch svelte-a6h7w7";
				toggleClass(div, "disabled", ctx.disabled);
				addLoc(div, file, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, input);

				input.checked = ctx.checked;

				append(div, text0);
				append(div, label);
				append(div, text1);
				append(div, span);
				append(span, text2);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.checked) input.checked = ctx.checked;
				if (changed.id) {
					input.id = ctx.id;
				}

				if (changed.disabled) {
					input.disabled = ctx.disabled;
				}

				if (changed.id) {
					label.htmlFor = ctx.id;
				}

				if (changed.label) {
					setData(text2, ctx.label);
				}

				if (changed.disabled) {
					toggleClass(div, "disabled", ctx.disabled);
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div);
				}

				removeListener(input, "change", input_change_handler);
			}
		};
	}

	function Switch(options) {
		this._debugName = '<Switch>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this._state = assign({}, options.data);
		if (!('disabled' in this._state)) console.warn("<Switch> was created without expected data property 'disabled'");
		if (!('id' in this._state)) console.warn("<Switch> was created without expected data property 'id'");
		if (!('checked' in this._state)) console.warn("<Switch> was created without expected data property 'checked'");
		if (!('label' in this._state)) console.warn("<Switch> was created without expected data property 'label'");
		this._intro = !!options.intro;

		this._fragment = create_main_fragment(this, this._state);

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);
		}

		this._intro = true;
	}

	assign(Switch.prototype, protoDev);

	Switch.prototype._checkReadOnly = function _checkReadOnly(newState) {
	};

	/* src/Controller.html generated by Svelte v2.16.1 */

	function meta({ replayer }) {
	  return replayer.getMetaData();
	}
	function percentage({ currentTime, meta }) {
	  const percent = Math.min(1, currentTime / meta.totalTime);
	  return `${100 * percent}%`;
	}
	function data() {
	  return {
	    currentTime: 0,
	    isPlaying: false,
	    isSkipping: false,
	    skipInactive: true,
	    speed: 1,
	  };
	}
	var methods = {
	  loopTimer() {
	    const self = this;

	    function update() {
	      const { meta, isPlaying, replayer } = self.get();
	      if (!isPlaying) {
	        self.timer = null;
	        return;
	      }

	      const currentTime =
	        replayer.timer.timeOffset + replayer.getTimeOffset();
	      self.set({
	        currentTime,
	      });

	      if (currentTime < meta.totalTime) {
	        requestAnimationFrame(update);
	      }
	    }

	    this.timer = requestAnimationFrame(update);
	  },
	  play() {
	    const { replayer, currentTime } = this.get();
	    if (currentTime > 0) {
	      replayer.resume(currentTime);
	    } else {
	      this.set({ isPlaying: true });
	      replayer.play(currentTime);
	    }
	  },
	  pause() {
	    const { replayer } = this.get();
	    replayer.pause();
	  },
	  toggle() {
	    const { isPlaying } = this.get();
	    if (isPlaying) {
	      this.pause();
	    } else {
	      this.play();
	    }
	  },
	  setSpeed(speed) {
	    const { replayer, currentTime, isPlaying } = this.get();
	    // freeze before set speed, and resume if is playing before freeze
	    replayer.pause();
	    replayer.setConfig({ speed });
	    this.set({ speed });
	    if (isPlaying) {
	      replayer.resume(currentTime);
	    }
	  },
	  handleProgressClick(event) {
	    const { meta, replayer, isPlaying, isSkipping } = this.get();
	    if (isSkipping) {
	      return;
	    }
	    const progressRect = this.refs.progress.getBoundingClientRect();
	    const x = event.clientX - progressRect.left;
	    let percent = x / progressRect.width;
	    if (percent < 0) {
	      percent = 0;
	    } else if (percent > 1) {
	      percent = 1;
	    }
	    const timeOffset = meta.totalTime * percent;
	    this.set({ currentTime: timeOffset });
	    replayer.play(timeOffset);
	    if (!isPlaying) {
	      replayer.pause();
	    }
	  },
	};

	function ondestroy() {
	  const { isPlaying } = this.get();
	  if (isPlaying) {
	    this.pause();
	  }
	}
	function onupdate({ changed, current, previous }) {
	  if (current.replayer && !previous) {
	    window.replayer = current.replayer;
	    setTimeout(() => {
	      this.set({ isPlaying: true });
	    }, 0);
	    current.replayer.play(0);
	    if (!current.autoPlay) {
	      let firstFullSnapshotRebuilded = false;
	      current.replayer.on('fullsnapshot-rebuilded', () => {
	        if (!firstFullSnapshotRebuilded) {
	          firstFullSnapshotRebuilded = true;
	          current.replayer.pause();
	        }
	      });
	    }
	    current.replayer.on('pause', () => {
	      this.set({ isPlaying: false });
	    });
	    current.replayer.on('resume', () => {
	      this.set({ isPlaying: true });
	    });
	    current.replayer.on('finish', () => {
	      this.timer = null;
	      this.set({ isPlaying: false, currentTime: 0 });
	    });
	    current.replayer.on('skip-start', payload => {
	      payload.isSkipping = true;
	      this.set(payload);
	    });
	    current.replayer.on('skip-end', payload => {
	      payload.isSkipping = false;
	      this.set(payload);
	    });
	  }
	  if (changed.isPlaying) {
	    if (current.isPlaying && !this.timer) {
	      this.loopTimer();
	    }
	  }
	  if (changed.skipInactive) {
	    current.replayer.setConfig({ skipInactive: current.skipInactive });
	  }
	}
	const file$1 = "src/Controller.html";

	function click_handler(event) {
		const { component, ctx } = this._svelte;

		component.setSpeed(ctx.s);
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.s = list[i];
		return child_ctx;
	}

	function create_main_fragment$1(component, ctx) {
		var if_block_anchor, current;

		var if_block = (ctx.showController) && create_if_block(component, ctx);

		return {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = createComment();
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.showController) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(component, ctx);
						if (if_block) if_block.c();
					}

					if_block.i(if_block_anchor.parentNode, if_block_anchor);
				} else if (if_block) {
					if_block.o(function() {
						if_block.d(1);
						if_block = null;
					});
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (if_block) if_block.o(outrocallback);
				else outrocallback();

				current = false;
			},

			d: function destroy$$1(detach) {
				if (if_block) if_block.d(detach);
				if (detach) {
					detachNode(if_block_anchor);
				}
			}
		};
	}

	// (1:0) {#if showController}
	function create_if_block(component, ctx) {
		var div5, div3, span0, text0_value = formatTime(ctx.currentTime), text0, text1, div2, div0, text2, div1, text3, span1, text4_value = formatTime(ctx.meta.totalTime), text4, text5, div4, button0, text6, text7, switch_1_updating = {}, text8, button1, svg, defs, style, path, current;

		function click_handler(event) {
			component.handleProgressClick(event);
		}

		function select_block_type(ctx) {
			if (ctx.isPlaying) return create_if_block_1;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block = current_block_type(component, ctx);

		function click_handler_1(event) {
			component.toggle();
		}

		var each_value = [1, 2, 4, 8];

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(component, get_each_context(ctx, each_value, i));
		}

		var switch_1_initial_data = {
		 	id: "skip",
		 	disabled: ctx.isSkipping,
		 	label: "skip inactive"
		 };
		if (ctx.skipInactive !== void 0) {
			switch_1_initial_data.checked = ctx.skipInactive;
			switch_1_updating.checked = true;
		}
		var switch_1 = new Switch({
			root: component.root,
			store: component.store,
			data: switch_1_initial_data,
			_bind(changed, childState) {
				var newState = {};
				if (!switch_1_updating.checked && changed.checked) {
					newState.skipInactive = childState.checked;
				}
				component._set(newState);
				switch_1_updating = {};
			}
		});

		component.root._beforecreate.push(() => {
			switch_1._bind({ checked: 1 }, switch_1.get());
		});

		function click_handler_2(event) {
			component.fire('fullscreen');
		}

		return {
			c: function create() {
				div5 = createElement("div");
				div3 = createElement("div");
				span0 = createElement("span");
				text0 = createText(text0_value);
				text1 = createText("\n    ");
				div2 = createElement("div");
				div0 = createElement("div");
				text2 = createText("\n      ");
				div1 = createElement("div");
				text3 = createText("\n    ");
				span1 = createElement("span");
				text4 = createText(text4_value);
				text5 = createText("\n  ");
				div4 = createElement("div");
				button0 = createElement("button");
				if_block.c();
				text6 = createText("\n    ");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				text7 = createText("\n    ");
				switch_1._fragment.c();
				text8 = createText("\n    ");
				button1 = createElement("button");
				svg = createSvgElement("svg");
				defs = createSvgElement("defs");
				style = createSvgElement("style");
				path = createSvgElement("path");
				span0.className = "rr-timeline__time svelte-1cgfpn0";
				addLoc(span0, file$1, 3, 4, 81);
				div0.className = "rr-progress__step svelte-1cgfpn0";
				setStyle(div0, "width", ctx.percentage);
				addLoc(div0, file$1, 9, 6, 284);
				div1.className = "rr-progress__handler svelte-1cgfpn0";
				setStyle(div1, "left", ctx.percentage);
				addLoc(div1, file$1, 10, 6, 365);
				addListener(div2, "click", click_handler);
				div2.className = "rr-progress svelte-1cgfpn0";
				toggleClass(div2, "disabled", ctx.isSkipping);
				addLoc(div2, file$1, 4, 4, 150);
				span1.className = "rr-timeline__time svelte-1cgfpn0";
				addLoc(span1, file$1, 16, 4, 491);
				div3.className = "rr-timeline svelte-1cgfpn0";
				addLoc(div3, file$1, 2, 2, 51);
				addListener(button0, "click", click_handler_1);
				button0.className = "svelte-1cgfpn0";
				addLoc(button0, file$1, 19, 4, 608);
				setAttribute(style, "type", "text/css");
				addLoc(style, file$1, 69, 14, 2735);
				addLoc(defs, file$1, 69, 8, 2729);
				setAttribute(path, "d", "M916 380c-26.4 0-48-21.6-48-48L868 223.2 613.6 477.6c-18.4 18.4-48.8 18.4-68 0-18.4-18.4-18.4-48.8 0-68L800 156 692 156c-26.4 0-48-21.6-48-48 0-26.4 21.6-48 48-48l224 0c26.4 0 48 21.6 48 48l0 224C964 358.4 942.4 380 916 380zM231.2 860l108.8 0c26.4 0 48 21.6 48 48s-21.6 48-48 48l-224 0c-26.4 0-48-21.6-48-48l0-224c0-26.4 21.6-48 48-48 26.4 0 48 21.6 48 48L164 792l253.6-253.6c18.4-18.4 48.8-18.4 68 0 18.4 18.4 18.4 48.8 0 68L231.2 860z");
				setAttribute(path, "p-id", "1286");
				addLoc(path, file$1, 70, 8, 2782);
				setAttribute(svg, "class", "icon");
				setAttribute(svg, "viewBox", "0 0 1024 1024");
				setAttribute(svg, "version", "1.1");
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
				setAttribute(svg, "width", "16");
				setAttribute(svg, "height", "16");
				addLoc(svg, file$1, 61, 6, 2508);
				addListener(button1, "click", click_handler_2);
				button1.className = "svelte-1cgfpn0";
				addLoc(button1, file$1, 60, 4, 2463);
				div4.className = "rr-controller__btns svelte-1cgfpn0";
				addLoc(div4, file$1, 18, 2, 570);
				div5.className = "rr-controller svelte-1cgfpn0";
				addLoc(div5, file$1, 1, 0, 21);
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, div3);
				append(div3, span0);
				append(span0, text0);
				append(div3, text1);
				append(div3, div2);
				append(div2, div0);
				component.refs.step = div0;
				append(div2, text2);
				append(div2, div1);
				component.refs.handler = div1;
				component.refs.progress = div2;
				append(div3, text3);
				append(div3, span1);
				append(span1, text4);
				append(div5, text5);
				append(div5, div4);
				append(div4, button0);
				if_block.m(button0, null);
				append(div4, text6);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div4, null);
				}

				append(div4, text7);
				switch_1._mount(div4, null);
				append(div4, text8);
				append(div4, button1);
				append(button1, svg);
				append(svg, defs);
				append(defs, style);
				append(svg, path);
				current = true;
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				if ((!current || changed.currentTime) && text0_value !== (text0_value = formatTime(ctx.currentTime))) {
					setData(text0, text0_value);
				}

				if (!current || changed.percentage) {
					setStyle(div0, "width", ctx.percentage);
					setStyle(div1, "left", ctx.percentage);
				}

				if (changed.isSkipping) {
					toggleClass(div2, "disabled", ctx.isSkipping);
				}

				if ((!current || changed.meta) && text4_value !== (text4_value = formatTime(ctx.meta.totalTime))) {
					setData(text4, text4_value);
				}

				if (current_block_type !== (current_block_type = select_block_type(ctx))) {
					if_block.d(1);
					if_block = current_block_type(component, ctx);
					if_block.c();
					if_block.m(button0, null);
				}

				if (changed.isSkipping || changed.speed) {
					each_value = [1, 2, 4, 8];

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div4, text7);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				var switch_1_changes = {};
				if (changed.isSkipping) switch_1_changes.disabled = ctx.isSkipping;
				if (!switch_1_updating.checked && changed.skipInactive) {
					switch_1_changes.checked = ctx.skipInactive;
					switch_1_updating.checked = ctx.skipInactive !== void 0;
				}
				switch_1._set(switch_1_changes);
				switch_1_updating = {};
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (switch_1) switch_1._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div5);
				}

				if (component.refs.step === div0) component.refs.step = null;
				if (component.refs.handler === div1) component.refs.handler = null;
				removeListener(div2, "click", click_handler);
				if (component.refs.progress === div2) component.refs.progress = null;
				if_block.d();
				removeListener(button0, "click", click_handler_1);

				destroyEach(each_blocks, detach);

				switch_1.destroy();
				removeListener(button1, "click", click_handler_2);
			}
		};
	}

	// (35:6) {:else}
	function create_else_block(component, ctx) {
		var svg, path;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path = createSvgElement("path");
				setAttribute(path, "d", "M170.65984 896l0-768 640 384zM644.66944 512l-388.66944-233.32864 0 466.65728z");
				addLoc(path, file$1, 44, 8, 2014);
				setAttribute(svg, "class", "icon");
				setAttribute(svg, "viewBox", "0 0 1024 1024");
				setAttribute(svg, "version", "1.1");
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
				setAttribute(svg, "width", "16");
				setAttribute(svg, "height", "16");
				addLoc(svg, file$1, 35, 6, 1785);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}
			}
		};
	}

	// (21:6) {#if isPlaying}
	function create_if_block_1(component, ctx) {
		var svg, path;

		return {
			c: function create() {
				svg = createSvgElement("svg");
				path = createSvgElement("path");
				setAttribute(path, "d", "M682.65984 128q53.00224 0 90.50112 37.49888t37.49888 90.50112l0 512q0 53.00224-37.49888 90.50112t-90.50112 37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224 37.49888-90.50112t90.50112-37.49888zM341.34016 128q53.00224 0 90.50112 37.49888t37.49888 90.50112l0 512q0 53.00224-37.49888 90.50112t-90.50112 37.49888-90.50112-37.49888-37.49888-90.50112l0-512q0-53.00224 37.49888-90.50112t90.50112-37.49888zM341.34016 213.34016q-17.67424 0-30.16704 12.4928t-12.4928 30.16704l0 512q0 17.67424 12.4928 30.16704t30.16704 12.4928 30.16704-12.4928 12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928zM682.65984 213.34016q-17.67424 0-30.16704 12.4928t-12.4928 30.16704l0 512q0 17.67424 12.4928 30.16704t30.16704 12.4928 30.16704-12.4928 12.4928-30.16704l0-512q0-17.67424-12.4928-30.16704t-30.16704-12.4928z");
				addLoc(path, file$1, 30, 8, 894);
				setAttribute(svg, "class", "icon");
				setAttribute(svg, "viewBox", "0 0 1024 1024");
				setAttribute(svg, "version", "1.1");
				setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
				setAttribute(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
				setAttribute(svg, "width", "16");
				setAttribute(svg, "height", "16");
				addLoc(svg, file$1, 21, 6, 665);
			},

			m: function mount(target, anchor) {
				insert(target, svg, anchor);
				append(svg, path);
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(svg);
				}
			}
		};
	}

	// (51:4) {#each [1, 2, 4, 8] as s}
	function create_each_block(component, ctx) {
		var button, text0, text1;

		return {
			c: function create() {
				button = createElement("button");
				text0 = createText(ctx.s);
				text1 = createText("x");
				button._svelte = { component, ctx };

				addListener(button, "click", click_handler);
				button.disabled = ctx.isSkipping;
				button.className = "svelte-1cgfpn0";
				toggleClass(button, "active", ctx.s === ctx.speed && !ctx.isSkipping);
				addLoc(button, file$1, 51, 4, 2202);
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);
				append(button, text0);
				append(button, text1);
			},

			p: function update(changed, _ctx) {
				ctx = _ctx;
				button._svelte.ctx = ctx;
				if (changed.isSkipping) {
					button.disabled = ctx.isSkipping;
				}

				if ((changed.speed || changed.isSkipping)) {
					toggleClass(button, "active", ctx.s === ctx.speed && !ctx.isSkipping);
				}
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(button);
				}

				removeListener(button, "click", click_handler);
			}
		};
	}

	function Controller(options) {
		this._debugName = '<Controller>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data(), options.data);

		this._recompute({ replayer: 1, currentTime: 1, meta: 1 }, this._state);
		if (!('replayer' in this._state)) console.warn("<Controller> was created without expected data property 'replayer'");
		if (!('currentTime' in this._state)) console.warn("<Controller> was created without expected data property 'currentTime'");

		if (!('showController' in this._state)) console.warn("<Controller> was created without expected data property 'showController'");
		if (!('isSkipping' in this._state)) console.warn("<Controller> was created without expected data property 'isSkipping'");

		if (!('isPlaying' in this._state)) console.warn("<Controller> was created without expected data property 'isPlaying'");
		if (!('speed' in this._state)) console.warn("<Controller> was created without expected data property 'speed'");
		if (!('skipInactive' in this._state)) console.warn("<Controller> was created without expected data property 'skipInactive'");
		this._intro = !!options.intro;
		this._handlers.update = [onupdate];

		this._handlers.destroy = [ondestroy];

		this._fragment = create_main_fragment$1(this, this._state);

		this.root._oncreate.push(() => {
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Controller.prototype, protoDev);
	assign(Controller.prototype, methods);

	Controller.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('meta' in newState && !this._updatingReadonlyProperty) throw new Error("<Controller>: Cannot set read-only property 'meta'");
		if ('percentage' in newState && !this._updatingReadonlyProperty) throw new Error("<Controller>: Cannot set read-only property 'percentage'");
	};

	Controller.prototype._recompute = function _recompute(changed, state) {
		if (changed.replayer) {
			if (this._differs(state.meta, (state.meta = meta(state)))) changed.meta = true;
		}

		if (changed.currentTime || changed.meta) {
			if (this._differs(state.percentage, (state.percentage = percentage(state)))) changed.percentage = true;
		}
	};

	/* src/Player.html generated by Svelte v2.16.1 */



	const controllerHeight = 80;

	function style({ width, height }) {
	  return inlineCss({
	    width: `${width}px`,
	    height: `${height}px`,
	  });
	}
	function playerStyle({ width, height }) {
	  return inlineCss({
	    width: `${width}px`,
	    height: `${height + controllerHeight}px`,
	  });
	}
	function data$1() {
	  return {
	    showController: true,
	    width: 1024,
	    height: 576,
	    events: [],
	    autoPlay: true,
	    replayer: null,
	  };
	}
	var methods$1 = {
	  updateScale(el, frameDimension) {
	    const { width, height } = this.get();
	    const widthScale = width / frameDimension.width;
	    const heightScale = height / frameDimension.height;
	    el.style.transform =
	      `scale(${Math.min(widthScale, heightScale, 1)})` +
	      'translate(-50%, -50%)';
	  },
	  fullscreen() {
	    if (this.refs.player) {
	      isFullscreen() ? exitFullscreen() : openFullscreen(this.refs.player);
	    }
	  },
	  addEventListener(event, handler) {
	    const { replayer } = this.get();
	    replayer.on(event, handler);
	  },
	  addEvent(event) {
	    replayer.addEvent(event);
	  },
	  addBufferedEvents(events) {
	    replayer.convertBufferedEventsToActionsAndAddToTimer(events);
	  }
	};

	function oncreate() {
	  const { events } = this.get();
	  let replayer = this.get().replayer || new Replayer(events, {
	    speed: 1,
	    root: this.refs.frame,
	    skipInactive: true,
	    showWarning: true,
	  });
	  replayer.on('resize', (dimension) =>
	    this.updateScale(replayer.wrapper, dimension)
	  );
	  this.set({
	    replayer,
	  });
	  this.fullscreenListener = onFullscreenChange(() => {
	    if (isFullscreen()) {
	      setTimeout(() => {
	        const { width, height } = this.get();
	        // store the original dimension which do not need to be reactive
	        this._width = width;
	        this._height = height;
	        const dimension = {
	          width: document.body.offsetWidth,
	          height: document.body.offsetHeight - controllerHeight,
	        };
	        this.set(dimension);
	        this.updateScale(replayer.wrapper, {
	          width: replayer.iframe.offsetWidth,
	          height: replayer.iframe.offsetHeight,
	        });
	      }, 0);
	    } else {
	      this.set({
	        width: this._width,
	        height: this._height,
	      });
	      this.updateScale(replayer.wrapper, {
	        width: replayer.iframe.offsetWidth,
	        height: replayer.iframe.offsetHeight,
	      });
	    }
	  });
	}
	function ondestroy$1() {
	  if (this.fullscreenListener) {
	    this.fullscreenListener();
	  }
	}
	const file$2 = "src/Player.html";

	function create_main_fragment$2(component, ctx) {
		var div1, div0, text, current;

		var if_block = (ctx.replayer) && create_if_block$1(component, ctx);

		return {
			c: function create() {
				div1 = createElement("div");
				div0 = createElement("div");
				text = createText("\n  ");
				if (if_block) if_block.c();
				div0.className = "rr-player__frame svelte-1wetjm2";
				div0.style.cssText = ctx.style;
				addLoc(div0, file$2, 1, 2, 59);
				div1.className = "rr-player svelte-1wetjm2";
				div1.style.cssText = ctx.playerStyle;
				addLoc(div1, file$2, 0, 0, 0);
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				component.refs.frame = div0;
				append(div1, text);
				if (if_block) if_block.m(div1, null);
				component.refs.player = div1;
				current = true;
			},

			p: function update(changed, ctx) {
				if (!current || changed.style) {
					div0.style.cssText = ctx.style;
				}

				if (ctx.replayer) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block$1(component, ctx);
						if (if_block) if_block.c();
					}

					if_block.i(div1, null);
				} else if (if_block) {
					if_block.o(function() {
						if_block.d(1);
						if_block = null;
					});
				}

				if (!current || changed.playerStyle) {
					div1.style.cssText = ctx.playerStyle;
				}
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (if_block) if_block.o(outrocallback);
				else outrocallback();

				current = false;
			},

			d: function destroy$$1(detach) {
				if (detach) {
					detachNode(div1);
				}

				if (component.refs.frame === div0) component.refs.frame = null;
				if (if_block) if_block.d();
				if (component.refs.player === div1) component.refs.player = null;
			}
		};
	}

	// (3:2) {#if replayer}
	function create_if_block$1(component, ctx) {
		var current;

		var controller_initial_data = {
		 	replayer: ctx.replayer,
		 	showController: ctx.showController,
		 	autoPlay: ctx.autoPlay
		 };
		var controller = new Controller({
			root: component.root,
			store: component.store,
			data: controller_initial_data
		});

		controller.on("fullscreen", function(event) {
			component.fullscreen();
		});

		return {
			c: function create() {
				controller._fragment.c();
			},

			m: function mount(target, anchor) {
				controller._mount(target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var controller_changes = {};
				if (changed.replayer) controller_changes.replayer = ctx.replayer;
				if (changed.showController) controller_changes.showController = ctx.showController;
				if (changed.autoPlay) controller_changes.autoPlay = ctx.autoPlay;
				controller._set(controller_changes);
			},

			i: function intro(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: function outro(outrocallback) {
				if (!current) return;

				if (controller) controller._fragment.o(outrocallback);
				current = false;
			},

			d: function destroy$$1(detach) {
				controller.destroy(detach);
			}
		};
	}

	function Player(options) {
		this._debugName = '<Player>';
		if (!options || (!options.target && !options.root)) {
			throw new Error("'target' is a required option");
		}

		init(this, options);
		this.refs = {};
		this._state = assign(data$1(), options.data);

		this._recompute({ width: 1, height: 1 }, this._state);
		if (!('width' in this._state)) console.warn("<Player> was created without expected data property 'width'");
		if (!('height' in this._state)) console.warn("<Player> was created without expected data property 'height'");


		if (!('replayer' in this._state)) console.warn("<Player> was created without expected data property 'replayer'");
		if (!('showController' in this._state)) console.warn("<Player> was created without expected data property 'showController'");
		if (!('autoPlay' in this._state)) console.warn("<Player> was created without expected data property 'autoPlay'");
		this._intro = !!options.intro;

		this._handlers.destroy = [ondestroy$1];

		this._fragment = create_main_fragment$2(this, this._state);

		this.root._oncreate.push(() => {
			oncreate.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			if (options.hydrate) throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(Player.prototype, protoDev);
	assign(Player.prototype, methods$1);

	Player.prototype._checkReadOnly = function _checkReadOnly(newState) {
		if ('style' in newState && !this._updatingReadonlyProperty) throw new Error("<Player>: Cannot set read-only property 'style'");
		if ('playerStyle' in newState && !this._updatingReadonlyProperty) throw new Error("<Player>: Cannot set read-only property 'playerStyle'");
	};

	Player.prototype._recompute = function _recompute(changed, state) {
		if (changed.width || changed.height) {
			if (this._differs(state.style, (state.style = style(state)))) changed.style = true;
			if (this._differs(state.playerStyle, (state.playerStyle = playerStyle(state)))) changed.playerStyle = true;
		}
	};

	return Player;

}());
