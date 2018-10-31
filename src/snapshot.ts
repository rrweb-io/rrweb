import {
  serializedNode,
  serializedNodeWithId,
  NodeType,
  attributes,
  INode,
  idNodeMap,
} from './types';

let _id = 1;

function genId(): number {
  return _id++;
}

export function resetId() {
  _id = 1;
}

const CSS_RULE = /(([#|\.]{0,1}[a-z0-9\[\]=:]+[\s|,]*)+)\s(\{[\s\S]?[^}]*})/;
const CSS_RULE_GLOBAL = /(([#|\.]{0,1}[a-z0-9\[\]=:]+[\s|,]*)+)\s(\{[\s\S]?[^}]*})/g;
const HOVER_SELECTOR = /([^\\]):hover/g;
export function addHoverClass(cssText: string): string {
  const matches = cssText.match(CSS_RULE_GLOBAL) || [];
  for (const match of matches) {
    const [, selectorText = '', , rules = ''] = match.match(CSS_RULE) || [];
    const selectors = selectorText
      .split(',')
      .map(selector => selector.trim())
      .map(selector => {
        if (HOVER_SELECTOR.test(selector)) {
          const newSelector = selector.replace(HOVER_SELECTOR, '$1.\\:hover');
          selector += `, ${newSelector}`;
        }
        return selector;
      });
    cssText = cssText.replace(match, selectors.join(', ') + ' ' + rules);
  }
  return cssText;
}

function getCssRulesString(s: CSSStyleSheet): string | null {
  try {
    const rules = s.rules || s.cssRules;
    return rules
      ? Array.from(rules).reduce(
          (prev, cur) => (prev += addHoverClass(cur.cssText)),
          '',
        )
      : null;
  } catch (error) {
    return null;
  }
}

function extractOrigin(url: string): string {
  let origin;
  if (url.indexOf('//') > -1) {
    origin = url
      .split('/')
      .slice(0, 3)
      .join('/');
  } else {
    origin = url.split('/')[0];
  }
  origin = origin.split('?')[0];
  return origin;
}

const URL_IN_CSS_REF = /url\((['"])([^'"]*)\1\)/gm;
export function absoluteToStylesheet(cssText: string, href: string): string {
  return cssText.replace(URL_IN_CSS_REF, (_1, _2, filePath) => {
    if (!/^[./]/.test(filePath)) {
      return `url('${filePath}')`;
    }
    if (filePath[0] === '/') {
      return `url('${extractOrigin(href) + filePath}')`;
    }
    const stack = href.split('/');
    const parts = filePath.split('/');
    stack.pop();
    for (const part of parts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return `url('${stack.join('/')}')`;
  });
}

const RELATIVE_PATH = /^(\.\.|\.|)\//;
function absoluteToDoc(doc: Document, attributeValue: string): string {
  if (!RELATIVE_PATH.test(attributeValue)) {
    return attributeValue;
  }
  const a: HTMLAnchorElement = doc.createElement('a');
  a.href = attributeValue;
  return a.href;
}

function serializeNode(n: Node, doc: Document): serializedNode | false {
  switch (n.nodeType) {
    case n.DOCUMENT_NODE:
      return {
        type: NodeType.Document,
        childNodes: [],
      };
    case n.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType.DocumentType,
        name: (n as DocumentType).name,
        publicId: (n as DocumentType).publicId,
        systemId: (n as DocumentType).systemId,
      };
    case n.ELEMENT_NODE:
      const tagName = (n as HTMLElement).tagName.toLowerCase();
      let attributes: attributes = {};
      for (const { name, value } of Array.from((n as HTMLElement).attributes)) {
        // relative path in attribute
        if (name === 'src' || name === 'href') {
          attributes[name] = absoluteToDoc(doc, value);
        } else {
          attributes[name] = value;
        }
      }
      // remote css
      if (tagName === 'link') {
        const stylesheet = Array.from(doc.styleSheets).find(s => {
          return s.href === (n as HTMLLinkElement).href;
        });
        const cssText = getCssRulesString(stylesheet as CSSStyleSheet);
        if (cssText) {
          attributes = {
            _cssText: absoluteToStylesheet(cssText, stylesheet!.href!),
          };
        }
      }
      // form fields
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
      ) {
        const value = (n as HTMLInputElement | HTMLTextAreaElement).value;
        if (
          attributes.type !== 'radio' &&
          attributes.type !== 'checkbox' &&
          value
        ) {
          attributes.value = value;
        } else if ((n as HTMLInputElement).checked) {
          attributes.checked = (n as HTMLInputElement).checked;
        }
      }
      if (tagName === 'option') {
        const selectValue = (n as HTMLOptionElement).parentElement;
        if (attributes.value === (selectValue as HTMLSelectElement).value) {
          attributes.selected = (n as HTMLOptionElement).selected;
        }
      }
      return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
      };
    case n.TEXT_NODE:
      // The parent node may not be a html element which has a tagName attribute.
      // So just let it be undefined which is ok in this use case.
      const parentTagName =
        n.parentNode && (n.parentNode as HTMLElement).tagName;
      let textContent = (n as Text).textContent;
      if (parentTagName === 'SCRIPT') {
        textContent = 'SCRIPT_PLACEHOLDER';
      }
      if (parentTagName === 'STYLE') {
        textContent = addHoverClass(textContent || '');
      }
      return {
        type: NodeType.Text,
        textContent: textContent || '',
      };
    case n.CDATA_SECTION_NODE:
      return {
        type: NodeType.CDATA,
        textContent: '',
      };
    case n.COMMENT_NODE:
      return {
        type: NodeType.Comment,
        textContent: (n as Comment).textContent || '',
      };
    default:
      return false;
  }
}

export function serializeNodeWithId(
  n: Node,
  doc: Document,
  map: idNodeMap,
  skipChild = false,
): serializedNodeWithId | null {
  const _serializedNode = serializeNode(n, doc);
  if (!_serializedNode) {
    // TODO: dev only
    console.warn(n, 'not serialized');
    return null;
  }
  const serializedNode = Object.assign(_serializedNode, {
    id: genId(),
  });
  (n as INode).__sn = serializedNode;
  map[serializedNode.id] = n as INode;
  if (
    (serializedNode.type === NodeType.Document ||
      serializedNode.type === NodeType.Element) &&
    !skipChild
  ) {
    for (const childN of Array.from(n.childNodes)) {
      const serializedChildNode = serializeNodeWithId(childN, doc, map);
      if (serializedChildNode) {
        serializedNode.childNodes.push(serializedChildNode);
      }
    }
  }
  return serializedNode;
}

function snapshot(n: Document): [serializedNodeWithId | null, idNodeMap] {
  resetId();
  const idNodeMap: idNodeMap = {};
  return [serializeNodeWithId(n, n, idNodeMap), idNodeMap];
}

export default snapshot;
