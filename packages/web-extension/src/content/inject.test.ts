// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { MessageName } from '~/types';

const rrweb = vi.hoisted(() => ({
  /** One stop function per record() call, in call order. */
  stops: [] as ReturnType<typeof vi.fn>[],
}));

vi.mock('rrweb', () => ({
  record: () => {
    const stop = vi.fn();
    rrweb.stops.push(stop);
    return stop;
  },
}));

/** A message from the content script, as the page script receives it. */
const fromContentScript = (data: object) =>
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));

describe('the page script', () => {
  it('records once at most: a newer start replaces the running recording', async () => {
    await import('./inject');
    fromContentScript({ message: MessageName.StartRecord, token: 'a' });
    expect(rrweb.stops).toHaveLength(1);
    expect(rrweb.stops[0]).not.toHaveBeenCalled();
    fromContentScript({ message: MessageName.StartRecord, token: 'b' });
    expect(rrweb.stops).toHaveLength(2);
    expect(rrweb.stops[0]).toHaveBeenCalledOnce();
    expect(rrweb.stops[1]).not.toHaveBeenCalled();
    fromContentScript({ message: MessageName.StopRecord });
    expect(rrweb.stops[1]).toHaveBeenCalledOnce();
  });
});
