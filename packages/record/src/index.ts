import { record as rrwebRecord, type recordOptions } from 'rrweb';
import { type listenerHandler, type eventWithTime } from '@rrweb/types';

let currentOptions: recordOptions<eventWithTime> | null = null;

function record(
  options: recordOptions<eventWithTime> = {},
): listenerHandler | undefined {
  // save what options were used
  currentOptions = options;
  return rrwebRecord(options);
}

/*
 * a public version of utils.isBlocked which can be used to check a node after a recording is started
 */
function isBlocked(
  node: Node,
  options?: recordOptions<eventWithTime>,
): boolean {
  if (options === undefined) {
    if (currentOptions === null) {
      throw new Error(
        'Either call after rrweb.record, or else pass in your recording config as the second argument',
      );
    } else {
      options = currentOptions;
    }
  }
  return utils.isBlocked(
    node,
    options.blockClass || 'rr-block',
    options.blockSelector || null,
    true,
  );
}

export { record, isBlocked };
