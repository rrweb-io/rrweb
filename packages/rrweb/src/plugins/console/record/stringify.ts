// tslint:disable:no-any no-bitwise forin
/**
 * this file is used to serialize log message to string
 *
 */

import type { StringifyOptions } from './index';

/**
 * transfer the node path in Event to string
 * @param node - the first node in a node path array
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
    const parent = node.parentElement;

    const domSiblings = [];

    if (parent.children && parent.children.length > 0) {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < parent.children.length; i++) {
        const sibling = parent.children[i];
        if (sibling.localName && sibling.localName.toLowerCase) {
          if (sibling.localName.toLowerCase() === name) {
            domSiblings.push(sibling);
          }
        }
      }
    }

    if (domSiblings.length > 1) {
      name += `:eq(${domSiblings.indexOf(node)})`;
    }
    path = name + (path ? '>' + path : '');
    node = parent;
  }

  return path;
}

/**
 * judge is object
 */
function isObject(obj: unknown): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * judge the object's depth
 */
function isObjTooDeep(obj: Record<string, unknown>, limit: number): boolean {
  if (limit === 0) {
    return true;
  }

  const keys = Object.keys(obj);
  for (const key of keys) {
    if (
      isObject(obj[key]) &&
      isObjTooDeep(obj[key] as Record<string, unknown>, limit - 1)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * stringify any js object
 * @param obj - the object to stringify
 */
export function stringify(
  obj: unknown,
  stringifyOptions?: StringifyOptions,
): string {
  const options: StringifyOptions = {
    numOfKeysLimit: 50,
    depthOfLimit: 4,
  };
  Object.assign(options, stringifyOptions);
  const stack: unknown[] = [];
  const keys: unknown[] = [];
  return JSON.stringify(
    obj,
    function (key, value: string | object | null | undefined) {
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

      if (value === null) return value;
      if (value === undefined) return 'undefined';
      if (shouldIgnore(value as object)) {
        return toString(value as object);
      }
      if (value instanceof Event) {
        const eventResult: Record<string, unknown> = {};
        for (const eventKey in value) {
          const eventValue = ((value as unknown) as Record<string, unknown>)[
            eventKey
          ];
          if (Array.isArray(eventValue)) {
            eventResult[eventKey] = pathToSelector(
              (eventValue.length ? eventValue[0] : null) as HTMLElement,
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
      } else if (value instanceof Error) {
        return value.stack
          ? value.stack + '\nEnd of stack for Error object'
          : value.name + ': ' + value.message;
      }
      return value;
    },
  );

  /**
   * whether we should ignore obj's info and call toString() function instead
   */
  function shouldIgnore(_obj: object): boolean {
    // outof keys limit
    if (isObject(_obj) && Object.keys(_obj).length > options.numOfKeysLimit) {
      return true;
    }

    // is function
    if (typeof _obj === 'function') {
      return true;
    }

    /**
     * judge object's depth to avoid browser's OOM
     *
     * issues: https://github.com/rrweb-io/rrweb/issues/653
     */
    if (
      isObject(_obj) &&
      isObjTooDeep(_obj as Record<string, unknown>, options.depthOfLimit)
    ) {
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
