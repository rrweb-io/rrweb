import type { RecordPlugin } from '../../../types';
export declare type StringifyOptions = {
    stringLengthLimit?: number;
    numOfKeysLimit: number;
    depthOfLimit: number;
};
declare type LogRecordOptions = {
    level?: LogLevel[];
    lengthThreshold?: number;
    stringifyOptions?: StringifyOptions;
    logger?: Logger | 'console';
};
export declare type LogData = {
    level: LogLevel;
    trace: string[];
    payload: string[];
};
export declare type Logger = {
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
export declare type LogLevel = keyof Logger;
export declare const PLUGIN_NAME = "rrweb/console@1";
export declare const getRecordConsolePlugin: (options?: LogRecordOptions) => RecordPlugin;
export {};
