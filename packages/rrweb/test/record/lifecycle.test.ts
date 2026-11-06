/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EventType,
  IncrementalSource,
  type eventWithTime,
  type listenerHandler,
} from '@rrweb/types';
import record from '../../src/record';
import { mutationBuffers } from '../../src/record/observer';
import type { recordOptions } from '../../src/types';

// MutationObserver callbacks run as microtasks, the deferred shadow root setup as a task.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function createShadowHost(text = 'shadow content'): HTMLElement {
  const host = document.createElement('x-card');
  const span = document.createElement('span');
  span.textContent = text;
  host.attachShadow({ mode: 'open' }).appendChild(span);
  return host;
}

describe('recorder lifecycle', () => {
  let events: eventWithTime[] = [];
  let stop: listenerHandler | undefined;

  const start = (options: recordOptions<eventWithTime> = {}) => {
    events = [];
    stop = record({ emit: (e) => events.push(e), ...options });
  };

  const mutationEvents = () =>
    events.filter(
      (e) =>
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Mutation,
    );

  afterEach(() => {
    stop?.();
    stop = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('when recording stops', () => {
    it('releases all mutation buffers', () => {
      document.body.appendChild(createShadowHost());
      for (let i = 0; i < 20; i++) {
        start();
        expect(mutationBuffers).toHaveLength(2);
        stop!();
      }
      stop = undefined;

      expect(mutationBuffers).toHaveLength(0);
    });

    it('stops listening for messages from cross-origin iframes', () => {
      const addEventListener = vi.spyOn(window, 'addEventListener');
      const removeEventListener = vi.spyOn(window, 'removeEventListener');

      start({ recordCrossOriginIframes: true });
      const messageListeners = addEventListener.mock.calls.filter(
        ([type]) => type === 'message',
      );
      expect(messageListeners).toHaveLength(1);
      stop!();
      stop = undefined;

      expect(removeEventListener).toHaveBeenCalledWith(
        'message',
        messageListeners[0][1],
      );
    });
  });

  describe('full snapshots', () => {
    it('do not accumulate mutation buffers of shadow roots', () => {
      document.body.appendChild(createShadowHost());
      document.body.appendChild(createShadowHost());
      start();
      expect(mutationBuffers).toHaveLength(3);

      for (let i = 0; i < 10; i++) {
        record.takeFullSnapshot(true);
      }

      expect(mutationBuffers).toHaveLength(3);
    });

    it('keep recording mutations inside shadow roots', async () => {
      const host = createShadowHost();
      document.body.appendChild(host);
      start();
      record.takeFullSnapshot(true);
      await flush();
      events = [];

      host.shadowRoot!.querySelector('span')!.textContent = 'changed';
      await flush();

      expect(mutationEvents()).toHaveLength(1);
    });
  });

  describe('when a shadow host is removed', () => {
    it('releases the mutation buffer of its shadow root', async () => {
      start();
      const host = createShadowHost();
      document.body.appendChild(host);
      await flush();
      expect(mutationBuffers).toHaveLength(2);

      host.remove();
      await flush();

      expect(mutationBuffers).toHaveLength(1);
    });

    it('releases nested shadow roots', async () => {
      start();
      const host = createShadowHost();
      host.shadowRoot!.appendChild(createShadowHost('nested'));
      document.body.appendChild(host);
      await flush();
      expect(mutationBuffers).toHaveLength(3);

      host.remove();
      await flush();

      expect(mutationBuffers).toHaveLength(1);
    });

    it('releases shadow roots of hosts inside a removed subtree', async () => {
      start();
      const container = document.createElement('div');
      container.appendChild(createShadowHost());
      container.appendChild(createShadowHost());
      document.body.appendChild(container);
      await flush();
      expect(mutationBuffers).toHaveLength(3);

      container.remove();
      await flush();

      expect(mutationBuffers).toHaveLength(1);
    });

    it('removes its shadow tree from the mirror', async () => {
      start();
      const host = createShadowHost();
      document.body.appendChild(host);
      await flush();
      const span = host.shadowRoot!.querySelector('span')!;
      const id = record.mirror.getId(span);
      expect(record.mirror.getNode(id)).toBe(span);

      host.remove();
      await flush();

      expect(record.mirror.getNode(id)).toBeNull();
    });

    it('keeps observing a host that was moved', async () => {
      start();
      const host = createShadowHost();
      const other = document.createElement('div');
      document.body.append(host, other);
      await flush();

      other.appendChild(host);
      await flush();
      expect(mutationBuffers).toHaveLength(2);
      events = [];

      host.shadowRoot!.querySelector('span')!.textContent = 'changed';
      await flush();

      expect(mutationEvents()).toHaveLength(1);
    });

    it('observes a host again when it is reinserted', async () => {
      start();
      const host = createShadowHost();
      document.body.appendChild(host);
      await flush();
      host.remove();
      await flush();

      document.body.appendChild(host);
      await flush();
      expect(mutationBuffers).toHaveLength(2);
      events = [];

      host.shadowRoot!.querySelector('span')!.textContent = 'changed';
      await flush();

      expect(mutationEvents()).toHaveLength(1);
    });

    it('unfreezes the buffers registered after the released one', async () => {
      // Shadow roots found by the initial full snapshot are registered before the document's buffer,
      // shadow roots added later after it.
      const initialHost = createShadowHost();
      document.body.appendChild(initialHost);
      start();
      const laterHost = createShadowHost();
      document.body.appendChild(laterHost);
      await flush();

      record.freezePage();
      initialHost.remove();
      await flush();
      // Any event other than a mutation unfreezes all buffers. Unfreezing the document's buffer emits the
      // removal, which releases the buffer of the removed shadow root.
      record.addCustomEvent('unfreeze', {});
      events = [];

      laterHost.shadowRoot!.querySelector('span')!.textContent = 'changed';
      await flush();

      expect(mutationEvents()).toHaveLength(1);
    });
  });

  describe('when a same-origin iframe unloads', () => {
    it('releases the document and shadow buffers inside the removed iframe', async () => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const frameDoc = iframe.contentDocument!;
      const frameHost = frameDoc.createElement('x-card');
      frameHost
        .attachShadow({ mode: 'open' })
        .appendChild(frameDoc.createElement('span'));
      frameDoc.body.appendChild(frameHost);
      start();
      await vi.waitFor(() => expect(mutationBuffers.size).toBe(3));

      iframe.contentWindow!.dispatchEvent(new PageTransitionEvent('pagehide'));
      await flush();

      expect(mutationBuffers.size).toBe(1);
    });
  });

  describe('when a shadow host is removed and re-added during a freeze', () => {
    it('keeps shadow mutations buffered before the removal', async () => {
      const host = createShadowHost();
      document.body.appendChild(host);
      start();
      await flush();
      const span = host.shadowRoot!.querySelector('span')!;

      record.freezePage();
      span.textContent = 'changed-during-freeze';
      await flush();
      host.remove();
      await flush();
      document.body.appendChild(host);
      await flush();

      record.addCustomEvent('unfreeze', {});
      await flush();

      const captured = events.some((e) =>
        JSON.stringify(e).includes('changed-during-freeze'),
      );
      expect(captured).toBe(true);
    });
  });
});
