import { eventWithTime, recordOptions, listenerHandler } from '../types';
declare function record<T = eventWithTime>(options?: recordOptions<T>): listenerHandler | undefined;
declare namespace record {
    var addCustomEvent: <T>(tag: string, payload: T) => void;
}
export default record;
