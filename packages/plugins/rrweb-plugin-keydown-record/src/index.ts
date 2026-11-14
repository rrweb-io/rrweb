import type { IMirror, RecordPlugin } from '@rrweb/types';
import type { recordOptions } from 'rrweb';

export type KeydownRecordOptions = {
  /**
   * Also record keys that type a character. That text already reaches the
   * recording through input events; here it is left out of masked fields, and
   * always of password fields.
   */
  recordPrintable: boolean;
} & Pick<
  // the recorder's options of the same name: give the plugin the same values
  recordOptions<unknown>,
  | 'blockClass'
  | 'blockSelector'
  | 'ignoreClass'
  | 'ignoreSelector'
  | 'maskAllInputs'
  | 'maskInputOptions'
>;

export type KeydownPayload = {
  // -1 when the target is not in the mirror
  id: number;
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
};

export const PLUGIN_NAME = 'rrweb/keydown@1';

const defaultOptions: KeydownRecordOptions = {
  recordPrintable: false,
};

type KeyKind = 'modifier' | 'text' | 'command';

const MODIFIER_KEYS = ['Control', 'Alt', 'AltGraph', 'Shift', 'Meta'];
const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

function getKeyKind(event: KeyboardEvent): KeyKind {
  if (MODIFIER_KEYS.includes(event.key)) return 'modifier';
  if (event.key.length !== 1) return 'command';
  // AltGr, and Option on macOS, compose characters; Alt alone is not a shortcut
  const shortcut =
    (event.ctrlKey || event.metaKey) && !event.getModifierState('AltGraph');
  return shortcut ? 'command' : 'text';
}

function getEventTarget(event: Event): Element | null {
  // events from a shadow root reach the document retargeted to its host
  const target = (event.composedPath()[0] || event.target) as Node | null;
  // not instanceof: the target may belong to an iframe's realm
  return target && target.nodeType === 1 ? (target as Element) : null;
}

// rrweb sets data-rr-is-password when a password input's type is changed
function getInputType(target: Element): string {
  return target.hasAttribute('data-rr-is-password')
    ? 'password'
    : String((target as HTMLInputElement).type || '').toLowerCase();
}

function hasClass(el: Element, name: string | RegExp): boolean {
  return typeof name === 'string'
    ? el.classList.contains(name)
    : Array.from(el.classList).some((className) => name.test(className));
}

export const getRecordKeydownPlugin: (
  options?: Partial<KeydownRecordOptions>,
) => RecordPlugin<KeydownRecordOptions> = (options) => {
  const _options = Object.assign({}, defaultOptions, options);
  let mirror: IMirror<Node> | undefined;

  return {
    name: PLUGIN_NAME,
    options: _options,
    getMirror(mirrors) {
      mirror = mirrors.nodeMirror;
    },
    observer(
      cb,
      win,
      {
        recordPrintable,
        blockClass = 'rr-block',
        blockSelector,
        ignoreClass = 'rr-ignore',
        ignoreSelector,
        maskAllInputs,
        maskInputOptions = { password: true },
      },
    ) {
      // the recorder's input observer skips the same elements
      const isIgnored = (target: Element): boolean => {
        for (let el: Element | null = target; el; el = el.parentElement) {
          if (
            hasClass(el, blockClass) ||
            (blockSelector && el.matches(blockSelector))
          )
            return true;
        }
        return (
          hasClass(target, ignoreClass) ||
          Boolean(ignoreSelector && target.matches(ignoreSelector))
        );
      };
      const isMasked = (target: Element): boolean => {
        const type = getInputType(target);
        if (type === 'password') return true;
        if (maskAllInputs) return INPUT_TAGS.includes(target.tagName);
        const masked = maskInputOptions as Record<string, boolean | undefined>;
        return Boolean(masked[target.tagName.toLowerCase()] || masked[type]);
      };
      const shouldRecord = (kind: KeyKind, target: Element | null): boolean => {
        if (target && isIgnored(target)) return false;
        switch (kind) {
          case 'modifier':
            return false;
          case 'command':
            return true;
          case 'text':
            return recordPrintable && !(target && isMasked(target));
        }
      };
      const onKeydown = (event: KeyboardEvent) => {
        if (event.isComposing) return;
        const target = getEventTarget(event);
        if (!shouldRecord(getKeyKind(event), target)) return;
        const payload: KeydownPayload = {
          id: target && mirror ? mirror.getId(target) : -1,
          key: event.key,
          code: event.code,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          repeat: event.repeat,
        };
        cb(payload);
      };
      const listenerOptions = { capture: true, passive: true };
      win.document.addEventListener('keydown', onKeydown, listenerOptions);
      return () => {
        win.document.removeEventListener('keydown', onKeydown, listenerOptions);
      };
    },
  };
};
