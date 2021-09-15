import { LogLevel, LogData } from '../record';
import { ReplayPlugin } from '../../../types';
declare type ReplayLogger = Partial<Record<LogLevel, (data: LogData) => void>>;
declare type LogReplayConfig = {
    level?: LogLevel[];
    replayLogger?: ReplayLogger;
};
export declare const getReplayConsolePlugin: (options?: LogReplayConfig) => ReplayPlugin;
export {};
