import { addDelay, Timer } from '../replay/timer';
import {
  actionWithDelay,
  event,
  EventType,
  eventWithTime,
  incrementalData,
  IncrementalSource,
  logData,
} from '../types';

type RecordOptions = {
  emit: (e: eventWithTime) => void;
  level?: Array<String> | undefined;
  lengthThreshold?: number;
  logger?: Logger;
};

type ReplayConfig = {
  level?: Array<String> | undefined;
  lengthThreshold?: number;
  logger: Logger;
};

type Logger = {
  log?: (message?: any, ...optionalParams: any[]) => void;
  info?: (message?: any, ...optionalParams: any[]) => void;
  warn?: (message?: any, ...optionalParams: any[]) => void;
  error?: (message?: any, ...optionalParams: any[]) => void;
  debug?: (message?: any, ...optionalParams: any[]) => void;
  assert?: (message?: any, ...optionalParams: any[]) => void;
  trace?: (message?: any, ...optionalParams: any[]) => void;
  DefaultLog?: (message?: any, ...optionalParams: any[]) => void;
  ReplayLog?: (data: logData) => void;
  oInfo?: (message?: any, ...optionalParams: any[]) => void;
  ReplayInfo?: (data: logData) => void;
  oWarn?: (message?: any, ...optionalParams: any[]) => void;
  ReplayWarn?: (data: logData) => void;
  oError?: (message?: any, ...optionalParams: any[]) => void;
  ReplayError?: (data: logData) => void;
  oDebug?: (message?: any, ...optionalParams: any[]) => void;
  ReplayDebug?: (data: logData) => void;
  oAssert?: (message?: any, ...optionalParams: any[]) => void;
  ReplayAssert?: (data: logData) => void;
  oTrace?: (message?: any, ...optionalParams: any[]) => void;
  ReplayTrace?: (data: logData) => void;
};
function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
}

function parseStack(stack: string | undefined): string[] {
  let stacks: string[] = [];
  if (stack) {
    stacks = stack
      .split('at')
      .splice(2)
      .map((s) => s.trim());
  }
  return stacks;
}

export function recordLog(options: RecordOptions) {
  const defaults = {
    emit: (event: eventWithTime): void => {},
    level: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'],
    lengthThreshold: 10000,
    logger: console,
  };
  const loggerOptions: RecordOptions = defaults;
  Object.assign(loggerOptions, defaults, options);

  for (const levelType of loggerOptions.level!) {
    const logger = loggerOptions.logger;
    const cancelHandlers: any[] = [];
    if (!logger) return;
    switch (levelType.toLowerCase()) {
      case 'log':
        if (logger.log) {
          logger.DefaultLog = logger.log;
          logger.log = (...args) => {
            const stack = parseStack(new Error().stack);
            const payload = args.map((s) => JSON.stringify(s));
            loggerOptions.emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Log,
                  level: 'log',
                  trace: stack,
                  payload: payload,
                },
              }),
            );
            logger.DefaultLog!.apply(this, args);
          };
          cancelHandlers.push(() => {
            logger.log = logger.DefaultLog;
            logger.DefaultLog = undefined;
          });
        }
        break;
      case 'info':
        break;
      case 'warn':
        break;
      case 'error':
        break;
      case 'debug':
        break;
      case 'assert':
        break;
      case 'trace':
        break;
      default:
        break;
    }
    return () => {
      cancelHandlers.forEach((h) => h());
    };
  }
}
export class replayLog {
  private replayConfig: ReplayConfig;
  private events: Array<eventWithTime>;
  constructor(events: Array<eventWithTime>, config: ReplayConfig) {
    const defaults: ReplayConfig = {
      level: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'],
      lengthThreshold: 10000,
      logger: this.getConsoleLogger(console),
    };
    this.replayConfig = defaults;
    Object.assign(this.replayConfig, defaults, config);
    this.events = events;
  }

  getConsoleLogger(logger: Logger): Logger {
    logger.ReplayLog = (data) => {
      logger.log!(this.formatMessage(data));
    };
    return logger;
  }

  private formatMessage(data: logData): string {
    let result = '';
    result += data.payload.map((s) => JSON.parse(s)).join(' ');
    result += '\n\t';
    result += data.trace.join('\n\t');
    return result;
  }

  private getCastFn(event: eventWithTime) {
    let castFn: () => void = () => {};
    switch (event.type) {
      case EventType.IncrementalSnapshot:
        if (event.data.source === IncrementalSource.Log)
          castFn = () => {
            const logData = event.data as logData;
            switch (logData.level) {
              case 'log':
                this.replayConfig.logger.ReplayLog!(logData);
                break;
              case 'info':
                break;
              case 'warn':
                break;
              case 'error':
                break;
              case 'debug':
                break;
              case 'assert':
                break;
              case 'trace':
                break;
              default:
                break;
            }
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
