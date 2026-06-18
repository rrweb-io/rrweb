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
    expect(payloads[0].targetTagName).toBe('BUTTON');
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

  it('extracts hrefAttr for links', () => {
    setHTML('<a href="/products" id="link">Products</a>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    click(document.getElementById('link')!);

    expect(payloads[0].hrefAttr).toBe('/products');
    expect((payloads[0] as Record<string, unknown>).href).toBeUndefined();

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

  it('walks up to significant clickable ancestor', () => {
    setHTML('<a href="/page" id="link"><span id="inner">Click</span></a>');
    const payloads: ClickTrackPayload[] = [];
    const stop = createClickTracker({
      callback: (p) => payloads.push(p),
    });

    // Click the inner span — significant element should be the <a>
    click(document.getElementById('inner')!);

    expect(payloads[0].sigTargetTagName).toBe('A');
    expect(payloads[0].hrefAttr).toBe('/page');
    expect(payloads[0].targetText).toBe('Click');
    // targetSelector is for the actual clicked element (span)
    expect(payloads[0].targetTagName).toBe('SPAN');

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

    // jsdom elements have 0x0 bounds, so pctX/pctY are based on fallback 1x1
    expect(typeof payloads[0].pctX).toBe('number');
    expect(typeof payloads[0].pctY).toBe('number');
    expect(payloads[0].aspect).toBe(1); // 1x1 fallback → square
    expect(payloads[0].vpW).toBe(window.innerWidth);
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
    expect(plugin.options).toEqual({ targetText: 'button,a' });
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
