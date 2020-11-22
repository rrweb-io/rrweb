// @ts-nocheck
// tslint:disable
function pathToSelector(node: Node) {
  if (!node || !node.outerHTML) {
    return null;
  }

  var path;
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

export function stringify(o) {
  return JSON.stringify(o, (_, o) => {
    if (o instanceof Event) {
      const value = {};
      for (const key in o) {
        if (Array.isArray(o[key])) value[key] = pathToSelector(o[key]);
        else value[key] = o[key];
      }
      return value;
    } else if (o instanceof Node) {
      return o ? o.outerHTML : '';
    } else if (o instanceof Window) return o.toString();
    return o;
  });
}
