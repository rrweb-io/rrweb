/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
/**
 * Class StackFrame is a fork of https://github.com/stacktracejs/stackframe/blob/master/stackframe.js
 * I fork it because:
 * 1. There are some build issues when importing this package.
 * 2. Rewrites into typescript give us a better type interface.
 * 3. StackFrame contains some functions we don't need.
 */
export class StackFrame {
  private fileName: string;
  private functionName: string;
  private lineNumber?: number;
  private columnNumber?: number;

  constructor(obj: {
    fileName?: string;
    functionName?: string;
    lineNumber?: number;
    columnNumber?: number;
  }) {
    this.fileName = obj.fileName || '';
    this.functionName = obj.functionName || '';
    this.lineNumber = obj.lineNumber;
    this.columnNumber = obj.columnNumber;
  }

  toString() {
    const lineNumber = this.lineNumber || '';
    const columnNumber = this.columnNumber || '';
    if (this.functionName)
      return `${this.functionName} (${this.fileName}:${lineNumber}:${columnNumber})`;
    return `${this.fileName}:${lineNumber}:${columnNumber}`;
  }
}

/**
 * ErrorStackParser is a fork of https://github.com/stacktracejs/error-stack-parser/blob/master/error-stack-parser.js
 * I fork it because:
 * 1. There are some build issues when importing this package.
 * 2. Rewrites into typescript give us a better type interface.
 */
const FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
const CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
const SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code])?$/;
export const ErrorStackParser = {
  /**
   * Given an Error object, extract the most information from it.
   */
  parse: function (error: Error): StackFrame[] {
    // https://github.com/rrweb-io/rrweb/issues/782
    if (!error) {
      return [];
    }
    if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typeof error.stacktrace !== 'undefined' ||
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typeof error['opera#sourceloc'] !== 'undefined'
    ) {
      return this.parseOpera(
        error as {
          stacktrace?: string;
          message: string;
          stack?: string;
        },
      );
    } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
      return this.parseV8OrIE(error as { stack: string });
    } else if (error.stack) {
      return this.parseFFOrSafari(error as { stack: string });
    } else {
      console.warn("[console-record-plugin]: Failed to parse error object")
      return []
    }
  },
  // Separate line and column numbers from a string of the form: (URI:Line:Column)
  extractLocation: function (urlLike: string) {
    // Fail-fast but return locations like "(native)"
    if (urlLike.indexOf(':') === -1) {
      return [urlLike];
    }

    const regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
    const parts = regExp.exec(urlLike.replace(/[()]/g, ''));
    if (!parts) throw new Error(`Cannot parse given url: ${urlLike}`);
    return [parts[1], parts[2] || undefined, parts[3] || undefined];
  },
  parseV8OrIE: function (error: { stack: string }) {
    const filtered = error.stack.split('\n').filter(function (line) {
      return !!line.match(CHROME_IE_STACK_REGEXP);
    }, this);

    return filtered.map(function (line) {
      if (line.indexOf('(eval ') > -1) {
        // Throw away eval information until we implement stacktrace.js/stackframe#8
        line = line
          .replace(/eval code/g, 'eval')
          .replace(/(\(eval at [^()]*)|(\),.*$)/g, '');
      }
      let sanitizedLine = line.replace(/^\s+/, '').replace(/\(eval code/g, '(');

      // capture and preseve the parenthesized location "(/foo/my bar.js:12:87)" in
      // case it has spaces in it, as the string is split on \s+ later on
      const location = sanitizedLine.match(/ (\((.+):(\d+):(\d+)\)$)/);

      // remove the parenthesized location from the line, if it was matched
      sanitizedLine = location
        ? sanitizedLine.replace(location[0], '')
        : sanitizedLine;

      const tokens = sanitizedLine.split(/\s+/).slice(1);
      // if a location was matched, pass it to extractLocation() otherwise pop the last token
      const locationParts = this.extractLocation(
        location ? location[1] : tokens.pop(),
      );
      const functionName = tokens.join(' ') || undefined;
      const fileName =
        ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1
          ? undefined
          : locationParts[0];

      return new StackFrame({
        functionName,
        fileName,
        lineNumber: locationParts[1],
        columnNumber: locationParts[2],
      });
    }, this);
  },
  parseFFOrSafari: function (error: { stack: string }) {
    const filtered = error.stack.split('\n').filter(function (line) {
      return !line.match(SAFARI_NATIVE_CODE_REGEXP);
    }, this);

    return filtered.map(function (line) {
      // Throw away eval information until we implement stacktrace.js/stackframe#8
      if (line.indexOf(' > eval') > -1) {
        line = line.replace(
          / line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g,
          ':$1',
        );
      }

      if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
        // Safari eval frames only have function names and nothing else
        return new StackFrame({
          functionName: line,
        });
      } else {
        const functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
        const matches = line.match(functionNameRegex);
        const functionName = matches && matches[1] ? matches[1] : undefined;
        const locationParts = this.extractLocation(
          line.replace(functionNameRegex, ''),
        );

        return new StackFrame({
          functionName,
          fileName: locationParts[0],
          lineNumber: locationParts[1],
          columnNumber: locationParts[2],
        });
      }
    }, this);
  },
  parseOpera: function (e: {
    stacktrace?: string;
    message: string;
    stack?: string;
  }): StackFrame[] {
    if (
      !e.stacktrace ||
      (e.message.indexOf('\n') > -1 &&
        e.message.split('\n').length > e.stacktrace.split('\n').length)
    ) {
      return this.parseOpera9(e as { message: string });
    } else if (!e.stack) {
      return this.parseOpera10(e as { stacktrace: string });
    } else {
      return this.parseOpera11(e as { stack: string });
    }
  },
  parseOpera9: function (e: { message: string }) {
    const lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
    const lines = e.message.split('\n');
    const result = [];

    for (let i = 2, len = lines.length; i < len; i += 2) {
      const match = lineRE.exec(lines[i]);
      if (match) {
        result.push(
          new StackFrame({
            fileName: match[2],
            lineNumber: parseFloat(match[1]),
          }),
        );
      }
    }

    return result;
  },
  parseOpera10: function (e: { stacktrace: string }) {
    const lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
    const lines = e.stacktrace.split('\n');
    const result = [];

    for (let i = 0, len = lines.length; i < len; i += 2) {
      const match = lineRE.exec(lines[i]);
      if (match) {
        result.push(
          new StackFrame({
            functionName: match[3] || undefined,
            fileName: match[2],
            lineNumber: parseFloat(match[1]),
          }),
        );
      }
    }

    return result;
  },
  // Opera 10.65+ Error.stack very similar to FF/Safari
  parseOpera11: function (error: { stack: string }) {
    const filtered = error.stack.split('\n').filter(function (line) {
      return (
        !!line.match(FIREFOX_SAFARI_STACK_REGEXP) &&
        !line.match(/^Error created at/)
      );
    }, this);

    return filtered.map(function (line: string) {
      const tokens = line.split('@');
      const locationParts = this.extractLocation(tokens.pop());
      const functionCall = tokens.shift() || '';
      const functionName =
        functionCall
          .replace(/<anonymous function(: (\w+))?>/, '$2')
          .replace(/\([^)]*\)/g, '') || undefined;
      return new StackFrame({
        functionName,
        fileName: locationParts[0],
        lineNumber: locationParts[1],
        columnNumber: locationParts[2],
      });
    }, this);
  },
};
