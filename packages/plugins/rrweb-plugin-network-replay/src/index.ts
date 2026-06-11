import type { eventWithTime, NetworkData } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import { PLUGIN_NAME } from '@rrweb/rrweb-plugin-network-record';

type ReplayPlugin = {
  handler?: (event: eventWithTime, isSync: boolean, context: unknown) => void;
};

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
        event.data.plugin === PLUGIN_NAME
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const networkData = event.data.payload as NetworkData;
        options.onNetworkData(networkData);
      }
    },
  };
};
