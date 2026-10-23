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
import {
  initMutationObserver,
  mutationBuffers,
} from '../../src/record/observer';
import MutationBuffer from '../../src/record/mutation';
import { mutationObserverCtor } from '@rrweb/utils';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function addShadowHost(doc: Document, parent: Node = doc.body): HTMLElement {
  const host = doc.createElement('x-card');
  host.attachShadow({ mode: 'open' }).innerHTML = '<span>shadow content</span>';
  parent.appendChild(host);
  return host;
}

describe('observer cleanup for documents other than the recorder document', () => {
  let stop: listenerHandler | undefined;
  let events: eventWithTime[];

  afterEach(() => {
    stop?.();
    stop = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  async function start(shadowDepth = 0) {
    const mainHost = addShadowHost(document);
    const iframe = document.createElement('iframe');
    const sibling = document.createElement('iframe');
    document.body.append(iframe, sibling);
    const frameWindow = iframe.contentWindow!;
    const frameDoc = iframe.contentDocument!;
    const siblingDoc = sibling.contentDocument!;
    const siblingHost = addShadowHost(siblingDoc);
    const originalAttachShadow = frameDoc.createElement('div').attachShadow;
    const frameHosts: HTMLElement[] = [];
    let parent: Node = frameDoc.body;
    for (let depth = 0; depth < shadowDepth; depth++) {
      const host = addShadowHost(frameDoc, parent);
      frameHosts.push(host);
      parent = host.shadowRoot!;
    }
    events = [];
    stop = record({ emit: (event) => events.push(event) });
    expect(stop).toBeTypeOf('function');
    // Iframe attachment and observer setup are asynchronous after snapshotting.
    await vi.waitFor(() => {
      expect(mutationBuffers.size).toBe(5 + shadowDepth);
    });
    await flush();
    events = [];
    return {
      iframe,
      frameWindow,
      frameDoc,
      siblingDoc,
      mainHost,
      siblingHost,
      frameHosts,
      originalAttachShadow,
    };
  }

  function attributeIds() {
    return events.flatMap((event) =>
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.Mutation
        ? event.data.attributes.map(({ id }) => id)
        : [],
    );
  }

  it('disconnects a plain iframe document without resetting other documents', async () => {
    const { frameWindow, frameDoc, mainHost, siblingHost } = await start();
    const expectedIds = [mainHost, siblingHost].map((host) =>
      record.mirror.getId(host.shadowRoot!.firstElementChild!),
    );
    const documentId = record.mirror.getId(frameDoc);

    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));
    expect(mutationBuffers.size).toBe(4);
    expect(record.mirror.getNode(documentId)).toBeNull();
    frameDoc.body.setAttribute('data-unloaded', 'true');
    for (const host of [mainHost, siblingHost]) {
      host.shadowRoot!.firstElementChild!.setAttribute('data-live', 'true');
    }
    await flush();

    expect(attributeIds().sort()).toEqual(expectedIds.sort());
  });

  it.each([1, 2, 3])(
    'releases all shadow buffers when an iframe with shadow depth %i unloads',
    async (shadowDepth) => {
      const { frameWindow } = await start(shadowDepth);

      frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));
      await flush();

      // Main and sibling documents each retain their document and shadow buffer.
      expect(mutationBuffers.size).toBe(4);
    },
  );

  it('restores the unloaded iframe attachShadow patch without unpatching the parent', async () => {
    const { frameWindow, frameDoc, originalAttachShadow } = await start();
    const parentAttachShadow = Element.prototype.attachShadow;
    expect(frameDoc.createElement('div').attachShadow).not.toBe(
      originalAttachShadow,
    );

    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));

    expect(Element.prototype.attachShadow).toBe(parentAttachShadow);
    expect(frameDoc.createElement('div').attachShadow).toBe(
      originalAttachShadow,
    );
  });

  it('stops shadow scroll listeners belonging to the unloaded document', async () => {
    const { frameWindow, frameHosts } = await start(1);
    const root = frameHosts[0].shadowRoot!;
    const removeListener = vi.spyOn(root, 'removeEventListener');

    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));

    expect(removeListener.mock.calls.some(([type]) => type === 'scroll')).toBe(
      true,
    );
  });

  it('keeps bfcache documents and their shadow observers active', async () => {
    const { frameWindow, frameDoc, frameHosts } = await start(2);
    const documentId = record.mirror.getId(frameDoc);
    const span = frameHosts[1].shadowRoot!.firstElementChild!;
    const spanId = record.mirror.getId(span);

    frameWindow.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    expect(mutationBuffers.size).toBe(7);
    expect(record.mirror.getId(frameDoc)).toBe(documentId);
    span.setAttribute('data-restored', 'true');
    await flush();

    expect(attributeIds()).toEqual([spanId]);
  });

  it('records an adopted shadow host against its new document after its iframe unloads', async () => {
    const { frameWindow, frameHosts } = await start(1);
    const host = frameHosts[0];
    document.body.appendChild(host);
    await flush();
    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));
    events = [];
    const child = document.createElement('strong');
    host.shadowRoot!.appendChild(child);
    await flush();
    const id = record.mirror.getId(child);
    const additions = events.flatMap((event) =>
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.Mutation
        ? event.data.adds
        : [],
    );
    const added = additions.find(({ node }) => node.id === id);
    expect(added).toBeDefined();
    const documentId = record.mirror.getId(document);
    expect(added!.node.rootId ?? documentId).toBe(documentId);
    expect(mutationBuffers.size).toBe(5);
  });

  it('preserves frozen parent and sibling buffers when an iframe unloads', async () => {
    const { frameWindow, mainHost, siblingHost } = await start();
    const expectedIds = [mainHost, siblingHost].map((host) =>
      record.mirror.getId(host.shadowRoot!.firstElementChild!),
    );
    record.freezePage();
    for (const host of [mainHost, siblingHost]) {
      host.shadowRoot!.firstElementChild!.setAttribute('data-frozen', 'true');
    }
    await flush();
    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));

    expect(attributeIds()).toEqual([]);
    expect([...mutationBuffers].every((buffer) => buffer.isFrozen())).toBe(
      true,
    );
    record.addCustomEvent('resume', {});
    await flush();

    expect(attributeIds().sort()).toEqual(expectedIds.sort());
  });

  it('releases all buffers on stop even after a child document has unloaded', async () => {
    const { frameWindow } = await start(2);
    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));

    stop!();
    stop = undefined;

    expect(mutationBuffers.size).toBe(0);
  });

  it('allows the same stop handler to be called twice', async () => {
    await start(1);
    stop!();
    stop!();
    stop = undefined;

    expect(mutationBuffers.size).toBe(0);
  });

  it('releases the buffer when native observer initialization throws', async () => {
    const init = vi.spyOn(MutationBuffer.prototype, 'init');
    await start();
    const options = init.mock.calls[0][0];
    stop!();
    stop = undefined;
    const [Observer, release] = mutationObserverCtor();
    vi.spyOn(Observer.prototype, 'observe').mockImplementation(() => {
      throw new Error('observer setup failed');
    });
    try {
      expect(() => initMutationObserver(options, document)).toThrow(
        'observer setup failed',
      );
      expect(mutationBuffers.size).toBe(0);
    } finally {
      release();
    }
  });

  it('can retry a shadow observer after native setup fails', async () => {
    const init = vi.spyOn(MutationBuffer.prototype, 'init');
    await start();
    const manager = init.mock.calls[0][0].shadowDomManager;
    const root = document
      .createElement('x-retry')
      .attachShadow({ mode: 'open' });
    const [Observer, release] = mutationObserverCtor();
    vi.spyOn(Observer.prototype, 'observe').mockImplementationOnce(() => {
      throw new Error('shadow setup failed');
    });
    const baseline = mutationBuffers.size;
    try {
      expect(() => manager.addShadowRoot(root)).toThrow('shadow setup failed');
      manager.addShadowRoot(root);
      expect(mutationBuffers.size).toBe(baseline + 1);
    } finally {
      release();
    }
  });

  it('finishes document cleanup when one adopted shadow root cannot be rebound', async () => {
    const init = vi.spyOn(MutationBuffer.prototype, 'init');
    const { frameDoc, frameHosts, originalAttachShadow } = await start(2);
    const manager = init.mock.calls[0][0].shadowDomManager;
    document.body.appendChild(frameHosts[0]);
    const [Observer, release] = mutationObserverCtor();
    vi.spyOn(Observer.prototype, 'observe').mockImplementationOnce(() => {
      throw new Error('adoption setup failed');
    });
    const before = init.mock.calls.length;
    try {
      expect(() => manager.removeDocument(frameDoc)).toThrow(
        'adoption setup failed',
      );
      expect(frameDoc.createElement('div').attachShadow).toBe(
        originalAttachShadow,
      );
      expect(
        init.mock.calls.slice(before).map(([options]) => options.doc),
      ).toEqual([document, document]);
    } finally {
      release();
    }
  });

  it('rolls back document observers when a later plugin observer throws', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    const originalAttachShadow = doc.createElement('div').attachShadow;
    addShadowHost(doc);
    let failedSetups = 0;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stop = record({
      emit: () => undefined,
      plugins: [
        {
          name: 'failing-iframe-observer',
          observer: (_callback, win) => {
            if (win.document === doc) {
              failedSetups++;
              throw new Error('plugin setup failed');
            }
            return () => undefined;
          },
        },
      ],
    });
    await vi.waitFor(() => expect(failedSetups).toBeGreaterThan(0));
    expect
      .soft(doc.createElement('div').attachShadow)
      .toBe(originalAttachShadow);
    const baseline = mutationBuffers.size;
    const newHost = doc.createElement('x-after-failure');
    doc.body.appendChild(newHost);
    newHost.attachShadow({ mode: 'open' });
    expect.soft(mutationBuffers.size).toBe(baseline);
    const documentId = record.mirror.getId(doc);
    iframe.contentWindow!.dispatchEvent(new PageTransitionEvent('pagehide'));
    expect(record.mirror.getNode(documentId)).toBeNull();
    stop!();
    stop = undefined;

    expect(mutationBuffers.size).toBe(0);
  });

  it('keeps an adopted shadow buffer frozen when its previous iframe unloads', async () => {
    const { frameWindow, frameHosts } = await start(1);
    record.freezePage();
    const host = frameHosts[0];
    document.body.appendChild(host);
    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));
    expect
      .soft([...mutationBuffers].every((buffer) => buffer.isFrozen()))
      .toBe(true);
    events = [];
    host.shadowRoot!.firstElementChild!.setAttribute('data-frozen', 'true');
    await flush();

    expect(attributeIds()).toEqual([]);
    record.addCustomEvent('resume', {});
    await flush();
    events = [];
    const child = document.createElement('em');
    host.shadowRoot!.appendChild(child);
    await flush();
    const id = record.mirror.getId(child);
    const additions = events.flatMap((event) =>
      event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.Mutation
        ? event.data.adds
        : [],
    );
    const added = additions.find(({ node }) => node.id === id);
    expect(added).toBeDefined();
    const documentId = record.mirror.getId(document);
    expect(added!.node.rootId ?? documentId).toBe(documentId);
  });

  it('cancels pending frame setup when the root recorder fails to initialize', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    stop = record({
      emit: () => undefined,
      plugins: [
        {
          name: 'failing-root-observer',
          observer: (_callback, win) => {
            if (win === window) throw new Error('root setup failed');
            return () => undefined;
          },
        },
      ],
    });
    expect(stop).toBeUndefined();
    await flush();
    await flush();

    expect(mutationBuffers.size).toBe(0);
  });

  it('rolls back shared resources when delayed root setup fails', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const documentAdd = vi.spyOn(document, 'addEventListener');
    const windowAdd = vi.spyOn(window, 'addEventListener');
    const windowRemove = vi.spyOn(window, 'removeEventListener');
    stop = record({
      emit: () => undefined,
      recordAfter: 'DOMContentLoaded',
      recordCrossOriginIframes: true,
      plugins: [
        {
          name: 'failing-delayed-root',
          observer: () => {
            throw new Error('delayed setup failed');
          },
        },
      ],
    });
    const loaded = documentAdd.mock.calls.find(
      ([type]) => type === 'DOMContentLoaded',
    )?.[1];
    const message = windowAdd.mock.calls.find(
      ([type]) => type === 'message',
    )?.[1];
    if (typeof loaded !== 'function')
      throw new Error('Missing startup listener');

    expect(() => loaded.call(document, new Event('DOMContentLoaded'))).toThrow(
      'delayed setup failed',
    );
    expect(windowRemove).toHaveBeenCalledWith('message', message);
    expect(mutationBuffers.size).toBe(0);
  });

  it.each([false, true])(
    'releases pending stylesheet loads in a removed subtree with shadow=%s',
    async (shadow) => {
      await start();
      const container = document.createElement('section');
      document.body.appendChild(container);
      const parent = shadow
        ? container.attachShadow({ mode: 'open' })
        : container;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://rrweb.test/late.css';
      const add = vi.spyOn(link, 'addEventListener');
      const remove = vi.spyOn(link, 'removeEventListener');
      parent.appendChild(link);
      await flush();
      const load = add.mock.calls.find(([type]) => type === 'load');
      expect(load).toBeDefined();

      container.remove();
      await flush();
      const ids = record.mirror.getIds();
      events = [];
      link.dispatchEvent(new Event('load'));
      await flush();

      expect.soft(remove).toHaveBeenCalledWith('load', load![1]);
      expect(record.mirror.getIds()).toEqual(ids);
    },
  );

  it('does not observe shadow roots when DOM recording is disabled', async () => {
    const originalAttachShadow = Element.prototype.attachShadow;
    events = [];
    stop = record({ emit: (event) => events.push(event), recordDOM: false });
    expect.soft(Element.prototype.attachShadow).toBe(originalAttachShadow);
    const host = document.createElement('x-disabled');
    document.body.appendChild(host);
    host.attachShadow({ mode: 'open' }).innerHTML = '<b>unrecorded</b>';
    await flush();
    expect.soft(mutationBuffers.size).toBe(0);
    expect.soft(attributeIds()).toEqual([]);

    stop!();
    stop = undefined;

    expect(Element.prototype.attachShadow).toBe(originalAttachShadow);
  });

  it('does not reset a newer recording when an older stop handler is called again', async () => {
    await start();
    const oldStop = stop!;
    oldStop();
    stop = undefined;
    document.body.innerHTML = '';
    const host = addShadowHost(document);
    events = [];
    stop = record({ emit: (event) => events.push(event) });
    await flush();
    expect(mutationBuffers.size).toBe(2);
    const span = host.shadowRoot!.firstElementChild!;
    const spanId = record.mirror.getId(span);

    // Both observers' o.doc equal the same global document, but the older
    // observer no longer owns the buffers belonging to the new recording.
    oldStop();

    expect.soft(mutationBuffers.size).toBe(2);
    events = [];
    span.setAttribute('data-new-recording', 'true');
    await flush();
    expect(attributeIds()).toEqual([spanId]);
  });

  it('does not accumulate iframe shadow buffers across repeated frame lifetimes', async () => {
    const { iframe, frameWindow } = await start(1);
    frameWindow.dispatchEvent(new PageTransitionEvent('pagehide'));
    iframe.remove();
    await flush();

    for (let cycle = 0; cycle < 3; cycle++) {
      const nextFrame = document.createElement('iframe');
      document.body.appendChild(nextFrame);
      const doc = nextFrame.contentDocument!;
      await vi.waitFor(() => {
        expect(record.mirror.getId(doc)).toBeGreaterThan(0);
      });
      const baseline = mutationBuffers.size;
      addShadowHost(doc);
      await vi.waitFor(() => expect(mutationBuffers.size).toBe(baseline + 1));
      await flush();
      nextFrame.contentWindow!.dispatchEvent(
        new PageTransitionEvent('pagehide'),
      );
      nextFrame.remove();
      await flush();
    }

    expect(mutationBuffers.size).toBe(4);
  });
});
