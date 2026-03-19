/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  freezeAnimations,
  getFullPageDimension,
  getFullPageDimensions,
} from '../src/dom-utils';

beforeEach(() => {
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

describe('freezeAnimations', () => {
  it('injects a freeze stylesheet into the document head', () => {
    const unfreeze = freezeAnimations();

    const style = document.querySelector('style[data-amp-freeze]');
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('animation-duration: 0s !important');
    expect(style!.textContent).toContain('transition-duration: 0s !important');

    unfreeze();
  });

  it('returns a cleanup function that removes the stylesheet', () => {
    const unfreeze = freezeAnimations();
    expect(document.querySelector('style[data-amp-freeze]')).not.toBeNull();

    unfreeze();
    expect(document.querySelector('style[data-amp-freeze]')).toBeNull();
  });

  it('calls finish() on animations', () => {
    const finishFn = vi.fn();
    document.getAnimations = () => [
      { finish: finishFn } as unknown as Animation,
    ];

    const unfreeze = freezeAnimations();
    expect(finishFn).toHaveBeenCalled();

    unfreeze();
  });

  it('calls cancel() when finish() throws', () => {
    const cancelFn = vi.fn();
    document.getAnimations = () => [
      {
        finish: () => {
          throw new Error('infinite animation');
        },
        cancel: cancelFn,
      } as unknown as Animation,
    ];

    const unfreeze = freezeAnimations();
    expect(cancelFn).toHaveBeenCalled();

    unfreeze();
  });
});

describe('getFullPageDimensions', () => {
  it('returns an object with pageHeight and pageWidth', () => {
    const dims = getFullPageDimensions();
    expect(typeof dims.pageHeight).toBe('number');
    expect(typeof dims.pageWidth).toBe('number');
  });

  it('excludes the specified element from measurement', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const dims = getFullPageDimensions(el);
    expect(typeof dims.pageHeight).toBe('number');
    expect(typeof dims.pageWidth).toBe('number');
  });

  it('handles null excludeEl gracefully', () => {
    const dims = getFullPageDimensions(null);
    expect(typeof dims.pageHeight).toBe('number');
    expect(typeof dims.pageWidth).toBe('number');
  });
});

describe('getFullPageDimension', () => {
  it('returns height when axis is height', () => {
    const height = getFullPageDimension('height');
    expect(typeof height).toBe('number');
  });

  it('returns width when axis is width', () => {
    const width = getFullPageDimension('width');
    expect(typeof width).toBe('number');
  });

  it('accepts an excludeEl parameter', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const height = getFullPageDimension('height', el);
    expect(typeof height).toBe('number');
  });
});
