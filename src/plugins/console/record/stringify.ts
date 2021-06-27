// tslint:disable:no-any no-bitwise forin
/**
 * this file is used to serialize log message to string
 *
 */

import { StringifyOptions } from './index';

/**
 * transfer the node path in Event to string
 * @param node the first node in a node path array
 */
function pathToSelector(node: HTMLElement): string | '' {
  if (!node || !node.outerHTML) {
    return '';
  }

  let path = '';
  while (node.parentElement) {
    let name = node.localName;
    if (!name) {
      break;
    }
    name = name.toLowerCase();
    let parent = node.parentElement;

    let domSiblings = [];

    if (parent.children && parent.children.length > 0) {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < parent.children.length; i++) {
        let sibling = parent.children[i];
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

/**
 * stringify any js object
 * @param obj the object to stringify
 */
export function stringify(
  obj: any,
  stringifyOptions?: StringifyOptions,
): string {
  const options: StringifyOptions = {
    numOfKeysLimit: 50,
  };
  Object.assign(options, stringifyOptions);
  const stack: any[] = [];
  const keys: any[] = [];
  return JSON.stringify(obj, function (key, value) {
    /**
     * forked from https://github.com/moll/json-stringify-safe/blob/master/stringify.js
     * to deCycle the object
     */
    if (stack.length > 0) {
      const thisPos = stack.indexOf(this);
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
      if (~stack.indexOf(value)) {
        if (stack[0] === value) {
          value = '[Circular ~]';
        } else {
          value =
            '[Circular ~.' +
            keys.slice(0, stack.indexOf(value)).join('.') +
            ']';
        }
      }
    } else {
      stack.push(value);
    }
    /* END of the FORK */

    if (value === null || value === undefined) {
      return value;
    }
    if (shouldToString(value)) {
      return toString(value);
    }
    if (value instanceof Event) {
      const eventResult: any = {};
      for (const eventKey in value) {
        const eventValue = (value as any)[eventKey];
        if (Array.isArray(eventValue)) {
          eventResult[eventKey] = pathToSelector(
            eventValue.length ? eventValue[0] : null,
          );
        } else {
          eventResult[eventKey] = eventValue;
        }
      }
      return eventResult;
    } else if (value instanceof Node) {
      if (value instanceof HTMLElement) {
        return value ? value.outerHTML : '';
      }
      return value.nodeName;
    }
    return value;
  });

  /**
   * whether we should call toString function of this object
   */
  function shouldToString(_obj: object): boolean {
    if (
      typeof _obj === 'object' &&
      Object.keys(_obj).length > options.numOfKeysLimit
    ) {
      return true;
    }
    if (typeof _obj === 'function') {
      return true;
    }
    return false;
  }

  /**
   * limit the toString() result according to option
   */
  function toString(_obj: object): string {
    let str = _obj.toString();
    if (options.stringLengthLimit && str.length > options.stringLengthLimit) {
      str = `${str.slice(0, options.stringLengthLimit)}...`;
    }
    return str;
  }
}
