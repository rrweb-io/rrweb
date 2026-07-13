import { describe, expect, it, vi } from 'vitest';
import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { PLUGIN_NAME } from '@rrweb/rrweb-plugin-dialog-record';
import type { DialogData } from '@rrweb/rrweb-plugin-dialog-record';
import { getReplayDialogPlugin } from '../src';

function pluginEvent(plugin: string, payload: unknown): eventWithTime {
  return {
    type: EventType.Plugin,
    data: { plugin, payload },
    timestamp: 0,
  } as eventWithTime;
}

describe('rrweb-plugin-dialog-replay', () => {
  it('forwards a matching dialog plugin event to onDialog', () => {
    const onDialog = vi.fn();
    const plugin = getReplayDialogPlugin({ onDialog });
    const payload: DialogData = {
      kind: 'confirm',
      message: 'sure?',
      returnValue: true,
    };

    plugin.handler!(pluginEvent(PLUGIN_NAME, payload), false, {} as never);

    expect(onDialog).toHaveBeenCalledTimes(1);
    expect(onDialog).toHaveBeenCalledWith(payload);
  });

  it('ignores plugin events from other plugins', () => {
    const onDialog = vi.fn();
    const plugin = getReplayDialogPlugin({ onDialog });

    plugin.handler!(
      pluginEvent('rrweb/network@1', { some: 'data' }),
      false,
      {} as never,
    );

    expect(onDialog).not.toHaveBeenCalled();
  });

  it('ignores non-plugin events', () => {
    const onDialog = vi.fn();
    const plugin = getReplayDialogPlugin({ onDialog });

    plugin.handler!(
      { type: EventType.Meta, data: {}, timestamp: 0 } as eventWithTime,
      false,
      {} as never,
    );

    expect(onDialog).not.toHaveBeenCalled();
  });
});
