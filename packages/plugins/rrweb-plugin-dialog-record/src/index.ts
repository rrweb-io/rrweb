import type { listenerHandler, RecordPlugin, IWindow } from '@rrweb/types';
import { patch } from '@rrweb/utils';

export const PLUGIN_NAME = 'rrweb/dialog@1';

export type DialogKind = 'alert' | 'confirm' | 'prompt';

export type DialogData = {
  kind: DialogKind;
  message: string;
  defaultValue?: string;
  returnValue?: boolean | string | null;
};

export type DialogRecordOptions = {
  /**
   * Which native dialogs to hook. Defaults to all three.
   */
  level?: DialogKind[];
  /**
   * Whether to record the user's response for `confirm` / `prompt`.
   * `alert` never has a return value. Defaults to `true`.
   */
  recordReturnValue?: boolean;
  /**
   * Redaction hook applied to the payload immediately before it is emitted.
   */
  maskDialog?: (data: DialogData) => DialogData;
};

type DialogCallback = (data: DialogData) => void;

const ALL_KINDS: DialogKind[] = ['alert', 'confirm', 'prompt'];

function initDialogObserver(
  cb: DialogCallback,
  win: IWindow,
  options: DialogRecordOptions,
): listenerHandler {
  const kinds = options.level ?? ALL_KINDS;
  const recordReturnValue = options.recordReturnValue !== false;
  const handlers: listenerHandler[] = [];

  for (const kind of kinds) {
    handlers.push(
      patch(
        win as unknown as Record<string, unknown>,
        kind,
        (original) => {
          const originalFn = original as (...args: unknown[]) => unknown;
          return function (this: unknown, ...args: unknown[]) {
            // Call through to the real (blocking) dialog first so we can
            // capture the user's response for confirm / prompt.
            const returnValue = originalFn.apply(this, args);

            let data: DialogData = {
              kind,
              message: String(args[0] ?? ''),
            };
            if (kind === 'prompt' && args[1] != null) {
              data.defaultValue = String(args[1]);
            }
            if (recordReturnValue && kind !== 'alert') {
              data.returnValue = returnValue as boolean | string | null;
            }
            if (options.maskDialog) {
              data = options.maskDialog(data);
            }
            cb(data);

            return returnValue;
          };
        },
      ),
    );
  }

  return () => {
    handlers.forEach((h) => h());
  };
}

export const getRecordDialogPlugin: (
  options?: DialogRecordOptions,
) => RecordPlugin<DialogRecordOptions> = (options) => ({
  name: PLUGIN_NAME,
  observer: initDialogObserver as RecordPlugin['observer'],
  options: options ?? {},
});
