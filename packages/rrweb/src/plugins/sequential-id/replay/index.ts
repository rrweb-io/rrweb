import type { SequentialIdOptions } from '../record';
import type { ReplayPlugin } from '../../../types';
import type { eventWithTime } from '@rrweb/types';

type Options = SequentialIdOptions & {
  warnOnMissingId: boolean;
};

const defaultOptions: Options = {
  key: '_sid',
  warnOnMissingId: true,
};

export const getReplaySequentialIdPlugin: (
  options?: Partial<Options>,
) => ReplayPlugin = (options) => {
  const { key, warnOnMissingId } = options
    ? Object.assign({}, defaultOptions, options)
    : defaultOptions;
  let currentId = 1;

  return {
    handler(event: eventWithTime) {
      if (key in event) {
        const id = ((event as unknown) as Record<string, number>)[key];
        if (id !== currentId) {
          console.error(
            `[sequential-id-plugin]: expect to get an id with value "${currentId}", but got "${id}"`,
          );
        } else {
          currentId++;
        }
      } else if (warnOnMissingId) {
        console.warn(
          `[sequential-id-plugin]: failed to get id in key: "${key}"`,
        );
      }
    },
  };
};
