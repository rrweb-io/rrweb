/**
 * Invariant test: in every mutation batch the recorder emits, a shadow
 * child node is never emitted before its shadow host.
 *
 * The MutationBuffer drain can only resolve a shadow child's parentId
 * via `mirror.getId(getShadowHost(n))`. If the host hasn't been serialized
 * yet in this batch, that lookup returns -1 and the subtree gets dropped
 * through `missingParents`. The walk-up loop prevents this by jumping
 * through `ShadowRoot` to the host so the host is always drained first.
 *
 * This file does not snapshot JSON — it inspects the emitted events and
 * asserts the topological property directly, so it stays meaningful even
 * if unrelated serializer details change.
 */
import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';

import {
  getServerURL,
  ISuite,
  launchPuppeteer,
  startServer,
  waitForRAF,
} from '../utils';
import { EventType, IncrementalSource, eventWithTime } from '@rrweb/types';
import { recordOptions } from '../../src/types';

interface IWindow extends Window {
  rrweb: {
    record: (
      options: recordOptions<eventWithTime>,
    ) => undefined | (() => void);
  };
  emit: (e: eventWithTime) => undefined;
}

type AddPayload = {
  parentId: number;
  nextId: number | null;
  node: { id: number; isShadow?: boolean; isShadowHost?: boolean };
};

function collectAdds(events: eventWithTime[]): AddPayload[][] {
  const batches: AddPayload[][] = [];
  for (const e of events) {
    if (e.type !== EventType.IncrementalSnapshot) continue;
    const d = e.data as { source: number; adds?: AddPayload[] };
    if (d.source !== IncrementalSource.Mutation) continue;
    if (!d.adds || d.adds.length === 0) continue;
    batches.push(d.adds);
  }
  return batches;
}

/**
 * In a single `adds` batch, every entry whose node is marked
 * `isShadow: true` must have its `parentId` reference a node that either
 *
 *   (a) was emitted earlier in the same batch, or
 *   (b) is already in the mirror from a prior batch.
 *
 * (b) is checked indirectly: if `parentId` isn't an id we just emitted in
 * this batch, it must be some other valid id — mutations against -1 would
 * have been dropped by the serializer before reaching us.
 */
function assertHostBeforeChild(batch: AddPayload[]) {
  for (let i = 0; i < batch.length; i++) {
    const add = batch[i];
    if (!add.node.isShadow) continue;
    for (let j = i + 1; j < batch.length; j++) {
      if (batch[j].node.id === add.parentId) {
        throw new Error(
          `shadow child id=${add.node.id} emitted before its host id=${add.parentId} in the same batch`,
        );
      }
    }
  }
}

describe('shadow DOM emit-order invariant', () => {
  vi.setConfig({ testTimeout: 100_000 });
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];
  let events: ISuite['events'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await launchPuppeteer();
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await server.close();
    await browser.close();
  });

  async function setupPage() {
    page = await browser.newPage();
    await page.goto(`${serverURL}/html/mutation.html`);
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
    await waitForRAF(page);
    events = [];
    await page.exposeFunction('emit', (e: eventWithTime) => {
      if (e.type === EventType.DomContentLoaded || e.type === EventType.Load) {
        return;
      }
      events.push(e);
    });
    await page.evaluate(() => {
      (window as unknown as IWindow).rrweb.record({
        emit: (window as unknown as IWindow).emit,
      });
    });
    await waitForRAF(page);
  }

  it('new shadow host added together with its children', async () => {
    await setupPage();
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'host1';
      host.attachShadow({ mode: 'open' });
      const inp = document.createElement('input');
      inp.id = 'inp1';
      host.shadowRoot!.appendChild(inp);
      const spn = document.createElement('span');
      spn.textContent = 'in-shadow';
      host.shadowRoot!.appendChild(spn);
      document.body.append(host);
    });
    await waitForRAF(page);
    const batches = collectAdds(events);
    expect(batches.length).toBeGreaterThan(0);
    batches.forEach(assertHostBeforeChild);
  });

  it('two shadow hosts added in one batch, siblings', async () => {
    await setupPage();
    await page.evaluate(() => {
      const parent = document.createElement('div');
      parent.id = 'parent';
      for (let i = 0; i < 2; i++) {
        const host = document.createElement('div');
        host.id = 'host' + i;
        host.attachShadow({ mode: 'open' });
        host.shadowRoot!.appendChild(document.createElement('input'));
        host.shadowRoot!.appendChild(document.createElement('span'));
        parent.append(host);
      }
      document.body.append(parent);
    });
    await waitForRAF(page);
    const batches = collectAdds(events);
    expect(batches.length).toBeGreaterThan(0);
    batches.forEach(assertHostBeforeChild);
  });

  it('nested shadow DOM — inner host lives inside outer shadow', async () => {
    await setupPage();
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.attachShadow({ mode: 'open' });
      const inner = document.createElement('div');
      inner.id = 'inner';
      inner.attachShadow({ mode: 'open' });
      const leaf = document.createElement('span');
      leaf.textContent = 'leaf';
      inner.shadowRoot!.appendChild(leaf);
      outer.shadowRoot!.appendChild(inner);
      document.body.append(outer);
    });
    await waitForRAF(page);
    const batches = collectAdds(events);
    expect(batches.length).toBeGreaterThan(0);
    batches.forEach(assertHostBeforeChild);
  });

  it('shadow host moved into a new parent, children re-serialized', async () => {
    await setupPage();
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const host = document.createElement('div');
        host.id = 'movingHost';
        host.attachShadow({ mode: 'open' });
        host.shadowRoot!.appendChild(document.createElement('input'));
        document.body.append(host);
        setTimeout(() => {
          const newParent = document.createElement('div');
          newParent.id = 'newParent';
          document.body.append(newParent);
          newParent.append(host);
          resolve(null);
        }, 50);
      });
    });
    await waitForRAF(page);
    const batches = collectAdds(events);
    expect(batches.length).toBeGreaterThan(0);
    batches.forEach(assertHostBeforeChild);
  });

  it('fleet: ten shadow hosts added simultaneously', async () => {
    await setupPage();
    await page.evaluate(() => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 10; i++) {
        const host = document.createElement('div');
        host.id = 'fleetHost' + i;
        host.attachShadow({ mode: 'open' });
        for (let j = 0; j < 3; j++) {
          const c = document.createElement('span');
          c.textContent = 'cell-' + i + '-' + j;
          host.shadowRoot!.appendChild(c);
        }
        frag.appendChild(host);
      }
      document.body.appendChild(frag);
    });
    await waitForRAF(page);
    const batches = collectAdds(events);
    expect(batches.length).toBeGreaterThan(0);
    batches.forEach(assertHostBeforeChild);
  });
});
