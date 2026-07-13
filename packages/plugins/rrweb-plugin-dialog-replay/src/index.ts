import type { eventWithTime } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import { PLUGIN_NAME } from '@rrweb/rrweb-plugin-dialog-record';
import type { DialogData } from '@rrweb/rrweb-plugin-dialog-record';

export type { DialogData, DialogKind } from '@rrweb/rrweb-plugin-dialog-record';

type ReplayPlugin = {
  handler?: (event: eventWithTime, isSync: boolean, context: unknown) => void;
};

export type OnDialog = (data: DialogData) => void;

export type DialogReplayOptions = {
  onDialog: OnDialog;
};

export const getReplayDialogPlugin: (
  options: DialogReplayOptions,
) => ReplayPlugin = (options) => {
  return {
    handler(event: eventWithTime) {
      if (
        event.type === EventType.Plugin &&
        event.data.plugin === PLUGIN_NAME
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const dialogData = event.data.payload as DialogData;
        options.onDialog(dialogData);
      }
    },
  };
};
