import { LogLevel, LogData, PLUGIN_NAME } from '../record';
import {
  eventWithTime,
  EventType,
  IncrementalSource,
  ReplayPlugin,
} from '../../../types';

/**
 * define an interface to replay log records
 * (data: logData) => void> function to display the log data
 */
type ReplayLogger = Partial<Record<LogLevel, (data: LogData) => void>>;

type LogReplayConfig = {
  level?: LogLevel[] | undefined;
  replayLogger: ReplayLogger | undefined;
};

const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
type PatchedConsoleLog = {
  [ORIGINAL_ATTRIBUTE_NAME]: typeof console.log;
};

const defaultLogConfig: LogReplayConfig = {
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
  replayLogger: undefined,
};

class LogReplayPlugin {
  private config: LogReplayConfig;

  constructor(config?: LogReplayConfig) {
    this.config = Object.assign(defaultLogConfig, config);
  }

  /**
   * generate a console log replayer which implement the interface ReplayLogger
   */
  public getConsoleLogger(): ReplayLogger {
    const replayLogger: ReplayLogger = {};
    for (const level of this.config.level!) {
      if (level === 'trace') {
        replayLogger[level] = (data: LogData) => {
          const logger = ((console.log as unknown) as PatchedConsoleLog)[
            ORIGINAL_ATTRIBUTE_NAME
          ]
            ? ((console.log as unknown) as PatchedConsoleLog)[
                ORIGINAL_ATTRIBUTE_NAME
              ]
            : console.log;
          logger(
            ...data.payload.map((s) => JSON.parse(s)),
            this.formatMessage(data),
          );
        };
      } else {
        replayLogger[level] = (data: LogData) => {
          const logger = ((console[level] as unknown) as PatchedConsoleLog)[
            ORIGINAL_ATTRIBUTE_NAME
          ]
            ? ((console[level] as unknown) as PatchedConsoleLog)[
                ORIGINAL_ATTRIBUTE_NAME
              ]
            : console[level];
          logger(
            ...data.payload.map((s) => JSON.parse(s)),
            this.formatMessage(data),
          );
        };
      }
    }
    return replayLogger;
  }

  /**
   * format the trace data to a string
   * @param data the log data
   */
  private formatMessage(data: LogData): string {
    if (data.trace.length === 0) {
      return '';
    }
    const stackPrefix = '\n\tat ';
    let result = stackPrefix;
    result += data.trace.join(stackPrefix);
    return result;
  }
}

export const getLogReplayPlugin: (options?: LogReplayConfig) => ReplayPlugin = (
  options,
) => {
  const replayLogger =
    options?.replayLogger || new LogReplayPlugin(options).getConsoleLogger();

  return {
    handler(event: eventWithTime, _isSync, context) {
      let logData: LogData | null = null;
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === (IncrementalSource.Log as IncrementalSource)
      ) {
        logData = (event.data as unknown) as LogData;
      } else if (
        event.type === EventType.Plugin &&
        event.data.plugin === PLUGIN_NAME
      ) {
        logData = event.data.payload as LogData;
      }
      if (logData) {
        try {
          if (typeof replayLogger[logData.level] === 'function') {
            replayLogger[logData.level]!(logData);
          }
        } catch (error) {
          if (context.replayer.config.showWarning) {
            console.warn(error);
          }
        }
      }
    },
  };
};
