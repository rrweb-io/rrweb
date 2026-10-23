import type { eventWithTime } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import { PLUGIN_NAME } from '@rrweb/rrweb-plugin-popup-record';
import type { PopupData } from '@rrweb/rrweb-plugin-popup-record';

export type { PopupData, PopupKind } from '@rrweb/rrweb-plugin-popup-record';

type ReplayPlugin = {
  handler?: (event: eventWithTime, isSync: boolean, context: unknown) => void;
};

export type OnPopupData = (data: PopupData) => void;

export type PopupReplayOptions = {
  onPopup: OnPopupData;
};

export const getReplayPopupPlugin: (
  options: PopupReplayOptions,
) => ReplayPlugin = (options) => {
  return {
    handler(event: eventWithTime) {
      if (
        event.type === EventType.Plugin &&
        event.data.plugin === PLUGIN_NAME
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const popupData = event.data.payload as PopupData;
        options.onPopup(popupData);
      }
    },
  };
};
