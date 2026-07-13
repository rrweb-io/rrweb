import type { listenerHandler, RecordPlugin, IWindow } from '@rrweb/types';
import { patch } from '@rrweb/utils';

export const PLUGIN_NAME = 'rrweb/popup@1';

export type PopupKind = 'alert' | 'confirm' | 'prompt';

export type PopupData = {
  kind: PopupKind;
  message: string;
  defaultValue?: string;
  returnValue?: boolean | string | null;
};

export type PopupRecordOptions = {
  /**
   * Which native popups to hook. Defaults to all three.
   */
  level?: PopupKind[];
  /**
   * Whether to record the user's response for `confirm` / `prompt`.
   * `alert` never has a return value. Defaults to `true`.
   */
  recordReturnValue?: boolean;
  /**
   * Redaction hook applied to the payload immediately before it is emitted.
   */
  maskPopup?: (data: PopupData) => PopupData;
};

type PopupCallback = (data: PopupData) => void;

const ALL_KINDS: PopupKind[] = ['alert', 'confirm', 'prompt'];

function initPopupObserver(
  cb: PopupCallback,
  win: IWindow,
  options: PopupRecordOptions,
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
            // Call through to the real (blocking) popup first so we can
            // capture the user's response for confirm / prompt.
            const returnValue = originalFn.apply(this, args);

            let data: PopupData = {
              kind,
              message: String(args[0] ?? ''),
            };
            if (kind === 'prompt' && args[1] != null) {
              data.defaultValue = String(args[1]);
            }
            if (recordReturnValue && kind !== 'alert') {
              data.returnValue = returnValue as boolean | string | null;
            }
            if (options.maskPopup) {
              data = options.maskPopup(data);
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

export const getRecordPopupPlugin: (
  options?: PopupRecordOptions,
) => RecordPlugin<PopupRecordOptions> = (options) => ({
  name: PLUGIN_NAME,
  observer: initPopupObserver as RecordPlugin['observer'],
  options: options ?? {},
});
