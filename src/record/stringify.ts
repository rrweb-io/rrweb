/**
 * this file is used to serialize log message to string
 *
 */

/**
 * transfer the node path in Event to string
 * @param node the first node in a node path array
 */
function pathToSelector(node: HTMLElement): string | '' {
  if (!node || !node.outerHTML) {
    return '';
  }

  var path = '';
  while (node.parentElement) {
    var name = node.localName;
    if (!name) break;
    name = name.toLowerCase();
    var parent = node.parentElement;

    var domSiblings = [];

    if (parent.children && parent.children.length > 0) {
      for (var i = 0; i < parent.children.length; i++) {
        var sibling = parent.children[i];
        if (sibling.localName && sibling.localName.toLowerCase) {
          if (sibling.localName.toLowerCase() === name) {
            domSiblings.push(sibling);
          }
        }
      }
    }

    if (domSiblings.length > 1) {
      name += ':eq(' + domSiblings.indexOf(node) + ')';
    }
    path = name + (path ? '>' + path : '');
    node = parent;
  }

  return path;
}

export function stringify(o: unknown) {
  return JSON.stringify(o, (_, o) => {
    if (o === null || o === undefined) return o;
    if (o instanceof Event) {
      const value: any = {};
      for (const key in o) {
        const v = (o as any)[key];
        if (Array.isArray(v))
          value[key] = pathToSelector(v.length ? v[0] : null);
        else value[key] = v;
      }
      return value;
    } else if (o instanceof Node) {
      if (o instanceof HTMLElement) return o ? o.outerHTML : '';
      return o.nodeName;
    } else if (o instanceof Object && Object.keys(o).length > 50)
      return o.toString();
    return o;
  });
}
