import { addDelay, Timer } from '../replay/timer';
import {
  actionWithDelay,
  event,
  EventType,
  eventWithTime,
  IncrementalSource,
  logData,
} from '../types';

type RecordOptions = {
  emit: (e: eventWithTime) => void;
  level?: Array<String> | undefined;
  lengthThreshold?: number;
  logger?: logger;
};

type ReplayConfig = {
  level?: Array<String> | undefined;
  lengthThreshold?: number;
  logger: logger;
};

type logger = {
  log?: (message?: any, ...optionalParams: any[]) => void;
  info?: (message?: any, ...optionalParams: any[]) => void;
  warn?: (message?: any, ...optionalParams: any[]) => void;
  error?: (message?: any, ...optionalParams: any[]) => void;
  debug?: (message?: any, ...optionalParams: any[]) => void;
  assert?: (message?: any, ...optionalParams: any[]) => void;
  trace?: (message?: any, ...optionalParams: any[]) => void;
};
function wrapEvent(e: event): eventWithTime {
  return {
    ...e,
    timestamp: Date.now(),
  };
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
          const originalLog = logger.log;
          logger.log = (...args) => {
            loggerOptions.emit(
              wrapEvent({
                type: EventType.IncrementalSnapshot,
                data: {
                  source: IncrementalSource.Log,
                  level: 'log',
                  trace: '',
                  payload: args[0],
                },
              }),
            );
            originalLog.apply(this, args);
          };
          cancelHandlers.push(() => (logger.log = originalLog));
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
    const defaults = {
      level: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'],
      lengthThreshold: 10000,
      logger: console,
    };
    this.replayConfig = defaults;
    Object.assign(this.replayConfig, defaults, config);
    this.events = events;
  }
  private getCastFn(event: eventWithTime, isSync = false) {
    let castFn: () => void = () => {};
    switch (event.type) {
      case EventType.IncrementalSnapshot:
        if (event.data.source === IncrementalSource.Log)
          castFn = () => {
            const logData = event.data as logData;
            switch (logData.level) {
              case 'log':
                this.replayConfig.logger.log!(logData.payload);
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
      const castFn = this.getCastFn(event, false);
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
