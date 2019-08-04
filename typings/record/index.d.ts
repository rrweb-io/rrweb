import { recordOptions, listenerHandler } from '../types';
export declare function addCustomEvent<T>(tag: string, payload: T): void;
declare function record(options?: recordOptions): listenerHandler | undefined;
export default record;
