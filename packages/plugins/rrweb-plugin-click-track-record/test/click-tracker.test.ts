/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createClickTracker,
  getRecordClickTrackPlugin,
  type ClickTrackPayload,
} from '../src/index';

// jsdom doesn't ship PointerEvent — polyfill it
if (typeof PointerEvent === 'undefined') {
  (globalThis as Record<string, unknown>).PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerType: string;
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit & { pointerType?: string } = {}) {
      super(type, init);
      this.pointerType = init.pointerType || '';
      this.pointerId = init.pointerId || 0;
    }
  };
}

function setHTML(html: string) {
  document.body.innerHTML = html;
}

function click(el: Element, opts: { pointerType?: string; clientX?: number; clientY?: number } = {}) {
  // Simulate pointerdown first (for pointer type detection)
  el.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: opts.pointerType || 'mouse',
    }),
  );
  // Then the click
  el.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: opts.clientX ?? 10,
      clientY: opts.clientY ?? 10,
    }),
  );
}

describe('createClickTracker (standalone)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('calls callback with payload on click', () => {
    setHTML('<button id="cta">Buy</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('cta')!);

    expect(payloads).toHaveLength(1);
    expect(payloads[0].targetSelector).toContain('cta');
    expect(payloads[0].pointerType).toBe('mouse');

    stop();
  });

  it('detects touch pointer type', () => {
    setHTML('<a href="/page" id="link">Go</a>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('link')!, { pointerType: 'touch' });

    expect(payloads).toHaveLength(1);
    expect(payloads[0].pointerType).toBe('touch');

    stop();
  });

  it('detects pen pointer type', () => {
    setHTML('<button id="btn">Draw</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('btn')!, { pointerType: 'pen' });

    expect(payloads).toHaveLength(1);
    expect(payloads[0].pointerType).toBe('pen');

    stop();
  });

  it('embodies the link URL in the selector', () => {
    // A weak, enumerated id (word stem + trailing number) is not a strong
    // anchor by semantic-selector's rules, so the href becomes the element's
    // identity and is embedded as a[href="…"] — the plugin no longer records a
    // separate hrefAttr field.
    const weak_id = 'link_1';
    setHTML(`<a href="/products" id="${weak_id}">Products</a>`);
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById(weak_id)!);

    expect(payloads[0].targetSelector).toContain('[href="/products"]');

    stop();
  });

  it('extracts targetText for buttons by default', () => {
    setHTML('<button id="btn">Place Order</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('btn')!);

    expect(payloads[0].targetText).toBe('Place Order');

    stop();
  });

  it('does not extract targetText for divs by default', () => {
    setHTML('<div id="box">Some content</div>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('box')!);

    expect(payloads[0].targetText).toBeUndefined();

    stop();
  });

  it('extracts targetText for all elements when targetText=true', () => {
    setHTML('<div id="box">Some content</div>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      targetText: true,
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('box')!);

    expect(payloads[0].targetText).toBe('Some content');

    stop();
  });

  it('never extracts targetText when targetText=false', () => {
    setHTML('<button id="btn">Click me</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      targetText: false,
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('btn')!);

    expect(payloads[0].targetText).toBeUndefined();

    stop();
  });

  it('truncates targetText to 40 chars', () => {
    const longText = 'A'.repeat(80);
    setHTML(`<button id="btn">${longText}</button>`);
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('btn')!);

    expect(payloads[0].targetText).toHaveLength(40);

    stop();
  });

  it('walks up to the significant clickable ancestor', () => {
    setHTML('<a href="/page" id="link"><span id="inner">Click</span></a>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    // Click the inner span — the significant element is the enclosing <a>, so
    // the top-level selector and text describe the <a>, and the span is recorded
    // as a same-root `inner` hop (no boundary crossed).
    click(document.getElementById('inner')!);

    const p = payloads[0];
    expect(p.targetSelector).toContain('link');
    expect(p.targetText).toBe('Click');
    // The <a> resolves from its own selector.
    const anchor = document.getElementById('link')!;
    expect(document.querySelector(p.targetSelector)).toBe(anchor);
    // The inner hop is a plain descendant (no boundary) locating the span.
    expect(p.innerBoundary).toBeUndefined();
    expect(anchor.querySelector(p.inner!.targetSelector)).toBe(
      document.getElementById('inner'),
    );

    stop();
  });

  it('respects a custom significantSelector', () => {
    setHTML('<div role="button" id="rb"><span id="lbl">Go</span></div>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      significantSelector: '[role="button"]',
      callback: (p) => payloads.push(p),
    });

    // The span isn't clickable, but its [role=button] ancestor now counts as
    // significant, so the click is attributed to the div and the span nests.
    click(document.getElementById('lbl')!);

    const p = payloads[0];
    expect(document.querySelector(p.targetSelector)).toBe(
      document.getElementById('rb'),
    );
    expect(p.inner).toBeDefined();
    expect(
      document
        .getElementById('rb')!
        .querySelector(p.inner!.targetSelector),
    ).toBe(document.getElementById('lbl'));

    stop();
  });

  it('cleanup function stops tracking', () => {
    setHTML('<button id="btn">Click</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('btn')!);
    expect(payloads).toHaveLength(1);

    stop();

    click(document.getElementById('btn')!);
    expect(payloads).toHaveLength(1); // no new payload after stop
  });

  it('includes percentage position, aspect ratio, and viewport width', () => {
    setHTML('<button id="btn">Click</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('btn')!, { clientX: 25, clientY: 15 });

    // jsdom elements have 0x0 bounds, so percentX/percentY are based on fallback 1x1
    expect(typeof payloads[0].percentX).toBe('number');
    expect(typeof payloads[0].percentY).toBe('number');
    expect(payloads[0].aspect).toBe(1); // 1x1 fallback → square
    expect(payloads[0].viewportWidth).toBe(window.innerWidth);
    // x/y viewport coords should not be present
    expect((payloads[0] as Record<string, unknown>).x).toBeUndefined();
    expect((payloads[0] as Record<string, unknown>).y).toBeUndefined();

    stop();
  });
});

describe('getRecordClickTrackPlugin (rrweb integration)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns a valid RecordPlugin', () => {
    const plugin = getRecordClickTrackPlugin();
    expect(plugin.name).toBe('rrweb/click-track@1');
    expect(typeof plugin.observer).toBe('function');
    expect(plugin.options).toEqual({
      targetText: 'button,a',
      shadow: false,
      significantSelector:
        'a[href],area[href],button,input[type="submit"],input[type="button"]',
    });
  });

  it('observer emits payloads via callback', () => {
    setHTML('<button id="btn">Go</button>');
    const plugin = getRecordClickTrackPlugin();
    const payloads: object[] = [];
    const stop = plugin.observer!(
      (p: unknown) => payloads.push(p as object),
      window as unknown as Window & typeof globalThis,
      plugin.options,
    );

    click(document.getElementById('btn')!);

    expect(payloads).toHaveLength(1);
    expect((payloads[0] as ClickTrackPayload).targetSelector).toContain('btn');

    stop();
  });

  it('accepts custom targetText option', () => {
    setHTML('<div id="box">Content</div>');
    const plugin = getRecordClickTrackPlugin({ targetText: true });
    const payloads: ClickTrackPayload[] = [];
    const stop = plugin.observer!(
      (p: unknown) => payloads.push(p as ClickTrackPayload),
      window as unknown as Window & typeof globalThis,
      plugin.options,
    );

    click(document.getElementById('box')!);

    expect(payloads[0].targetText).toBe('Content');

    stop();
  });
});

describe('open shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // A click inside a shadow root only reaches a window-level capture listener
  // when the event is composed; real click events are, but synthetic ones must
  // opt in. pointerdown is dispatched first so pointerType is captured.
  function shadowClick(el: Element) {
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        pointerType: 'mouse',
      }),
    );
    el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
  }

  it('records an inner shadow hop for a click inside an open shadow root', () => {
    const host = document.createElement('div');
    host.id = 'host';
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = '<button id="inner-btn">Go</button>';
    const btn = sr.querySelector('#inner-btn')!;

    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      shadow: true,
      callback: (p) => payloads.push(p),
    });

    shadowClick(btn);

    expect(payloads).toHaveLength(1);
    const p = payloads[0];
    // Top-level node locates the host in the document, with its own position…
    expect(p.targetSelector).toContain('#host');
    expect(typeof p.percentX).toBe('number');
    // …and descends into the host's shadow root to reach the button.
    expect(p.innerBoundary).toBe('shadow');
    expect(p.inner!.targetSelector).toContain('#inner-btn');
    expect(typeof p.inner!.percentX).toBe('number');
    expect(p.inner!.inner).toBeUndefined();

    // Replay resolution round-trips back to the clicked element.
    const outer = document.querySelector(p.targetSelector)!;
    const resolved = outer.shadowRoot!.querySelector(p.inner!.targetSelector);
    expect(resolved).toBe(btn);

    stop();
  });

  it('records one inner hop per boundary for nested shadow roots', () => {
    const host = document.createElement('div');
    host.id = 'outer';
    document.body.appendChild(host);
    const sr1 = host.attachShadow({ mode: 'open' });
    sr1.innerHTML = '<section id="mid"></section>';
    const mid = sr1.querySelector('#mid')!;
    const sr2 = mid.attachShadow({ mode: 'open' });
    sr2.innerHTML = '<button id="deep-btn">Deep</button>';
    const btn = sr2.querySelector('#deep-btn')!;

    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      shadow: true,
      callback: (p) => payloads.push(p),
    });

    shadowClick(btn);

    const p = payloads[0];
    // outermost → innermost, each crossing tagged 'shadow'
    expect(p.targetSelector).toContain('#outer');
    expect(p.innerBoundary).toBe('shadow');
    expect(p.inner!.targetSelector).toContain('#mid');
    expect(p.inner!.innerBoundary).toBe('shadow');
    expect(p.inner!.inner!.targetSelector).toContain('#deep-btn');

    // Full replay chain resolves back to the clicked element.
    const o = document.querySelector(p.targetSelector)!;
    const m = o.shadowRoot!.querySelector(p.inner!.targetSelector)!;
    const resolved = m.shadowRoot!.querySelector(p.inner!.inner!.targetSelector);
    expect(resolved).toBe(btn);

    stop();
  });

  it('has no inner hop for a direct light-DOM click', () => {
    setHTML('<button id="plain">Go</button>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({ callback: (p) => payloads.push(p) });

    click(document.getElementById('plain')!);

    expect(payloads[0].inner).toBeUndefined();
    expect(payloads[0].innerBoundary).toBeUndefined();

    stop();
  });

  it('records the host (no inner) when shadow recording is off', () => {
    const host = document.createElement('div');
    host.id = 'off-host';
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = '<button id="hidden-btn">Go</button>';
    const btn = sr.querySelector('#hidden-btn')!;

    const payloads: ClickTrackPayload[] = [];
    // shadow defaults to false
    const stop = createClickTracker({ callback: (p) => payloads.push(p) });

    shadowClick(btn);

    expect(payloads).toHaveLength(1);
    // event.target is retargeted to the host, so we record the host and never
    // descend into the shadow tree.
    expect(payloads[0].inner).toBeUndefined();
    expect(payloads[0].targetSelector).toContain('off-host');

    stop();
  });
});
