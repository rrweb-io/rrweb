/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as rrwebSnapshot from '@amplitude/rrweb-snapshot';
import { captureFullSnapshot } from '../src/index';

beforeEach(() => {
  // jsdom doesn't implement document.getAnimations, so polyfill it
  if (!document.getAnimations) {
    document.getAnimations = () => [];
  }
});

afterEach(() => {
  document
    .querySelectorAll('style[data-amp-freeze]')
    .forEach((el) => el.remove());
  document.body.innerHTML = '';
});

describe('captureFullSnapshot', () => {
  it('returns a CaptureResult with all expected fields', () => {
    document.body.innerHTML = '<div id="app"><p>Hello</p></div>';

    const result = captureFullSnapshot();

    expect(result.pageUrl).toBe(window.location.href);
    expect(result.capturedAt).toBeTruthy();
    expect(typeof result.scrollX).toBe('number');
    expect(typeof result.scrollY).toBe('number');
    expect(typeof result.scrollHeight).toBe('number');
    expect(typeof result.scrollWidth).toBe('number');
    expect(typeof result.clientHeight).toBe('number');
    expect(typeof result.clientWidth).toBe('number');
    expect(typeof result.pageHeight).toBe('number');
    expect(typeof result.pageWidth).toBe('number');
    expect(typeof result.innerHeight).toBe('number');
    expect(typeof result.innerWidth).toBe('number');
  });

  it('returns a fullSnapshotEvent with type 2', () => {
    document.body.innerHTML = '<div>content</div>';

    const result = captureFullSnapshot();

    expect(result.fullSnapshotEvent).not.toBeNull();
    expect(result.fullSnapshotEvent!.type).toBe(2);
    expect(result.fullSnapshotEvent!.data.node).toBeTruthy();
    expect(result.fullSnapshotEvent!.data.initialOffset).toEqual({
      left: expect.any(Number),
      top: expect.any(Number),
    });
    expect(typeof result.fullSnapshotEvent!.timestamp).toBe('number');
  });

  it('captures the page title', () => {
    document.title = 'Test Page';
    document.body.innerHTML = '<div>content</div>';

    const result = captureFullSnapshot();

    expect(result.pageTitle).toBe('Test Page');
  });

  it('returns null pageTitle when title is empty', () => {
    document.title = '';
    document.body.innerHTML = '<div>content</div>';

    const result = captureFullSnapshot();

    expect(result.pageTitle).toBeNull();
  });

  it('cleans up the freeze stylesheet after capture', () => {
    document.body.innerHTML = '<div>content</div>';

    captureFullSnapshot();

    const freezeStyle = document.querySelector('style[data-amp-freeze]');
    expect(freezeStyle).toBeNull();
  });

  it('accepts excludeEl option without errors', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    document.body.innerHTML += '<p>Real content</p>';

    const result = captureFullSnapshot({ excludeEl: host });

    expect(result.fullSnapshotEvent).not.toBeNull();
  });

  it('capturedAt is a valid ISO timestamp', () => {
    document.body.innerHTML = '<div>content</div>';

    const result = captureFullSnapshot();

    const parsed = new Date(result.capturedAt);
    expect(parsed.toISOString()).toBe(result.capturedAt);
  });

  it('returns fullSnapshotEvent: null when snapshot() returns null', () => {
    const snapshotSpy = vi
      .spyOn(rrwebSnapshot, 'snapshot')
      .mockReturnValueOnce(null);

    const result = captureFullSnapshot();

    expect(result.fullSnapshotEvent).toBeNull();
    expect(result.pageUrl).toBe(window.location.href);
    expect(result.capturedAt).toBeTruthy();
    expect(typeof result.scrollX).toBe('number');
    expect(typeof result.scrollY).toBe('number');
    expect(typeof result.pageHeight).toBe('number');
    expect(typeof result.pageWidth).toBe('number');

    snapshotSpy.mockRestore();
  });

  it('snapshot data node contains serialized DOM structure', () => {
    document.body.innerHTML = '<div id="test-el">Hello World</div>';

    const result = captureFullSnapshot();
    const node = result.fullSnapshotEvent!.data.node;

    // The root should be a document node with childNodes
    expect(node).toBeTruthy();
    expect('childNodes' in node!).toBe(true);
  });
});
