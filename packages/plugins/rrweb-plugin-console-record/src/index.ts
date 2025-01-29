import type {
  listenerHandler,
  RecordPlugin,
  IWindow,
} from '@saola.ai/rrweb-types';
import { utils } from '@saola.ai/rrweb';
import { ErrorStackParser, StackFrame } from './error-stack-parser';
import { stringify } from './stringify';

export type StringifyOptions = {
  // limit of string length
  stringLengthLimit?: number;
  /**
   * limit of number of keys in an object
   * if an object contains more keys than this limit, we would call its toString function directly
   */
  numOfKeysLimit: number;
  /**
   * limit number of depth in an object
   * if an object is too deep, toString process may cause browser OOM
   */
  depthOfLimit: number;
};

type LogRecordOptions = {
  level?: LogLevel[];
  lengthThreshold?: number;
  stringifyOptions?: StringifyOptions;
  logger?: Logger | 'console';
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
  logger: 'console',
};

export type LogData = {
  level: LogLevel;
  trace: string[];
  payload: string[];
};

type logCallback = (p: LogData) => void;

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

export type LogLevel = keyof Logger;

function initLogObserver(
  cb: logCallback,
  win: IWindow, // top window or in an iframe
  options: LogRecordOptions,
): listenerHandler {
  const logOptions = (
    options ? Object.assign({}, defaultLogOptions, options) : defaultLogOptions
  ) as {
    level: LogLevel[];
    lengthThreshold: number;
    stringifyOptions?: StringifyOptions;
    logger: Logger | 'console';
  };
  const loggerType = logOptions.logger;
  if (!loggerType) {
    return () => {
      //
    };
  }
  let logger: Logger;
  if (typeof loggerType === 'string') {
    logger = win[loggerType];
  } else {
    logger = loggerType;
  }
  let logCount = 0;
  let inStack = false;
  const cancelHandlers: listenerHandler[] = [];
  // add listener to thrown errors
  if (logOptions.level.includes('error')) {
    const errorHandler = (event: ErrorEvent) => {
      const message = event.message,
        error = event.error as Error;
      const trace: string[] = ErrorStackParser.parse(error).map(
        (stackFrame: StackFrame) => stackFrame.toString(),
      );
      const payload = [stringify(message, logOptions.stringifyOptions)];
      cb({
        level: 'error',
        trace,
        payload,
      });
    };
    win.addEventListener('error', errorHandler);
    cancelHandlers.push(() => {
      win.removeEventListener('error', errorHandler);
    });
    const unhandledrejectionHandler = (event: PromiseRejectionEvent) => {
      let error: Error;
      let payload: string[];
      if (event.reason instanceof Error) {
        error = event.reason;
        payload = [
          stringify(
            `Uncaught (in promise) ${error.name}: ${error.message}`,
            logOptions.stringifyOptions,
          ),
        ];
      } else {
        error = new Error();
        payload = [
          stringify('Uncaught (in promise)', logOptions.stringifyOptions),
          stringify(event.reason, logOptions.stringifyOptions),
        ];
      }
      const trace: string[] = ErrorStackParser.parse(error).map(
        (stackFrame: StackFrame) => stackFrame.toString(),
      );
      cb({
        level: 'error',
        trace,
        payload,
      });
    };
    win.addEventListener('unhandledrejection', unhandledrejectionHandler);
    cancelHandlers.push(() => {
      win.removeEventListener('unhandledrejection', unhandledrejectionHandler);
    });
  }
  for (const levelType of logOptions.level) {
    cancelHandlers.push(replace(logger, levelType));
  }
  return () => {
    cancelHandlers.forEach((h) => h());
  };

  /**
   * replace the original console function and record logs
   * @param logger - the logger object such as Console
   * @param level - the name of log function to be replaced
   */
  function replace(_logger: Logger, level: LogLevel) {
    if (!_logger[level]) {
      return () => {
        //
      };
    }
    // replace the logger.{level}. return a restore function
    return utils.patch(
      _logger,
      level,
      (original: (...args: Array<unknown>) => void) => {
        return (...args: Array<unknown>) => {
          original.apply(this, args);

          if (level === 'assert' && !!args[0]) {
            // assert does not log if the first argument evaluates to true
            return;
          }

          if (inStack) {
            // If we are already in a stack this means something from the following code is calling a console method
            // likely a proxy method called from stringify. We don't want to log this as it will cause an infinite loop
            return;
          }
          inStack = true;
          try {
            const trace = ErrorStackParser.parse(new Error())
              .map((stackFrame: StackFrame) => stackFrame.toString())
              .splice(1); // splice(1) to omit the hijacked log function

            // assert does not log its first arg, that's only used for deciding whether to log
            const argsForPayload = level === 'assert' ? args.slice(1) : args;

            const payload = argsForPayload.map((s) =>
              stringify(s, logOptions.stringifyOptions),
            );
            logCount++;
            if (logCount < logOptions.lengthThreshold) {
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
          } finally {
            inStack = false;
          }
        };
      },
    );
  }
}

export const PLUGIN_NAME = 'rrweb/console@1';

export const getRecordConsolePlugin: (
  options?: LogRecordOptions,
) => RecordPlugin = (options) => ({
  name: PLUGIN_NAME,
  observer: initLogObserver,
  options: options,
});
