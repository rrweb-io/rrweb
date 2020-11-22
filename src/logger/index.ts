import { addDelay, Timer } from '../replay/timer';
import {
  actionWithDelay,
  event,
  EventType,
  eventWithTime,
  IncrementalSource,
  logData,
  LogLevel,
} from '../types';
import { patch } from '../utils';
import { stringify } from './json';

type RecordOptions = {
  emit: (e: eventWithTime) => void;
  level?: Array<LogLevel> | undefined;
  lengthThreshold?: number;
  logger?: Logger;
};

type ReplayConfig = {
  level?: Array<LogLevel> | undefined;
  lengthThreshold?: number;
  replayLogger: ReplayLogger | undefined;
};

/* fork from interface Console */
type Logger = {
  assert?: (value: any, message?: string, ...optionalParams: any[]) => void;
  clear?: () => void;
  count?: (label?: string) => void;
  countReset?: (label?: string) => void;
  debug?: (message?: any, ...optionalParams: any[]) => void;
  dir?: (obj: any, options?: NodeJS.InspectOptions) => void;
  dirxml?: (...data: any[]) => void;
  error?: (message?: any, ...optionalParams: any[]) => void;
  group?: (...label: any[]) => void;
  groupCollapsed?: (label?: any[]) => void;
  groupEnd?: () => void;
  info?: (message?: any, ...optionalParams: any[]) => void;
  log?: (message?: any, ...optionalParams: any[]) => void;
  table?: (tabularData: any, properties?: ReadonlyArray<string>) => void;
  time?: (label?: string) => void;
  timeEnd?: (label?: string) => void;
  timeLog?: (label?: string, ...data: any[]) => void;
  trace?: (message?: any, ...optionalParams: any[]) => void;
  warn?: (message?: any, ...optionalParams: any[]) => void;
};
type ReplayLogger = {
  assert?: (data: logData) => void;
  clear?: (data: logData) => void;
  count?: (data: logData) => void;
  countReset?: (data: logData) => void;
  debug?: (data: logData) => void;
  dir?: (data: logData) => void;
  dirxml?: (data: logData) => void;
  error?: (data: logData) => void;
  group?: (data: logData) => void;
  groupCollapsed?: (data: logData) => void;
  groupEnd?: (data: logData) => void;
  info?: (data: logData) => void;
  log?: (data: logData) => void;
  table?: (data: logData) => void;
  time?: (data: logData) => void;
  timeEnd?: (data: logData) => void;
  timeLog?: (data: logData) => void;
  trace?: (data: logData) => void;
  warn?: (data: logData) => void;
};
function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

function parseStack(
  stack: string | undefined,
  omitDepth: number = 1,
): string[] {
  let stacks: string[] = [];
  if (stack) {
    stacks = stack
      .split('at')
      .splice(1 + omitDepth)
      .map((s) => s.trim());
  }
  return stacks;
}

export function recordLog(options: RecordOptions) {
  const defaults: RecordOptions = {
    emit: (event: eventWithTime): void => {},
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
    lengthThreshold: 10000,
    logger: console,
  };
  const loggerOptions: RecordOptions = defaults;
  Object.assign(loggerOptions, defaults, options);
  const logger = loggerOptions.logger;
  const cancelHandlers: any[] = [];
  if (!logger) return;
  // add listener to thrown errors
  if (loggerOptions.level!.includes('error')) {
    if (window) {
      const originalOnError = window.onerror;
      window.onerror = (...args: any[]) => {
        originalOnError && originalOnError.apply(this, args);
        const stack = parseStack(args[args.length - 1].stack, 0);
        const payload = [stringify(args[0])];
        loggerOptions.emit(
          wrapEvent({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.Log,
              level: 'error',
              trace: stack,
              payload: payload,
            },
          }),
        );
      };
      cancelHandlers.push(() => {
        window.onerror = originalOnError;
      });
    }
  }
  for (const levelType of loggerOptions.level!)
    cancelHandlers.push(replace(logger, levelType));
  return () => {
    cancelHandlers.forEach((h) => h());
  };

  function replace(logger: Logger, level: LogLevel) {
    if (!logger[level]) return () => {};
    // replace the logger.{level}. return a restore function
    return patch(logger, level, (original) => {
      return (...args: any[]) => {
        original.apply(this, args);
        const stack = parseStack(new Error().stack);
        const payload = args.map((s) => stringify(s));
        loggerOptions.emit(
          wrapEvent({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.Log,
              level: level,
              trace: stack,
              payload: payload,
            },
          }),
        );
      };
    });
  }
}
export class replayLog {
  private replayConfig: ReplayConfig;
  private events: Array<eventWithTime>;
  constructor(events: Array<eventWithTime>, config: ReplayConfig) {
    const defaults: ReplayConfig = {
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
      lengthThreshold: 10000,
      replayLogger: undefined,
    };
    this.replayConfig = defaults;
    Object.assign(this.replayConfig, defaults, config);
    if (!this.replayConfig.replayLogger) {
      this.replayConfig.replayLogger = this.getConsoleLogger();
    }
    this.events = events;
  }

  getConsoleLogger(): ReplayLogger {
    const rrwebOriginal = '__rrweb_original__';
    const replayLogger: ReplayLogger = {};
    for (const level of this.replayConfig.level!)
      if (level === 'trace')
        replayLogger[level] = (data: logData) => {
          const logger = (console.log as any)[rrwebOriginal]
            ? (console.log as any)[rrwebOriginal]
            : console.log;
          logger(
            ...data.payload.map((s) => JSON.parse(s)),
            this.formatMessage(data),
          );
        };
      else
        replayLogger[level] = (data: logData) => {
          const logger = (console[level] as any)[rrwebOriginal]
            ? (console[level] as any)[rrwebOriginal]
            : console[level];
          logger(
            ...data.payload.map((s) => JSON.parse(s)),
            this.formatMessage(data),
          );
        };
    return replayLogger;
  }

  private formatMessage(data: logData): string {
    const stackPrefix = '\n\tat ';
    let result = stackPrefix;
    result += data.trace.join(stackPrefix);
    return result;
  }

  private getCastFn(event: eventWithTime) {
    let castFn: () => void = () => {};
    switch (event.type) {
      case EventType.IncrementalSnapshot:
        if (event.data.source === IncrementalSource.Log)
          castFn = () => {
            const logData = event.data as logData;
            const replayLogger = this.replayConfig.replayLogger!;
            if (typeof replayLogger[logData.level] === 'function')
              replayLogger[logData.level]!(logData);
          };
        break;
      default:
        break;
    }
    return castFn;
  }

  public play(timeOffset = 0) {
    const actions = new Array<actionWithDelay>();
    for (const event of this.events) {
      addDelay(event, this.events[0].timestamp);
      const castFn = this.getCastFn(event);
      actions.push({
        doAction: () => {
          castFn();
        },
        delay: event.delay!,
      });
    }
    const timer = new Timer([], 1);
    timer.addActions(actions);
    timer.start();
  }
}
