import { createPlayerService } from '../replay/machine';
import { Timer } from '../replay/timer';
import {
  event,
  EventType,
  eventWithTime,
  incrementalData,
  IncrementalSource,
  logData,
} from '../types';
import * as mittProxy from 'mitt';

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
                  payload: args.toString(),
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
// tslint:disable-next-line
mitt = (mittProxy as any).default || mittProxy;
export class replayLog {
  private replayConfig: ReplayConfig;
  private service;
  emitter = mitt();
  constructor(events: Array<eventWithTime>, config: ReplayConfig) {
    const defaults = {
      level: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'],
      lengthThreshold: 10000,
      logger: console,
    };
    this.replayConfig = defaults;
    Object.assign(this.replayConfig, defaults, config);
    const timer = new Timer([], 1);
    this.service = createPlayerService(
      {
        events: events.map((e) => {
          return e as eventWithTime;
        }),
        timer,
        timeOffset: 0,
        baselineTime: 0,
        lastPlayedEvent: null,
      },
      {
        getCastFn: this.getCastFn,
        emitter: this.emitter,
      },
    );
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

  public play() {
    this.service.send('PLAY');
  }
}
