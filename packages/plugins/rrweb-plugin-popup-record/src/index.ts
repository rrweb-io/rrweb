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
  popupKinds?: PopupKind[];
  /**
   * Redaction hook applied to the payload immediately before it is emitted.
   * Return a modified copy to redact sensitive content — e.g. mask the
   * `message`, or drop `returnValue` to avoid recording what the user typed
   * into a `prompt` or answered in a `confirm`.
   */
  maskPopupData?: (data: PopupData) => PopupData;
};

type PopupCallback = (data: PopupData) => void;

const ALL_KINDS: PopupKind[] = ['alert', 'confirm', 'prompt'];

function initPopupObserver(
  cb: PopupCallback,
  win: IWindow,
  options: PopupRecordOptions,
): listenerHandler {
  const popupOptions = options || {};
  const kinds = popupOptions.popupKinds ?? ALL_KINDS;
  const handlers: listenerHandler[] = [];

  for (const kind of kinds) {
    handlers.push(
      patch(
        win,
        kind,
        (original) => {
          const originalFn = original as (...args: unknown[]) => unknown;
          return (...args: unknown[]) => {
            // Call through to the real (blocking) popup first so we can
            // capture the user's response for confirm / prompt.
            const returnValue = originalFn.apply(win, args);

            let data: PopupData = {
              kind,
              message: String(args[0] ?? ''),
            };
            if (kind === 'prompt' && args[1] != null) {
              data.defaultValue = String(args[1]);
            }
            if (kind !== 'alert') {
              data.returnValue = returnValue as boolean | string | null;
            }
            if (popupOptions.maskPopupData) {
              data = popupOptions.maskPopupData(data);
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
) => RecordPlugin = (options) => ({
  name: PLUGIN_NAME,
  observer: initPopupObserver as RecordPlugin['observer'],
  options: options,
});
