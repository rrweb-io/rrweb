import { listenerHandler } from '../../../types';
import { stringify } from './stringify';
import { StackFrame, ErrorStackParser } from './error-stack-parser';
import { patch } from '../../../utils';

export type StringifyOptions = {
  // limit of string length
  stringLengthLimit?: number;
  /**
   * limit of number of keys in an object
   * if an object contains more keys than this limit, we would call its toString function directly
   */
  numOfKeysLimit: number;
};

type LogRecordOptions = {
  level?: LogLevel[] | undefined;
  lengthThreshold?: number;
  stringifyOptions?: StringifyOptions;
  logger?: Logger;
};

const defaultLogOptions: LogRecordOptions = {
  level: [
    'assert',
    'clear',
    'count',
    'countReset',
    'debug',
    'dir',
    'dirxml',
    'error',
    'group',
    'groupCollapsed',
    'groupEnd',
    'info',
    'log',
    'table',
    'time',
    'timeEnd',
    'timeLog',
    'trace',
    'warn',
  ],
  lengthThreshold: 1000,
  logger: console,
};

export type LogData = {
  level: LogLevel;
  trace: string[];
  payload: string[];
};

type logCallback = (p: LogData) => void;

export type LogLevel =
  | 'assert'
  | 'clear'
  | 'count'
  | 'countReset'
  | 'debug'
  | 'dir'
  | 'dirxml'
  | 'error'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'info'
  | 'log'
  | 'table'
  | 'time'
  | 'timeEnd'
  | 'timeLog'
  | 'trace'
  | 'warn';

/* fork from interface Console */
// all kinds of console functions
export type Logger = {
  assert?: typeof console.assert;
  clear?: typeof console.clear;
  count?: typeof console.count;
  countReset?: typeof console.countReset;
  debug?: typeof console.debug;
  dir?: typeof console.dir;
  dirxml?: typeof console.dirxml;
  error?: typeof console.error;
  group?: typeof console.group;
  groupCollapsed?: typeof console.groupCollapsed;
  groupEnd?: () => void;
  info?: typeof console.info;
  log?: typeof console.log;
  table?: typeof console.table;
  time?: typeof console.time;
  timeEnd?: typeof console.timeEnd;
  timeLog?: typeof console.timeLog;
  trace?: typeof console.trace;
  warn?: typeof console.warn;
};

function initLogObserver(
  cb: logCallback,
  logOptions: LogRecordOptions,
): listenerHandler {
  const logger = logOptions.logger;
  if (!logger) {
    return () => {};
  }
  let logCount = 0;
  const cancelHandlers: listenerHandler[] = [];
  // add listener to thrown errors
  if (logOptions.level!.includes('error')) {
    if (window) {
      const originalOnError = window.onerror;
      window.onerror = (
        msg: Event | string,
        file: string,
        line: number,
        col: number,
        error: Error,
      ) => {
        if (originalOnError) {
          originalOnError.apply(this, [msg, file, line, col, error]);
        }
        const trace: string[] = ErrorStackParser.parse(error).map(
          (stackFrame: StackFrame) => stackFrame.toString(),
        );
        const payload = [stringify(msg, logOptions.stringifyOptions)];
        cb({
          level: 'error',
          trace,
          payload,
        });
      };
      cancelHandlers.push(() => {
        window.onerror = originalOnError;
      });
    }
  }
  for (const levelType of logOptions.level!) {
    cancelHandlers.push(replace(logger, levelType));
  }
  return () => {
    cancelHandlers.forEach((h) => h());
  };

  /**
   * replace the original console function and record logs
   * @param logger the logger object such as Console
   * @param level the name of log function to be replaced
   */
  function replace(_logger: Logger, level: LogLevel) {
    if (!_logger[level]) {
      return () => {};
    }
    // replace the logger.{level}. return a restore function
    return patch(_logger, level, (original) => {
      return (...args: Array<unknown>) => {
        original.apply(this, args);
        try {
          const trace = ErrorStackParser.parse(new Error())
            .map((stackFrame: StackFrame) => stackFrame.toString())
            .splice(1); // splice(1) to omit the hijacked log function
          const payload = args.map((s) =>
            stringify(s, logOptions.stringifyOptions),
          );
          logCount++;
          if (logCount < logOptions.lengthThreshold!) {
            cb({
              level,
              trace,
              payload,
            });
          } else if (logCount === logOptions.lengthThreshold) {
            // notify the user
            cb({
              level: 'warn',
              trace: [],
              payload: [
                stringify('The number of log records reached the threshold.'),
              ],
            });
          }
        } catch (error) {
          original('rrweb logger error:', error, ...args);
        }
      };
    });
  }
}

export const getRecordConsolePlugin: (options?: LogRecordOptions) => {
  name: string;
  observer: Function;
  options: LogRecordOptions;
} = (options) => ({
  name: 'console',
  observer: initLogObserver,
  options: options
    ? Object.assign({}, defaultLogOptions, options)
    : defaultLogOptions,
});
