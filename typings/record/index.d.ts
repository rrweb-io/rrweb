import { recordOptions, listenerHandler } from '../types';
declare function record(options?: recordOptions): listenerHandler | undefined;
declare namespace record {
    var addCustomEvent: <T>(tag: string, payload: T) => void;
}
export default record;
