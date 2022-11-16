import { eventWithTime, recordOptions, listenerHandler } from '../types';
declare function record<T = eventWithTime>(options?: recordOptions<T>): listenerHandler | undefined;
declare namespace record {
    var addCustomEvent: <T>(tag: string, payload: T) => void;
    var freezePage: () => void;
    var takeFullSnapshot: (isCheckout?: boolean | undefined) => void;
    var takeScrollSnapshot: (target: HTMLElement) => void;
    var mirror: import("@fullview/rrweb-snapshot").Mirror;
}
export default record;
