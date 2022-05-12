import type { SequentialIdOptions } from '../record';
import type { ReplayPlugin } from '../../../types';
declare type Options = SequentialIdOptions & {
    warnOnMissingId: boolean;
};
export declare const getReplaySequentialIdPlugin: (options?: Partial<Options>) => ReplayPlugin;
export {};
