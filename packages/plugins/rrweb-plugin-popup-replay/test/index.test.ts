import { describe, expect, it, vi } from 'vitest';
import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { PLUGIN_NAME } from '@rrweb/rrweb-plugin-popup-record';
import type { PopupData } from '@rrweb/rrweb-plugin-popup-record';
import { getReplayPopupPlugin } from '../src';

function pluginEvent(plugin: string, payload: unknown): eventWithTime {
  return {
    type: EventType.Plugin,
    data: { plugin, payload },
    timestamp: 0,
  } as eventWithTime;
}

describe('rrweb-plugin-popup-replay', () => {
  it('forwards a matching popup plugin event to onPopup', () => {
    const onPopup = vi.fn();
    const plugin = getReplayPopupPlugin({ onPopup });
    const payload: PopupData = {
      kind: 'confirm',
      message: 'sure?',
      returnValue: true,
    };

    plugin.handler!(pluginEvent(PLUGIN_NAME, payload), false, {} as never);

    expect(onPopup).toHaveBeenCalledTimes(1);
    expect(onPopup).toHaveBeenCalledWith(payload);
  });

  it('ignores plugin events from other plugins', () => {
    const onPopup = vi.fn();
    const plugin = getReplayPopupPlugin({ onPopup });

    plugin.handler!(
      pluginEvent('rrweb/network@1', { some: 'data' }),
      false,
      {} as never,
    );

    expect(onPopup).not.toHaveBeenCalled();
  });

  it('ignores non-plugin events', () => {
    const onPopup = vi.fn();
    const plugin = getReplayPopupPlugin({ onPopup });

    plugin.handler!(
      { type: EventType.Meta, data: {}, timestamp: 0 } as eventWithTime,
      false,
      {} as never,
    );

    expect(onPopup).not.toHaveBeenCalled();
  });
});
