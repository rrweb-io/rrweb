import type { recordOptions } from '../types';
import {
  type eventWithTime,
  type listenerHandler,
} from '@newrelic/rrweb-types';
declare function record<T = eventWithTime>(
  options?: recordOptions<T>,
): listenerHandler | undefined;
declare namespace record {
  var addCustomEvent: <T>(tag: string, payload: T) => void;
  var freezePage: () => void;
  var takeFullSnapshot: (isCheckout?: boolean | undefined) => void;
  var mirror: import('@newrelic/rrweb-snapshot').Mirror;
}
export default record;
