import { describe, expect, it, vi } from 'vitest';
import { getRecordPopupPlugin, PLUGIN_NAME } from '../src';
import type { PopupData } from '../src';

type MockWindow = {
  alert: (message?: unknown) => void;
  confirm: (message?: unknown) => boolean;
  prompt: (message?: unknown, defaultValue?: unknown) => string | null;
};

function createMockWindow(overrides: Partial<MockWindow> = {}): MockWindow {
  return {
    alert: () => undefined,
    confirm: () => true,
    prompt: () => null,
    ...overrides,
  };
}

function run(
  win: MockWindow,
  options: Parameters<typeof getRecordPopupPlugin>[0] = undefined,
) {
  const events: PopupData[] = [];
  const plugin = getRecordPopupPlugin(options);
  const cleanup = plugin.observer!(
    (data: PopupData) => events.push(data),
    win as never,
    plugin.options,
  );
  return { events, cleanup };
}

describe('rrweb-plugin-popup-record', () => {
  it('exposes the expected plugin name', () => {
    expect(PLUGIN_NAME).toBe('rrweb/popup@1');
    expect(getRecordPopupPlugin().name).toBe('rrweb/popup@1');
  });

  it('records an alert with its message and no returnValue', () => {
    const win = createMockWindow();
    const { events, cleanup } = run(win);

    win.alert('hello');
    cleanup();

    expect(events).toEqual([{ kind: 'alert', message: 'hello' }]);
  });

  it('records a confirm with its boolean returnValue', () => {
    const win = createMockWindow({ confirm: () => false });
    const { events, cleanup } = run(win);

    const result = win.confirm('are you sure?');
    cleanup();

    expect(result).toBe(false);
    expect(events).toEqual([
      { kind: 'confirm', message: 'are you sure?', returnValue: false },
    ]);
  });

  it('records a prompt with its default value and typed returnValue', () => {
    const win = createMockWindow({ prompt: () => 'Neo' });
    const { events, cleanup } = run(win);

    const result = win.prompt('your name?', 'anon');
    cleanup();

    expect(result).toBe('Neo');
    expect(events).toEqual([
      {
        kind: 'prompt',
        message: 'your name?',
        defaultValue: 'anon',
        returnValue: 'Neo',
      },
    ]);
  });

  it('records a null returnValue when the user cancels a prompt', () => {
    const win = createMockWindow({ prompt: () => null });
    const { events, cleanup } = run(win);

    win.prompt('your name?');
    cleanup();

    expect(events).toEqual([
      { kind: 'prompt', message: 'your name?', returnValue: null },
    ]);
  });

  it('omits returnValue when recordReturnValue is false', () => {
    const win = createMockWindow({ confirm: () => true, prompt: () => 'x' });
    const { events, cleanup } = run(win, { recordReturnValue: false });

    win.confirm('ok?');
    win.prompt('name?');
    cleanup();

    expect(events).toEqual([
      { kind: 'confirm', message: 'ok?' },
      { kind: 'prompt', message: 'name?' },
    ]);
  });

  it('applies maskPopup before emitting', () => {
    const win = createMockWindow({ prompt: () => 'secret' });
    const { events, cleanup } = run(win, {
      maskPopup: (data) => ({ ...data, message: '***', returnValue: '***' }),
    });

    win.prompt('ssn?', '000');
    cleanup();

    expect(events).toEqual([
      {
        kind: 'prompt',
        message: '***',
        defaultValue: '000',
        returnValue: '***',
      },
    ]);
  });

  it('only patches the kinds listed in the level option', () => {
    const win = createMockWindow({ confirm: () => true });
    const { events, cleanup } = run(win, { level: ['confirm'] });

    win.alert('ignored');
    win.confirm('kept');
    win.prompt('ignored');
    cleanup();

    expect(events).toEqual([
      { kind: 'confirm', message: 'kept', returnValue: true },
    ]);
  });

  it('restores the original popup functions on teardown', () => {
    const originalAlert = vi.fn();
    const win = createMockWindow({ alert: originalAlert });
    const { cleanup } = run(win);

    expect(win.alert).not.toBe(originalAlert);
    cleanup();
    expect(win.alert).toBe(originalAlert);
  });

  it('coerces a non-string message to a string', () => {
    const win = createMockWindow();
    const { events, cleanup } = run(win);

    win.alert(42);
    cleanup();

    expect(events).toEqual([{ kind: 'alert', message: '42' }]);
  });
});
