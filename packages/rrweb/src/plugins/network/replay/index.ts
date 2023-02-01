import { InitiatorType, NetworkData, NETWORK_PLUGIN_NAME } from '../record';
import type { eventWithTime } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import type { ReplayPlugin } from '../../../types';

export type NetworkReplayLogger = (data: NetworkData) => void;

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
        const networkData = event.data.payload as NetworkData;
        networkData.requests = networkData.requests.filter((request) =>
          networkOptions.initiatorType.includes(
            request.resourceTiming.initiatorType as InitiatorType,
          ),
        );
        networkOptions.replayLogger(networkData);
      }
    },
  };
};
