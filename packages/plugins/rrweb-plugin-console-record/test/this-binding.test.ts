/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { getRecordConsolePlugin } from '../src';
import type { IWindow } from '@rrweb/types';

describe('rrweb-plugin-console-record this-binding', () => {
  it('invokes the original console method with the logger as `this`', () => {
    // Native console implementations in some contexts (observed in Chrome
    // extension content scripts) throw "Illegal invocation" if the method
    // is applied with an incorrect receiver. Simulate that here: if the
    // wrapper ever calls through with the wrong `this`, this logger throws.
    let capturedThis: unknown;
    const fakeLogger = {
      log(...args: unknown[]) {
        capturedThis = this;
      },
    };

    const plugin = getRecordConsolePlugin({
      level: ['log'],
      logger: fakeLogger,
    });

    const stop = plugin.observer(
      () => {
        //
      },
      window as unknown as IWindow,
      plugin.options,
    );

    fakeLogger.log('hello');

    expect(capturedThis).toBe(fakeLogger);
    stop();
  });
});
