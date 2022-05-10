import { eventWithTime } from '../types';
export declare type PackFn = (event: eventWithTime) => string;
export declare type UnpackFn = (raw: string) => eventWithTime;
export declare type eventWithTimeAndPacker = eventWithTime & {
    v: string;
};
export declare const MARK = "v1";
