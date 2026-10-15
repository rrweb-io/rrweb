/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest';
import record from '../../src/record';
import MutationBuffer from '../../src/record/mutation';
import {
  initMutationObserver,
  mutationBuffers,
} from '../../src/record/observer';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  if (document.readyState === 'loading') {
    await new Promise((resolve) =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true }),
    );
  }
  document.body.innerHTML = '';
  expect(mutationBuffers).toHaveLength(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('unregisters only the stopped observer, even with interleaved repeated cleanup', async () => {
  const init = vi.spyOn(MutationBuffer.prototype, 'init');
  const stopRecording = record({ emit: () => undefined });
  const options = init.mock.calls[0][0];
  stopRecording?.();
  expect(mutationBuffers).toHaveLength(0);

  const firstRoot = document.createElement('div');
  const secondRoot = document.createElement('div');
  const thirdRoot = document.createElement('div');
  document.body.append(firstRoot, secondRoot, thirdRoot);
  const first = initMutationObserver(options, firstRoot);
  const second = initMutationObserver(options, secondRoot);
  const third = initMutationObserver(options, thirdRoot);
  const remaining = mutationBuffers[2];
  const mutationCb = vi.fn();
  const fourth = initMutationObserver(
    { ...options, mutationCb },
    document.body,
  );
  try {
    second.stop();
    first.stop();
    second.stop();
    expect(mutationBuffers).toHaveLength(2);
    expect(mutationBuffers[0]).toBe(remaining);
    document.body.append(document.createElement('p'));
    await tick();
    expect(mutationCb).toHaveBeenCalled();
  } finally {
    first.stop();
    second.stop();
    third.stop();
    fourth.stop();
    fourth.cleanupIframe();
  }
  expect(mutationBuffers).toHaveLength(0);
});

it('releases document and shadow buffers on stop and replaces them on checkout', async () => {
  const host = document.createElement('x-host');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<span>shadow</span>';
  document.body.append(host);
  const stop = record({ emit: () => undefined });
  try {
    expect(mutationBuffers).toHaveLength(2);
    for (let i = 0; i < 5; i++) {
      record.takeFullSnapshot();
      expect(mutationBuffers).toHaveLength(2);
    }
  } finally {
    stop?.();
  }
  expect(mutationBuffers).toHaveLength(0);
  await tick();
  expect(mutationBuffers).toHaveLength(0);
});

it('cancels deferred shadow stylesheet instrumentation when stopped immediately', async () => {
  const host = document.createElement('x-host');
  const root = host.attachShadow({ mode: 'open' });
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(
    ShadowRoot.prototype,
    'adoptedStyleSheets',
  );
  Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
    configurable: true,
    get: () => [],
    set: () => undefined,
  });
  document.body.append(host);
  const original = Object.getOwnPropertyDescriptor(root, 'adoptedStyleSheets');
  let stop: ReturnType<typeof record>;
  try {
    stop = record({ emit: () => undefined });
    stop?.();
    await tick();
    expect(Object.getOwnPropertyDescriptor(root, 'adoptedStyleSheets')).toEqual(
      original,
    );
    expect(mutationBuffers).toHaveLength(0);
  } finally {
    stop?.();
    if (prototypeDescriptor) {
      Object.defineProperty(
        ShadowRoot.prototype,
        'adoptedStyleSheets',
        prototypeDescriptor,
      );
    } else {
      Reflect.deleteProperty(ShadowRoot.prototype, 'adoptedStyleSheets');
    }
  }
});
