import { InitiatorType, NETWORK_PLUGIN_NAME } from '../record';
import type { eventWithTime } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import type { ReplayPlugin } from '../../../types';

export type NetworkReplayLogger = (data: PerformanceResourceTiming) => void;

export type NetworkReplayOptions = {
  initiatorType?: InitiatorType[];
  replayLogger: NetworkReplayLogger;
};

const defaultNetworkOptions = {
  initiatorType: [
    'audio',
    'beacon',
    'body',
    'css',
    'early-hint',
    'embed',
    'fetch',
    'frame',
    'iframe',
    'icon',
    'image',
    'img',
    'input',
    'link',
    'navigation',
    'object',
    'ping',
    'script',
    'track',
    'video',
    'xmlhttprequest',
  ],
};

export const getReplayNetworkPlugin: (
  options: NetworkReplayOptions,
) => ReplayPlugin = (options) => {
  const networkOptions = Object.assign({}, defaultNetworkOptions, options) as {
    initiatorType: InitiatorType[];
    replayLogger: NetworkReplayLogger;
  };
  return {
    handler(event: eventWithTime) {
      if (
        event.type === EventType.Plugin &&
        event.data.plugin === NETWORK_PLUGIN_NAME
      ) {
        const networkData = event.data.payload as PerformanceResourceTiming;
        if (
          networkOptions.initiatorType.includes(
            networkData.initiatorType as InitiatorType,
          )
        ) {
          networkOptions.replayLogger(networkData);
        }
      }
    },
  };
};
