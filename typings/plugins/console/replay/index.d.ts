import { LogLevel, LogData } from '../record';
import { ReplayPlugin } from '../../../types';
declare type ReplayLogger = Partial<Record<LogLevel, (data: LogData) => void>>;
declare type LogReplayConfig = {
    level?: LogLevel[] | undefined;
    replayLogger: ReplayLogger | undefined;
};
export declare const getLogReplayPlugin: (options?: LogReplayConfig) => ReplayPlugin;
export {};
