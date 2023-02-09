import { NetworkData, NETWORK_PLUGIN_NAME } from '../record';
import type { eventWithTime } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import type { ReplayPlugin } from '../../../types';

export type OnNetworkData = (data: NetworkData) => void;

export type NetworkReplayOptions = {
  onNetworkData: OnNetworkData;
};

export const getReplayNetworkPlugin: (
  options: NetworkReplayOptions,
) => ReplayPlugin = (options) => {
  return {
    handler(event: eventWithTime) {
      if (
        event.type === EventType.Plugin &&
        event.data.plugin === NETWORK_PLUGIN_NAME
      ) {
        const networkData = event.data.payload as NetworkData;
        options.onNetworkData(networkData);
      }
    },
  };
};
