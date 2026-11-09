# Keydown Recorder

rrweb records typed text as input events, but not the keys themselves. This plugin records the key presses that leave no input event: Enter, Tab, Escape, arrow and function keys, and shortcuts such as Control+A. Together with the input events, they are what a recording needs to be turned into an end-to-end test.

## Enable Keydown Recording

```js
import { record } from '@rrweb/record';
import { getRecordKeydownPlugin } from '@rrweb/rrweb-plugin-keydown-record';

record({
  emit: function emit(event) {
    events.push(event);
  },
  plugins: [getRecordKeydownPlugin()],
});
```

Each key press is emitted as a plugin event:

```js
{
  type: EventType.Plugin,
  data: {
    plugin: 'rrweb/keydown@1',
    payload: {
      id: 42, // node id of the focused element
      key: 'a',
      code: 'KeyA',
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: false,
      repeat: false,
    },
  },
  timestamp: 1700000000000,
}
```

## Options

| key             | default | description                                                                                        |
| --------------- | ------- | -------------------------------------------------------------------------------------------------- |
| recordPrintable | false   | Also record keys that type a character. They are left out of masked fields and of password fields. |

The plugin also takes the recorder's `blockClass`, `blockSelector`, `ignoreClass`, `ignoreSelector`, `maskAllInputs` and `maskInputOptions` [options](../../guide.md#privacy), with the same defaults. If you changed them for `record`, give the plugin the same values: no keys are recorded on elements the recorder blocks or ignores.
Modifier keys pressed on their own and key presses during IME composition are never recorded.
