/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Mirror, snapshot } from 'rrweb-snapshot';
import MutationBuffer from '../../src/record/mutation';
import type { MutationBufferParam } from '../../src/types';

function createBuffer(
  doc: Document,
  mirror: Mirror,
  mutationCb: (p: unknown) => void = () => undefined,
): MutationBuffer {
  const buffer = new MutationBuffer();
  const noopManager = {
    addShadowRoot: vi.fn(),
    removeShadowRootsIn: vi.fn(),
    reset: vi.fn(),
  };
  buffer.init({
    mutationCb: mutationCb as never,
    blockClass: 'rr-block',
    blockSelector: null,
    unblockSelector: null,
    maskAllText: false,
    maskTextClass: 'rr-mask',
    unmaskTextClass: null,
    maskTextSelector: null,
    unmaskTextSelector: null,
    inlineStylesheet: true,
    maskInputOptions: {},
    maskAttributeFn: undefined,
    maskTextFn: undefined,
    maskInputFn: undefined,
    keepIframeSrcFn: () => false,
    recordCanvas: false,
    inlineImages: false,
    slimDOMOptions: {},
    dataURLOptions: {},
    doc,
    mirror,
    iframeManager: {
      addIframe: vi.fn(),
      attachIframe: vi.fn(),
    },
    stylesheetManager: {
      trackLinkElement: vi.fn(),
      attachLinkElement: vi.fn(),
    },
    shadowDomManager: noopManager,
    canvasManager: {
      addWindow: vi.fn(),
      freeze: vi.fn(),
      unfreeze: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      reset: vi.fn(),
      addShadowRoot: vi.fn(),
      resetShadowRoots: vi.fn(),
    },
    processedNodeManager: {
      inOtherBuffer: () => false,
      add: () => undefined,
    },
    ignoreCSSAttributes: new Set<string>(),
  } as unknown as MutationBufferParam);
  return buffer;
}

function childListMutation(
  target: Node,
  added: Node[] = [],
  removed: Node[] = [],
): MutationRecord {
  return {
    type: 'childList',
    target,
    addedNodes: added as unknown as NodeList,
    removedNodes: removed as unknown as NodeList,
    previousSibling: null,
    nextSibling: null,
    attributeName: null,
    attributeNamespace: null,
    oldValue: null,
  } as unknown as MutationRecord;
}

/** Stencil-like dropdown: host + light-DOM slotted header + shadow tree w/ named slot. */
function createDropdown(doc: Document): {
  host: HTMLElement;
  header: HTMLElement;
  slot: HTMLSlotElement;
} {
  const host = doc.createElement('test-dropdown');
  const header = doc.createElement('span');
  header.setAttribute('slot', 'dropdown-head');
  header.textContent = 'Dropdown header';
  host.appendChild(header);
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const slot = doc.createElement('slot');
  slot.setAttribute('name', 'dropdown-head');
  shadowRoot.appendChild(slot);
  return { host, header, slot };
}

describe('MutationBuffer shadow DOM mirror cleanup (regression)', () => {
  let doc: Document;
  let mirror: Mirror;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '';
    mirror = new Mirror();
    snapshot(doc, { mirror });
  });

  it('Test A: removes host with open shadow root from the mirror', () => {
    const buffer = createBuffer(doc, mirror);
    const { host, header, slot } = createDropdown(doc);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);

    const hostId = mirror.getId(host);
    const headerId = mirror.getId(header);
    const slotId = mirror.getId(slot);
    expect(hostId).toBeGreaterThan(0);
    expect(headerId).toBeGreaterThan(0);
    expect(slotId).toBeGreaterThan(0);

    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);

    expect(mirror.getNode(hostId)).toBeNull();
    expect(mirror.getNode(headerId)).toBeNull();
    expect(mirror.getNode(slotId)).toBeNull();
  });

  it('Test B: named slot does not remain tracked after host removal', () => {
    const buffer = createBuffer(doc, mirror);
    const { host, slot } = createDropdown(doc);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);
    const slotId = mirror.getId(slot);
    expect(slotId).toBeGreaterThan(0);

    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);

    expect(mirror.has(slotId)).toBe(false);
  });

  it('Test C: nested shadow roots are released recursively', () => {
    const buffer = createBuffer(doc, mirror);
    const { host } = createDropdown(doc);
    const nestedHost = doc.createElement('inner-box');
    const nestedShadow = nestedHost.attachShadow({ mode: 'open' });
    const nestedChild = doc.createElement('b');
    nestedChild.textContent = 'nested';
    nestedShadow.appendChild(nestedChild);
    host.shadowRoot!.appendChild(nestedHost);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);

    const nestedHostId = mirror.getId(nestedHost);
    const nestedChildId = mirror.getId(nestedChild);
    expect(nestedHostId).toBeGreaterThan(0);
    expect(nestedChildId).toBeGreaterThan(0);

    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);

    expect(mirror.getNode(nestedHostId)).toBeNull();
    expect(mirror.getNode(nestedChildId)).toBeNull();
  });

  it('Test D: repeated create/remove cycles do not grow the mirror', () => {
    const buffer = createBuffer(doc, mirror);
    const baseline = mirror.getIds().length;
    for (let i = 0; i < 20; i++) {
      const { host } = createDropdown(doc);
      doc.body.appendChild(host);
      buffer.processMutations([childListMutation(doc.body, [host])]);
      host.remove();
      buffer.processMutations([childListMutation(doc.body, [], [host])]);
    }
    expect(mirror.getIds().length).toBe(baseline);
  });

  it('Test E: moving a host preserves its mirror entry', () => {
    const buffer = createBuffer(doc, mirror);
    const { host, slot } = createDropdown(doc);
    const other = doc.createElement('div');
    doc.body.appendChild(other);
    doc.body.appendChild(host);
    buffer.processMutations([
      childListMutation(doc.body, [other]),
      childListMutation(doc.body, [host]),
    ]);
    const hostId = mirror.getId(host);
    const slotId = mirror.getId(slot);

    // move host under `other`
    other.appendChild(host);
    buffer.processMutations([
      childListMutation(doc.body, [], [host]),
      childListMutation(other, [host]),
    ]);

    expect(mirror.getId(host)).toBe(hostId);
    expect(mirror.getNode(hostId)).toBe(host);
    expect(mirror.getNode(slotId)).toBe(slot);
  });

  it('Test F: removals queued while frozen are released after unfreeze', () => {
    const buffer = createBuffer(doc, mirror);
    const { host, slot } = createDropdown(doc);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);
    const hostId = mirror.getId(host);
    const slotId = mirror.getId(slot);

    buffer.freeze();
    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);
    // frozen: mirror still holds the detached subtree (pending)
    expect(mirror.getNode(hostId)).toBe(host);

    buffer.unfreeze();
    expect(mirror.getNode(hostId)).toBeNull();
    expect(mirror.getNode(slotId)).toBeNull();
  });
});
